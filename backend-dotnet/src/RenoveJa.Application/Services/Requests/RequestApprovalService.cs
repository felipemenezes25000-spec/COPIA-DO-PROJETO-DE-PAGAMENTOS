using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.DTOs.Requests;
using RenoveJa.Application.Interfaces;
using RenoveJa.Application.Helpers;
using RenoveJa.Application.Services.Notifications;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;
using RenoveJa.Application.DTOs.Notifications;

namespace RenoveJa.Application.Services.Requests;

/// <summary>
/// Implementação do serviço de aprovação e rejeição de solicitações.
/// </summary>
public class RequestApprovalService(
    IRequestRepository requestRepository,
    IUserRepository userRepository,
    IDoctorRepository doctorRepository,
    IPushNotificationDispatcher pushDispatcher,
    IRequestEventsPublisher requestEventsPublisher,
    IAiConductSuggestionService aiConductSuggestionService,
    IConsultationTimeBankRepository consultationTimeBankRepository,
    IOptions<PricingConfig> pricingOptions,
    IServiceScopeFactory scopeFactory,
    ILogger<RequestApprovalService> logger) : IRequestApprovalService
{
    private readonly PricingConfig _pricing = pricingOptions.Value;
    // Reference kept solely to preserve the existing constructor signature for tests/DI;
    // background AI work resolves a fresh instance from a new scope (see ApproveAsync).
    private readonly IAiConductSuggestionService _aiConductSuggestionServiceUnused = aiConductSuggestionService;

    public async Task<MedicalRequest> ApproveAsync(
        Guid id,
        ApproveRequestDto dto,
        Guid doctorId,
        CancellationToken cancellationToken = default)
    {
        var request = await requestRepository.GetByIdAsync(id, cancellationToken);
        if (request == null)
            throw new KeyNotFoundException("Request not found");

        var doctor = await userRepository.GetByIdAsync(doctorId, cancellationToken);
        if (doctor == null || !doctor.IsDoctor())
            throw new InvalidOperationException("Doctor not found");

        if (request.DoctorId == null)
            request.AssignDoctor(doctorId, doctor.Name);
        // FIX B31: IDOR guard — prevent a doctor from approving a request assigned to another doctor
        else if (request.DoctorId.Value != doctorId)
            throw new UnauthorizedAccessException("Este pedido está atribuído a outro médico.");

        // Calcula preco efetivo com base no tipo de solicitacao
        var effectivePrice = CalculateEffectivePrice(request);

        // Consultas: debitar banco de horas antes de cobrar
        if (request.RequestType == RequestType.Consultation && effectivePrice > 0)
        {
            var consultationType = request.ConsultationType ?? "clinico";
            var contractedMinutes = request.ContractedMinutes ?? _pricing.ConsultationMinimumMinutes;
            var contractedSeconds = contractedMinutes * 60;
            var bankBalance = await consultationTimeBankRepository.GetBalanceSecondsAsync(
                request.PatientId, consultationType, cancellationToken);

            if (bankBalance > 0)
            {
                var secondsToDebit = Math.Min(bankBalance, contractedSeconds);
                await consultationTimeBankRepository.DebitAsync(
                    request.PatientId, consultationType, secondsToDebit, request.Id, cancellationToken);
                var minutesDebited = secondsToDebit / 60;
                var remainingMinutes = contractedMinutes - minutesDebited;
                var pricePerMinute = GetPricePerMinute(consultationType);
                effectivePrice = remainingMinutes > 0 ? remainingMinutes * pricePerMinute : 0m;
                logger.LogInformation(
                    "[APPROVAL] Banco de horas: debitados {SecondsDebited}s para request {RequestId}. Preco ajustado: {Price}",
                    secondsToDebit, request.Id, effectivePrice);
            }
        }

        // Aprovacao com preco efetivo — status vai para ApprovedPendingPayment
        request.Approve(effectivePrice, dto.Notes, dto.Medications, dto.Exams);
        request.SetEffectivePrice(effectivePrice);
        request = await requestRepository.UpdateAsync(request, cancellationToken);

        // BUG FIX: usar CancellationToken.None para evitar cancelamento da task quando
        // o HTTP request termina (ASP.NET cancela o token original ao enviar a response).
        // SCOPE FIX: criar um scope dedicado para a task em background — evita usar
        // serviços escopados (DbContext, repositórios) que serão dispostos quando o
        // request HTTP terminar. Capturamos apenas o requestId, nunca closures de scoped services.
        var requestIdForBackground = request.Id;
        var scopeFactoryForBackground = scopeFactory;
        var loggerForBackground = logger;
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactoryForBackground.CreateScope();
                var sp = scope.ServiceProvider;
                var scopedRequestRepo = sp.GetRequiredService<IRequestRepository>();
                var scopedUserRepo = sp.GetRequiredService<IUserRepository>();
                var scopedAi = sp.GetRequiredService<IAiConductSuggestionService>();
                var scopedLogger = sp.GetRequiredService<ILogger<RequestApprovalService>>();
                await GenerateAndSetConductSuggestionStaticAsync(
                    requestIdForBackground, scopedRequestRepo, scopedUserRepo, scopedAi, scopedLogger, CancellationToken.None);
            }
            catch (Exception ex)
            {
                loggerForBackground.LogWarning(ex, "AI conduct suggestion failed for RequestId={RequestId}", requestIdForBackground);
            }
        });

        await requestEventsPublisher.NotifyRequestUpdatedAsync(
            request.Id,
            request.PatientId,
            request.DoctorId,
            EnumHelper.ToSnakeCase(request.Status),
            "Solicitação aprovada",
            cancellationToken);
        // Push para paciente: aprovado, aguardando pagamento
        await pushDispatcher.SendAsync(
            PushNotificationRules.RequestApprovedPendingPayment(request.PatientId, request.Id, request.RequestType),
            cancellationToken);

        return request;
    }

    public async Task<MedicalRequest> RejectAsync(
        Guid id,
        RejectRequestDto dto,
        Guid doctorId,
        CancellationToken cancellationToken = default)
    {
        var request = await requestRepository.GetByIdAsync(id, cancellationToken);
        if (request == null)
            throw new KeyNotFoundException("Request not found");

        // BUG FIX: validar que o médico autenticado é o médico atribuído (ou não há médico atribuído)
        if (request.DoctorId.HasValue && request.DoctorId.Value != doctorId)
            throw new UnauthorizedAccessException("Somente o médico atribuído pode rejeitar esta solicitação.");

        request.Reject(dto.RejectionReason);
        request = await requestRepository.UpdateAsync(request, cancellationToken);

        await pushDispatcher.SendAsync(PushNotificationRules.Rejected(request.PatientId, request.Id, request.RequestType, dto.RejectionReason), cancellationToken);

        return request;
    }

    public async Task<MedicalRequest> ReopenFromAiRejectionAsync(
        Guid id,
        Guid doctorId,
        CancellationToken cancellationToken = default)
    {
        var request = await requestRepository.GetByIdAsync(id, cancellationToken);
        if (request == null)
            throw new KeyNotFoundException("Request not found");

        var doctor = await userRepository.GetByIdAsync(doctorId, cancellationToken);
        if (doctor == null || !doctor.IsDoctor())
            throw new InvalidOperationException("Doctor not found");

        if (!string.IsNullOrWhiteSpace(request.RequiredSpecialty))
        {
            var doctorProfile = await doctorRepository.GetByUserIdAsync(doctorId, cancellationToken);
            var doctorSpecialty = doctorProfile?.Specialty;
            if (!string.Equals(doctorSpecialty, request.RequiredSpecialty, StringComparison.OrdinalIgnoreCase))
                throw new UnauthorizedAccessException(
                    $"Este pedido exige a especialidade '{request.RequiredSpecialty}' e você não é dessa especialidade.");
        }

        request.ReopenFromAiRejection(doctorId, doctor.Name);
        request = await requestRepository.UpdateAsync(request, cancellationToken);

        await requestEventsPublisher.NotifyRequestUpdatedAsync(
            request.Id, request.PatientId, request.DoctorId,
            EnumHelper.ToSnakeCase(request.Status),
            "Pedido reaberto para análise médica",
            cancellationToken);

        await pushDispatcher.SendAsync(
            PushNotificationRules.ReopenedForReview(request.PatientId, request.Id, request.RequestType),
            cancellationToken);

        return request;
    }

    /// <summary>Calcula o preco efetivo com base no tipo e subtipo da solicitacao.</summary>
    private decimal CalculateEffectivePrice(MedicalRequest request)
    {
        return request.RequestType switch
        {
            RequestType.Prescription => request.PrescriptionType switch
            {
                PrescriptionType.Controlled or PrescriptionType.Blue => _pricing.PrescriptionControlled,
                _ => _pricing.PrescriptionSimple,
            },
            RequestType.Exam => (request.ExamType?.ToLowerInvariant()) switch
            {
                "imagem" or "image" => _pricing.ExamImagem,
                _ => _pricing.ExamLaboratorial,
            },
            RequestType.Consultation => CalculateConsultationPrice(request),
            _ => 0m,
        };
    }

    private decimal CalculateConsultationPrice(MedicalRequest request)
    {
        var consultationType = request.ConsultationType ?? "clinico";
        var contractedMinutes = request.ContractedMinutes ?? _pricing.ConsultationMinimumMinutes;
        if (contractedMinutes < _pricing.ConsultationMinimumMinutes)
            contractedMinutes = _pricing.ConsultationMinimumMinutes;
        var pricePerMinute = GetPricePerMinute(consultationType);
        return contractedMinutes * pricePerMinute;
    }

    private decimal GetPricePerMinute(string consultationType)
    {
        return consultationType.ToLowerInvariant() switch
        {
            "psicologo" or "psicologia" or "psychologist" => _pricing.ConsultationPsicologoPerMinute,
            _ => _pricing.ConsultationClinicoPerMinute,
        };
    }

    private static async Task GenerateAndSetConductSuggestionStaticAsync(
        Guid requestId,
        IRequestRepository requestRepository,
        IUserRepository userRepository,
        IAiConductSuggestionService aiConductSuggestionService,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var request = await requestRepository.GetByIdAsync(requestId, cancellationToken);
        if (request == null) return;

        var patientUser = await userRepository.GetByIdAsync(request.PatientId, cancellationToken);

        var input = new AiConductSuggestionInput(
            RequestType: request.RequestType.ToString(),
            PrescriptionType: request.PrescriptionType?.ToString(),
            ExamType: request.ExamType,
            PatientName: request.PatientName,
            PatientBirthDate: patientUser?.BirthDate,
            PatientGender: patientUser?.Gender,
            Symptoms: request.Symptoms,
            Medications: request.Medications?.Count > 0 ? request.Medications : null,
            Exams: request.Exams?.Count > 0 ? request.Exams : null,
            AiSummaryForDoctor: request.AiSummaryForDoctor,
            AiExtractedJson: request.AiExtractedJson,
            DoctorNotes: request.Notes);

        var result = await aiConductSuggestionService.GenerateAsync(input, cancellationToken);
        if (result == null) return;

        var examsJson = result.SuggestedExams?.Count > 0
            ? System.Text.Json.JsonSerializer.Serialize(result.SuggestedExams)
            : null;

        request.SetAiConductSuggestion(result.ConductSuggestion, examsJson);
        await requestRepository.UpdateAsync(request, cancellationToken);

        logger.LogInformation("AI conduct suggestion generated for request {RequestId}", requestId);
    }
}
