using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RenoveJa.Application.DTOs.Requests;
using RenoveJa.Application.Interfaces;
using RenoveJa.Application.Services.Clinical;
using Xunit;

namespace RenoveJa.UnitTests;

/// <summary>
/// Phase D — agregação do histórico clínico do paciente.
///
/// A extração de <see cref="ClinicalRecordsController.GetPatientClinicalSummary"/>
/// para <see cref="PatientClinicalHistoryService"/> só faz sentido se for testável.
/// Aqui cobrimos:
///   1. Caso vazio (paciente sem requests)
///   2. Parsing de alergias da anamnese (array e string)
///   3. Parsing do CID sugerido
///   4. Agrupamento por tipo (consultation/prescription/exam)
///   5. Texto de fallback determinístico
/// </summary>
public class PatientClinicalHistoryServiceTests
{
    private readonly Mock<IRequestService> _requestServiceMock = new();
    private readonly PatientClinicalHistoryService _sut;
    private readonly Guid _doctorId = Guid.NewGuid();
    private readonly Guid _patientId = Guid.NewGuid();

    public PatientClinicalHistoryServiceTests()
    {
        _sut = new PatientClinicalHistoryService(_requestServiceMock.Object, NullLogger<PatientClinicalHistoryService>.Instance);
    }

    [Fact]
    public async Task BuildAsync_WhenNoRequests_ShouldReturnEmptyResult()
    {
        _requestServiceMock
            .Setup(x => x.GetPatientRequestsAsync(_doctorId, _patientId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<RequestResponseDto>());
        _requestServiceMock
            .Setup(x => x.GetPatientProfileForDoctorAsync(_doctorId, _patientId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PatientProfileForDoctorDto(
                "Fulana", null, null, null, null, "F",
                null, null, null, null, null, null, null, null));

        var result = await _sut.BuildAsync(_doctorId, _patientId);

        result.IsEmpty.Should().BeTrue();
        result.PatientName.Should().Be("Fulana");
        result.Consultations.Should().BeEmpty();
        result.Prescriptions.Should().BeEmpty();
        result.Exams.Should().BeEmpty();
    }

    [Fact]
    public async Task BuildAsync_ShouldExtractAllergiesFromConsultationAnamnesis()
    {
        var anamnesis = """{"alergias": ["dipirona", "penicilina"], "queixa_principal": "dor"}""";
        _requestServiceMock
            .Setup(x => x.GetPatientRequestsAsync(_doctorId, _patientId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<RequestResponseDto>
            {
                BuildConsultationDto(anamnesis, "Dor de cabeça"),
            });
        _requestServiceMock
            .Setup(x => x.GetPatientProfileForDoctorAsync(_doctorId, _patientId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((PatientProfileForDoctorDto?)null);

        var result = await _sut.BuildAsync(_doctorId, _patientId);

        result.IsEmpty.Should().BeFalse();
        result.Allergies.Should().BeEquivalentTo("dipirona", "penicilina");
        result.Consultations.Should().HaveCount(1);
        result.Consultations[0].AnamnesisSnippet.Should().Contain("dor");
    }

    [Fact]
    public async Task BuildAsync_ShouldExtractAllergiesWhenStoredAsString()
    {
        // Variante tolerada: alergias como string única (dado legado).
        var anamnesis = """{"alergias": "amoxicilina"}""";
        _requestServiceMock
            .Setup(x => x.GetPatientRequestsAsync(_doctorId, _patientId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<RequestResponseDto>
            {
                BuildConsultationDto(anamnesis, "teste"),
            });
        _requestServiceMock
            .Setup(x => x.GetPatientProfileForDoctorAsync(_doctorId, _patientId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((PatientProfileForDoctorDto?)null);

        var result = await _sut.BuildAsync(_doctorId, _patientId);

        result.Allergies.Should().ContainSingle().And.Contain("amoxicilina");
    }

    [Fact]
    public async Task BuildAsync_ShouldExtractCidFromAnamnesis()
    {
        var anamnesis = """{"cid_sugerido": "I10"}""";
        _requestServiceMock
            .Setup(x => x.GetPatientRequestsAsync(_doctorId, _patientId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<RequestResponseDto>
            {
                BuildConsultationDto(anamnesis, "Hipertensão"),
            });
        _requestServiceMock
            .Setup(x => x.GetPatientProfileForDoctorAsync(_doctorId, _patientId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((PatientProfileForDoctorDto?)null);

        var result = await _sut.BuildAsync(_doctorId, _patientId);

        result.Consultations[0].Cid.Should().Be("I10");
    }

    [Fact]
    public async Task BuildAsync_ShouldGroupRequestsByType()
    {
        _requestServiceMock
            .Setup(x => x.GetPatientRequestsAsync(_doctorId, _patientId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<RequestResponseDto>
            {
                BuildConsultationDto("""{}""", "tosse"),
                BuildPrescriptionDto("losartana 50mg"),
                BuildExamDto("hemograma"),
            });
        _requestServiceMock
            .Setup(x => x.GetPatientProfileForDoctorAsync(_doctorId, _patientId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((PatientProfileForDoctorDto?)null);

        var result = await _sut.BuildAsync(_doctorId, _patientId);

        result.Consultations.Should().HaveCount(1);
        result.Prescriptions.Should().HaveCount(1);
        result.Exams.Should().HaveCount(1);
    }

    [Fact]
    public void BuildFallbackSummary_ShouldProduceDeterministicText()
    {
        var history = new PatientClinicalHistoryResult(
            IsEmpty: false,
            PatientName: "Carlos",
            BirthDate: new DateTime(1980, 1, 1),
            Gender: "M",
            Allergies: new[] { "sulfas" },
            Consultations: new[]
            {
                new ClinicalSummaryConsultation(
                    new DateTime(2026, 1, 15), "febre", "J00", "repouso + hidratação", null)
            },
            Prescriptions: new[]
            {
                new ClinicalSummaryPrescription(
                    new DateTime(2026, 1, 15), "simple", new[] { "paracetamol 750mg" }, null)
            },
            Exams: Array.Empty<ClinicalSummaryExam>());

        var text = _sut.BuildFallbackSummary(history);

        text.Should().Contain("Carlos");
        text.Should().Contain("sulfas");
        text.Should().Contain("15/01/2026");
        text.Should().Contain("J00");
        text.Should().Contain("paracetamol 750mg");
    }

    // ── helpers ──────────────────────────────────────────

    private static RequestResponseDto BuildConsultationDto(string anamnesisJson, string symptoms)
    {
        return new RequestResponseDto(
            Id: Guid.NewGuid(),
            PatientId: Guid.NewGuid(),
            PatientName: "X",
            DoctorId: null,
            DoctorName: null,
            RequestType: "consultation",
            Status: "searching_doctor",
            PrescriptionType: null,
            PrescriptionKind: null,
            Medications: null,
            PrescriptionImages: null,
            ExamType: null,
            Exams: null,
            ExamImages: null,
            Symptoms: symptoms,
            Notes: null,
            RejectionReason: null,
            AccessCode: null,
            SignedAt: null,
            SignedDocumentUrl: null,
            SignatureId: null,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow,
            ConsultationAnamnesis: anamnesisJson);
    }

    private static RequestResponseDto BuildPrescriptionDto(string med)
    {
        return new RequestResponseDto(
            Id: Guid.NewGuid(),
            PatientId: Guid.NewGuid(),
            PatientName: "X",
            DoctorId: null,
            DoctorName: null,
            RequestType: "prescription",
            Status: "submitted",
            PrescriptionType: "simples",
            PrescriptionKind: null,
            Medications: new List<string> { med },
            PrescriptionImages: null,
            ExamType: null,
            Exams: null,
            ExamImages: null,
            Symptoms: null,
            Notes: null,
            RejectionReason: null,
            AccessCode: null,
            SignedAt: null,
            SignedDocumentUrl: null,
            SignatureId: null,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow);
    }

    private static RequestResponseDto BuildExamDto(string exam)
    {
        return new RequestResponseDto(
            Id: Guid.NewGuid(),
            PatientId: Guid.NewGuid(),
            PatientName: "X",
            DoctorId: null,
            DoctorName: null,
            RequestType: "exam",
            Status: "submitted",
            PrescriptionType: null,
            PrescriptionKind: null,
            Medications: null,
            PrescriptionImages: null,
            ExamType: "geral",
            Exams: new List<string> { exam },
            ExamImages: null,
            Symptoms: null,
            Notes: null,
            RejectionReason: null,
            AccessCode: null,
            SignedAt: null,
            SignedDocumentUrl: null,
            SignatureId: null,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow);
    }
}
