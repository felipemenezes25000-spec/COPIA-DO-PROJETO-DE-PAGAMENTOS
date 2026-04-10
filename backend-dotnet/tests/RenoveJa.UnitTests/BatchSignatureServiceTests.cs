using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.DTOs.Requests;
using RenoveJa.Application.Interfaces;
using RenoveJa.Application.Services;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Interfaces;
using Xunit;

namespace RenoveJa.UnitTests;

public class BatchSignatureServiceTests
{
    private readonly Mock<IRequestRepository> _requestRepo = new();
    private readonly Mock<IMedicalDocumentRepository> _documentRepo = new();
    private readonly Mock<IDocumentAccessLogRepository> _accessLogRepo = new();
    private readonly Mock<IDigitalCertificateService> _certService = new();
    private readonly Mock<IPushNotificationDispatcher> _pushDispatcher = new();
    private readonly Mock<IAuditService> _auditService = new();
    private readonly Mock<ISignatureService> _signatureService = new();
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IDoctorRepository> _doctorRepo = new();
    private readonly Mock<IRequestEventsPublisher> _eventsPublisher = new();
    private readonly ILogger<BatchSignatureService> _logger = NullLogger<BatchSignatureService>.Instance;

    private BatchSignatureService CreateSut(BatchSignatureOptions? options = null)
    {
        // Setup default: DoctorProfile + CertificateInfo sem CRM/CPF (skip pinning).
        // Testes que querem validar cenários de pinning devem sobrescrever.
        _doctorRepo
            .Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Guid userId, CancellationToken _) => DoctorProfile.Create(
                userId, "123456", "SP", "Clínico Geral"));

        _certService
            .Setup(s => s.GetActiveCertificateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CertificateInfo(
                Id: Guid.NewGuid(),
                SubjectName: "CN=Test",
                IssuerName: "CN=Test CA",
                NotBefore: DateTime.UtcNow.AddDays(-30),
                NotAfter: DateTime.UtcNow.AddYears(1),
                IsValid: true,
                IsExpired: false,
                DaysUntilExpiry: 365,
                CrmNumber: null,
                Cpf: null));

        return new BatchSignatureService(
            _requestRepo.Object,
            _documentRepo.Object,
            _accessLogRepo.Object,
            _certService.Object,
            _pushDispatcher.Object,
            _auditService.Object,
            _signatureService.Object,
            _userRepo.Object,
            _doctorRepo.Object,
            _eventsPublisher.Object,
            Options.Create(options ?? new BatchSignatureOptions { MaxItemsPerBatch = 50 }),
            _logger);
    }

    private static DocumentAccessEntry ApprovedLog(Guid doctorId, Guid requestId) =>
        DocumentAccessEntry.Create(
            documentId: null,
            requestId: requestId,
            userId: doctorId,
            action: "approved_for_signing",
            actorType: "doctor");

    /// <summary>
    /// Cria um MedicalRequest via snapshot para mockar o repositório.
    /// Por padrão monta um pedido válido para assinatura (Paid, sem AI rejection,
    /// DoctorId correto). Os parâmetros permitem simular os estados bloqueados
    /// pelas guards do BatchSignatureService (Status != Paid, AiRejectionReason
    /// preenchido, DoctorId diferente).
    /// </summary>
    private static MedicalRequest FakeRequest(
        Guid id,
        Guid doctorId,
        string status = "paid",
        string? aiRejectionReason = null)
    {
        var snapshot = new MedicalRequestSnapshot
        {
            Id = id,
            PatientId = Guid.NewGuid(),
            PatientName = "Paciente Teste",
            DoctorId = doctorId,
            DoctorName = "Doutor Teste",
            RequestType = "prescription",
            Status = status,
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            UpdatedAt = DateTime.UtcNow,
            AiRejectionReason = aiRejectionReason,
        };
        return MedicalRequest.Reconstitute(snapshot);
    }

    /// <summary>
    /// Configura o mock de requestRepository.GetByIdAsync para retornar um
    /// MedicalRequest válido (Paid, sem AI rejection, ownership correto) para
    /// cada ID fornecido. Deve ser chamado junto com SetupApprovedFor no
    /// setup dos testes que esperam chegar até SignAsync.
    /// </summary>
    private void SetupValidRequests(Guid doctorId, params Guid[] requestIds)
    {
        foreach (var id in requestIds)
        {
            var capturedId = id;
            _requestRepo
                .Setup(r => r.GetByIdAsync(capturedId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(FakeRequest(capturedId, doctorId));
        }
    }

    private static RequestResponseDto FakeResponseDto(Guid id) => new(
        Id: id,
        PatientId: Guid.NewGuid(),
        PatientName: "Paciente",
        DoctorId: Guid.NewGuid(),
        DoctorName: "Doutor",
        RequestType: "prescription",
        Status: "signed",
        PrescriptionType: null,
        PrescriptionKind: null,
        Medications: null,
        PrescriptionImages: null,
        ExamType: null,
        Exams: null,
        ExamImages: null,
        Symptoms: null,
        Notes: null,
        RejectionReason: null,
        AccessCode: null,
        SignedAt: DateTime.UtcNow,
        SignedDocumentUrl: "https://example.com/doc.pdf",
        SignatureId: "sig-123",
        CreatedAt: DateTime.UtcNow,
        UpdatedAt: DateTime.UtcNow);

    private void SetupApprovedFor(Guid doctorId, params Guid[] requestIds)
    {
        foreach (var id in requestIds)
        {
            var capturedId = id;
            _accessLogRepo
                .Setup(r => r.GetByRequestIdAsync(capturedId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<DocumentAccessEntry> { ApprovedLog(doctorId, capturedId) });
        }
    }

    [Fact]
    public async Task SignBatchAsync_WithAllApprovedItems_SignsAllSuccessfully()
    {
        var doctorId = Guid.NewGuid();
        var ids = new List<Guid> { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid() };
        SetupApprovedFor(doctorId, ids.ToArray());
        SetupValidRequests(doctorId, ids.ToArray());

        _signatureService
            .Setup(s => s.SignAsync(It.IsAny<Guid>(), It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Guid id, SignRequestDto _, CancellationToken _) => FakeResponseDto(id));

        var sut = CreateSut();

        var result = await sut.SignBatchAsync(doctorId, ids, "senha123", CancellationToken.None);

        result.SignedCount.Should().Be(3);
        result.FailedCount.Should().Be(0);
        result.Items.Should().OnlyContain(i => i.Success);

        _signatureService.Verify(
            s => s.SignAsync(It.IsAny<Guid>(), It.Is<SignRequestDto>(d => d.PfxPassword == "senha123"), It.IsAny<CancellationToken>()),
            Times.Exactly(3));

        // "batch_signed" log deve ser gravado para cada item assinado
        _accessLogRepo.Verify(
            r => r.LogAccessAsync(It.Is<DocumentAccessEntry>(e => e.Action == "batch_signed"), It.IsAny<CancellationToken>()),
            Times.Exactly(3));
    }

    [Fact]
    public async Task SignBatchAsync_WithOneFailure_ContinuesOthersAndReportsPartial()
    {
        var doctorId = Guid.NewGuid();
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var id3 = Guid.NewGuid();
        var ids = new List<Guid> { id1, id2, id3 };
        SetupApprovedFor(doctorId, id1, id2, id3);
        SetupValidRequests(doctorId, id1, id2, id3);

        _signatureService
            .Setup(s => s.SignAsync(id1, It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeResponseDto(id1));
        _signatureService
            .Setup(s => s.SignAsync(id2, It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Certificado expirado"));
        _signatureService
            .Setup(s => s.SignAsync(id3, It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeResponseDto(id3));

        var sut = CreateSut();

        var result = await sut.SignBatchAsync(doctorId, ids, "senha123", CancellationToken.None);

        result.SignedCount.Should().Be(2);
        result.FailedCount.Should().Be(1);
        result.Items.Should().HaveCount(3);
        result.Items.Single(i => i.RequestId == id2).Success.Should().BeFalse();
        result.Items.Single(i => i.RequestId == id2).ErrorMessage.Should().Contain("Certificado");
        result.Items.Single(i => i.RequestId == id1).Success.Should().BeTrue();
        result.Items.Single(i => i.RequestId == id3).Success.Should().BeTrue();

        // "batch_signed" só deve ter sido logado para os 2 itens bem-sucedidos
        _accessLogRepo.Verify(
            r => r.LogAccessAsync(It.Is<DocumentAccessEntry>(e => e.Action == "batch_signed"), It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }

    [Fact]
    public async Task SignBatchAsync_WithNotApprovedItem_SkipsWithoutSigning()
    {
        var doctorId = Guid.NewGuid();
        var id = Guid.NewGuid();

        // Nenhum log de approved_for_signing
        _accessLogRepo
            .Setup(r => r.GetByRequestIdAsync(id, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DocumentAccessEntry>());

        var sut = CreateSut();

        var result = await sut.SignBatchAsync(doctorId, new List<Guid> { id }, "senha123", CancellationToken.None);

        result.SignedCount.Should().Be(0);
        result.FailedCount.Should().Be(1);
        result.Items.Single().Success.Should().BeFalse();
        result.Items.Single().ErrorMessage.Should().Contain("Não aprovado");

        _signatureService.Verify(
            s => s.SignAsync(It.IsAny<Guid>(), It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SignBatchAsync_WithEmptyPassword_ReturnsErrorImmediately()
    {
        var doctorId = Guid.NewGuid();
        var ids = new List<Guid> { Guid.NewGuid() };

        var sut = CreateSut();

        var result = await sut.SignBatchAsync(doctorId, ids, "   ", CancellationToken.None);

        result.SignedCount.Should().Be(0);
        result.FailedCount.Should().Be(0);
        result.Items.Should().BeEmpty();
        result.Message.Should().Contain("Senha do certificado");

        _signatureService.Verify(
            s => s.SignAsync(It.IsAny<Guid>(), It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _accessLogRepo.Verify(
            r => r.GetByRequestIdAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SignBatchAsync_ExceedingMaxBatchSize_ReturnsErrorImmediately()
    {
        var doctorId = Guid.NewGuid();
        var ids = Enumerable.Range(0, 51).Select(_ => Guid.NewGuid()).ToList();

        var sut = CreateSut();

        var result = await sut.SignBatchAsync(doctorId, ids, "senha123", CancellationToken.None);

        result.SignedCount.Should().Be(0);
        result.FailedCount.Should().Be(0);
        result.Items.Should().BeEmpty();
        result.Message.Should().Contain("50");

        _signatureService.Verify(
            s => s.SignAsync(It.IsAny<Guid>(), It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SignBatchAsync_WhenBatchExceedsConfiguredLimit_ReturnsFailure()
    {
        // Limite configurado baixo (3) — 4 itens devem ser rejeitados com mensagem
        // que cita o limite efetivo, não o default de 50.
        var doctorId = Guid.NewGuid();
        var ids = Enumerable.Range(0, 4).Select(_ => Guid.NewGuid()).ToList();

        var sut = CreateSut(new BatchSignatureOptions { MaxItemsPerBatch = 3 });

        var result = await sut.SignBatchAsync(doctorId, ids, "senha123", CancellationToken.None);

        result.SignedCount.Should().Be(0);
        result.FailedCount.Should().Be(0);
        result.Items.Should().BeEmpty();
        result.Message.Should().Contain("3");

        _signatureService.Verify(
            s => s.SignAsync(It.IsAny<Guid>(), It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    // ========================================================================
    // Safety gates adicionados após auditoria de Onda 1 — findings #1 e #3:
    //   - Revalidação de Status (deve estar Paid)
    //   - Revalidação de AiRejectionReason (não deve estar preenchido)
    //   - Revalidação de ownership (DoctorId deve bater com médico atual)
    // ========================================================================

    [Fact]
    public async Task SignBatchAsync_WhenRequestWasAiRejectedAfterApproval_SkipsWithoutSigning()
    {
        // Cenário: médico aprovou o pedido, mas em background a IA clínica
        // rejeitou (contraindicação descoberta). Sem o safety gate, o batch
        // assinaria um documento que a própria plataforma considerou arriscado.
        var doctorId = Guid.NewGuid();
        var id = Guid.NewGuid();
        SetupApprovedFor(doctorId, id);

        _requestRepo
            .Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeRequest(id, doctorId, status: "paid",
                aiRejectionReason: "Interação perigosa com medicação atual"));

        var sut = CreateSut();

        var result = await sut.SignBatchAsync(doctorId, new List<Guid> { id }, "senha123", CancellationToken.None);

        result.SignedCount.Should().Be(0);
        result.FailedCount.Should().Be(1);
        result.Items.Single().Success.Should().BeFalse();
        result.Items.Single().ErrorMessage.Should().Contain("rejeitado pela IA");

        // SignAsync NUNCA deve ser chamado quando AI rejection preenchida.
        _signatureService.Verify(
            s => s.SignAsync(It.IsAny<Guid>(), It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SignBatchAsync_WhenRequestStatusChangedToCancelled_SkipsWithoutSigning()
    {
        // Cenário: entre aprovação e assinatura, o status foi para cancelled
        // (ex.: paciente cancelou o pedido). O log "approved_for_signing"
        // permanece, mas SignatureService rejeitaria com erro genérico.
        // Nosso guard devolve mensagem humana usando FriendlyStatusLabel.
        var doctorId = Guid.NewGuid();
        var id = Guid.NewGuid();
        SetupApprovedFor(doctorId, id);

        _requestRepo
            .Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeRequest(id, doctorId, status: "cancelled"));

        var sut = CreateSut();

        var result = await sut.SignBatchAsync(doctorId, new List<Guid> { id }, "senha123", CancellationToken.None);

        result.SignedCount.Should().Be(0);
        result.FailedCount.Should().Be(1);
        // Nova mensagem humana com situação atual traduzida (FriendlyStatusLabel).
        result.Items.Single().ErrorMessage.Should().Contain("não pode mais ser assinado");
        result.Items.Single().ErrorMessage.Should().Contain("cancelado");

        _signatureService.Verify(
            s => s.SignAsync(It.IsAny<Guid>(), It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SignBatchAsync_WhenRequestOwnershipChanged_SkipsWithoutSigning()
    {
        // Cenário: pedido foi reatribuído a outro médico entre a aprovação e
        // a assinatura (transferência administrativa, bug de lógica, ou
        // manipulação maliciosa). O médico original NÃO deve assinar.
        var originalDoctor = Guid.NewGuid();
        var newOwner = Guid.NewGuid();
        var id = Guid.NewGuid();
        SetupApprovedFor(originalDoctor, id);

        // Request foi reatribuído: DoctorId agora é de outro médico.
        _requestRepo
            .Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeRequest(id, newOwner));

        var sut = CreateSut();

        var result = await sut.SignBatchAsync(originalDoctor, new List<Guid> { id }, "senha123", CancellationToken.None);

        result.SignedCount.Should().Be(0);
        result.FailedCount.Should().Be(1);
        result.Items.Single().ErrorMessage.Should().Contain("não pertence mais a você");

        _signatureService.Verify(
            s => s.SignAsync(It.IsAny<Guid>(), It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SignBatchAsync_WhenRequestNotFound_SkipsWithoutSigning()
    {
        // Cenário: pedido foi deletado entre aprovação e assinatura.
        var doctorId = Guid.NewGuid();
        var id = Guid.NewGuid();
        SetupApprovedFor(doctorId, id);

        _requestRepo
            .Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((MedicalRequest?)null);

        var sut = CreateSut();

        var result = await sut.SignBatchAsync(doctorId, new List<Guid> { id }, "senha123", CancellationToken.None);

        result.SignedCount.Should().Be(0);
        result.FailedCount.Should().Be(1);
        result.Items.Single().ErrorMessage.Should().Contain("não encontrado");

        _signatureService.Verify(
            s => s.SignAsync(It.IsAny<Guid>(), It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    // ========================================================================
    // Correção do bug reportado em 2026-04-09 — "Pedido não está mais apto
    // para assinatura (status atual: InReview)":
    //
    //   ApproveForSigningAsync:
    //     - Ordem correta (transição → log)
    //     - Fail-loud (propaga erro se transição falhar)
    //     - Aceita SearchingDoctor
    //     - Idempotência (já Paid + log = no-op sucesso)
    //
    //   SignBatchAsync:
    //     - Self-healing (InReview + log approved_for_signing → transição inline)
    // ========================================================================

    private static DocumentAccessEntry ReviewedLog(Guid doctorId, Guid requestId) =>
        DocumentAccessEntry.Create(
            documentId: null,
            requestId: requestId,
            userId: doctorId,
            action: "reviewed",
            actorType: "doctor");

    [Fact]
    public async Task ApproveForSigningAsync_WhenStatusIsInReview_TransitionsToPaidThenWritesLog()
    {
        // Caminho feliz (principal). Antes do fix, a ordem era inversa: log → transição.
        // Agora: transição primeiro, log só depois de confirmar persistência.
        var doctorId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        var request = MedicalRequest.Reconstitute(new MedicalRequestSnapshot
        {
            Id = requestId,
            PatientId = Guid.NewGuid(),
            PatientName = "Paciente",
            DoctorId = doctorId,
            DoctorName = "Doutor",
            RequestType = "prescription",
            Status = "InReview",
            Medications = new List<string> { "Dipirona 500mg" },
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
            UpdatedAt = DateTime.UtcNow.AddMinutes(-5),
        });

        _requestRepo
            .Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(request);

        // Médico já revisou.
        _accessLogRepo
            .Setup(r => r.GetByRequestIdAsync(requestId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DocumentAccessEntry> { ReviewedLog(doctorId, requestId) });

        MedicalRequest? persistedRequest = null;
        _requestRepo
            .Setup(r => r.UpdateAsync(It.IsAny<MedicalRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MedicalRequest r, CancellationToken _) =>
            {
                persistedRequest = r;
                return r;
            });

        var sut = CreateSut();

        var (success, error) = await sut.ApproveForSigningAsync(doctorId, requestId, CancellationToken.None);

        success.Should().BeTrue();
        error.Should().BeNull();

        // Transição foi persistida ANTES do log de aprovação.
        persistedRequest.Should().NotBeNull();
        persistedRequest!.Status.Should().Be(RenoveJa.Domain.Enums.RequestStatus.Paid);

        // Log de aprovação escrito UMA vez, depois da transição.
        _accessLogRepo.Verify(
            r => r.LogAccessAsync(
                It.Is<DocumentAccessEntry>(e => e.Action == "approved_for_signing"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ApproveForSigningAsync_WhenStatusIsSearchingDoctor_AlsoTransitions()
    {
        // Bug anterior: SearchingDoctor não estava em isReviewable. Mobile
        // mostrava esses pedidos no Modo Foco, médico aprovava, log era
        // escrito, mas status nunca mudava → batch sign falhava depois.
        var doctorId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        var request = MedicalRequest.Reconstitute(new MedicalRequestSnapshot
        {
            Id = requestId,
            PatientId = Guid.NewGuid(),
            PatientName = "Paciente",
            DoctorId = doctorId,
            DoctorName = "Doutor",
            RequestType = "prescription",
            Status = "SearchingDoctor",
            Medications = new List<string> { "Amoxicilina 500mg" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        _requestRepo
            .Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(request);
        _accessLogRepo
            .Setup(r => r.GetByRequestIdAsync(requestId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DocumentAccessEntry> { ReviewedLog(doctorId, requestId) });

        MedicalRequest? persistedRequest = null;
        _requestRepo
            .Setup(r => r.UpdateAsync(It.IsAny<MedicalRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MedicalRequest r, CancellationToken _) =>
            {
                persistedRequest = r;
                return r;
            });

        var sut = CreateSut();

        var (success, error) = await sut.ApproveForSigningAsync(doctorId, requestId, CancellationToken.None);

        success.Should().BeTrue();
        error.Should().BeNull();
        persistedRequest.Should().NotBeNull();
        persistedRequest!.Status.Should().Be(RenoveJa.Domain.Enums.RequestStatus.Paid);
    }

    [Fact]
    public async Task ApproveForSigningAsync_WhenUpdateAsyncThrows_ReturnsErrorAndDoesNotWriteApprovalLog()
    {
        // Bug original: a exceção era silenciosamente engolida e o cliente
        // recebia sucesso. Agora: falha na transição é propagada e o log de
        // aprovação NUNCA é escrito (evita aprovação fantasma).
        var doctorId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        var request = MedicalRequest.Reconstitute(new MedicalRequestSnapshot
        {
            Id = requestId,
            PatientId = Guid.NewGuid(),
            PatientName = "Paciente",
            DoctorId = doctorId,
            DoctorName = "Doutor",
            RequestType = "prescription",
            Status = "InReview",
            Medications = new List<string> { "Paracetamol 750mg" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        _requestRepo
            .Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(request);
        _accessLogRepo
            .Setup(r => r.GetByRequestIdAsync(requestId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DocumentAccessEntry> { ReviewedLog(doctorId, requestId) });

        // Simula falha de infra no UpdateAsync (DB down, constraint, etc).
        _requestRepo
            .Setup(r => r.UpdateAsync(It.IsAny<MedicalRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Connection lost"));

        var sut = CreateSut();

        var (success, error) = await sut.ApproveForSigningAsync(doctorId, requestId, CancellationToken.None);

        success.Should().BeFalse();
        error.Should().NotBeNull();
        error.Should().Contain("conexão");

        // CRÍTICO: o log approved_for_signing NÃO deve existir — sem esse
        // guard, o cliente criaria "aprovação fantasma" e o batch sign
        // falharia misteriosamente depois.
        _accessLogRepo.Verify(
            r => r.LogAccessAsync(
                It.Is<DocumentAccessEntry>(e => e.Action == "approved_for_signing"),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ApproveForSigningAsync_WhenAlreadyPaidWithLog_ReturnsSuccessIdempotently()
    {
        // Duplo-clique, re-tentativa após network blip, etc. Não deve gravar
        // log duplicado nem tocar no status.
        var doctorId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        var request = MedicalRequest.Reconstitute(new MedicalRequestSnapshot
        {
            Id = requestId,
            PatientId = Guid.NewGuid(),
            PatientName = "Paciente",
            DoctorId = doctorId,
            DoctorName = "Doutor",
            RequestType = "prescription",
            Status = "paid",
            Medications = new List<string> { "Loratadina 10mg" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        _requestRepo
            .Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(request);
        _accessLogRepo
            .Setup(r => r.GetByRequestIdAsync(requestId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DocumentAccessEntry>
            {
                ReviewedLog(doctorId, requestId),
                ApprovedLog(doctorId, requestId),
            });

        var sut = CreateSut();

        var (success, error) = await sut.ApproveForSigningAsync(doctorId, requestId, CancellationToken.None);

        success.Should().BeTrue();
        error.Should().BeNull();

        // Nada deve ser gravado — é idempotente.
        _requestRepo.Verify(
            r => r.UpdateAsync(It.IsAny<MedicalRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _accessLogRepo.Verify(
            r => r.LogAccessAsync(
                It.Is<DocumentAccessEntry>(e => e.Action == "approved_for_signing"),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ApproveForSigningAsync_WhenStatusIsTerminal_ReturnsErrorWithoutWritingLog()
    {
        // Rejected/Signed/Delivered — não pode mais aprovar. Falhar loudly.
        var doctorId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        var request = MedicalRequest.Reconstitute(new MedicalRequestSnapshot
        {
            Id = requestId,
            PatientId = Guid.NewGuid(),
            PatientName = "Paciente",
            DoctorId = doctorId,
            DoctorName = "Doutor",
            RequestType = "prescription",
            Status = "rejected",
            Medications = new List<string> { "Ibuprofeno 400mg" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        _requestRepo
            .Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(request);
        _accessLogRepo
            .Setup(r => r.GetByRequestIdAsync(requestId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DocumentAccessEntry> { ReviewedLog(doctorId, requestId) });

        var sut = CreateSut();

        var (success, error) = await sut.ApproveForSigningAsync(doctorId, requestId, CancellationToken.None);

        success.Should().BeFalse();
        error.Should().NotBeNull();
        error.Should().Contain("rejeitado");

        _requestRepo.Verify(
            r => r.UpdateAsync(It.IsAny<MedicalRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _accessLogRepo.Verify(
            r => r.LogAccessAsync(
                It.Is<DocumentAccessEntry>(e => e.Action == "approved_for_signing"),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SignBatchAsync_WhenStatusStillInReviewButHasApprovalLog_SelfHealsAndSigns()
    {
        // Defesa em profundidade: mesmo se o bug antigo voltasse (ou se dados
        // históricos tivessem logs de aprovação + status InReview), o batch
        // sign recupera transicionando inline antes de delegar para SignAsync.
        var doctorId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        SetupApprovedFor(doctorId, requestId);

        // Status "in_review" — inconsistente com o log approved_for_signing
        // (que normalmente implicaria status Paid). É exatamente o cenário
        // que produzia o bug "status atual: InReview" reportado em 2026-04-09.
        var request = MedicalRequest.Reconstitute(new MedicalRequestSnapshot
        {
            Id = requestId,
            PatientId = Guid.NewGuid(),
            PatientName = "Paciente",
            DoctorId = doctorId,
            DoctorName = "Doutor",
            RequestType = "prescription",
            Status = "InReview",
            Medications = new List<string> { "Dipirona 500mg" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        _requestRepo
            .Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(request);

        MedicalRequest? healedRequest = null;
        _requestRepo
            .Setup(r => r.UpdateAsync(It.IsAny<MedicalRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MedicalRequest r, CancellationToken _) =>
            {
                healedRequest = r;
                return r;
            });

        _signatureService
            .Setup(s => s.SignAsync(requestId, It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeResponseDto(requestId));

        var sut = CreateSut();

        var result = await sut.SignBatchAsync(
            doctorId, new List<Guid> { requestId }, "senha123", CancellationToken.None);

        // Self-heal funcionou: o item foi assinado com sucesso.
        result.SignedCount.Should().Be(1);
        result.FailedCount.Should().Be(0);
        result.Items.Single().Success.Should().BeTrue();

        // Transição inline aconteceu (UpdateAsync chamado para transição para Paid).
        healedRequest.Should().NotBeNull();
        healedRequest!.Status.Should().Be(RenoveJa.Domain.Enums.RequestStatus.Paid);

        // SignatureService recebeu a assinatura normalmente.
        _signatureService.Verify(
            s => s.SignAsync(requestId, It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ApproveForSigningAsync_WhenNotReviewedYet_ReturnsErrorWithoutTouchingState()
    {
        // Guard de "médico deve revisar antes de aprovar" — nenhum log reviewed.
        var doctorId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        var request = MedicalRequest.Reconstitute(new MedicalRequestSnapshot
        {
            Id = requestId,
            PatientId = Guid.NewGuid(),
            PatientName = "Paciente",
            DoctorId = doctorId,
            DoctorName = "Doutor",
            RequestType = "prescription",
            Status = "InReview",
            Medications = new List<string> { "X" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        _requestRepo
            .Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(request);
        _accessLogRepo
            .Setup(r => r.GetByRequestIdAsync(requestId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DocumentAccessEntry>()); // nenhum log

        var sut = CreateSut();

        var (success, error) = await sut.ApproveForSigningAsync(doctorId, requestId, CancellationToken.None);

        success.Should().BeFalse();
        error.Should().Contain("revisar");

        _requestRepo.Verify(
            r => r.UpdateAsync(It.IsAny<MedicalRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _accessLogRepo.Verify(
            r => r.LogAccessAsync(
                It.Is<DocumentAccessEntry>(e => e.Action == "approved_for_signing"),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SignBatchAsync_WhenOneItemFails_OtherItemsReturnErrorMessagePropertyPopulated()
    {
        // Verifica o rename Error → ErrorMessage: o item que falhou deve expor
        // a mensagem na propriedade nova (garante contrato com mobile).
        var doctorId = Guid.NewGuid();
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var ids = new List<Guid> { id1, id2 };
        SetupApprovedFor(doctorId, id1, id2);
        SetupValidRequests(doctorId, id1, id2);

        _signatureService
            .Setup(s => s.SignAsync(id1, It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeResponseDto(id1));
        _signatureService
            .Setup(s => s.SignAsync(id2, It.IsAny<SignRequestDto>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("PFX inválido"));

        var sut = CreateSut();

        var result = await sut.SignBatchAsync(doctorId, ids, "senha123", CancellationToken.None);

        var failed = result.Items.Single(i => i.RequestId == id2);
        failed.Success.Should().BeFalse();
        failed.ErrorMessage.Should().NotBeNullOrEmpty();
        failed.ErrorMessage.Should().Contain("PFX");

        var succeeded = result.Items.Single(i => i.RequestId == id1);
        succeeded.Success.Should().BeTrue();
        succeeded.ErrorMessage.Should().BeNull();
    }
}
