using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.DTOs;
using RenoveJa.Application.DTOs.Requests;
using RenoveJa.Application.Helpers;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Application.Services.Requests;

/// <summary>
/// Serviço de leitura/consulta de solicitações médicas.
/// </summary>
public class RequestQueryService(
    IRequestRepository requestRepository,
    IUserRepository userRepository,
    IConsultationAnamnesisRepository consultationAnamnesisRepository,
    IDocumentTokenService documentTokenService,
    IOptions<ApiConfig> apiConfig,
    ILogger<RequestQueryService> logger) : IRequestQueryService
{
    private readonly string _apiBaseUrl = (apiConfig?.Value?.BaseUrl ?? "").Trim();

    public async Task<List<RequestResponseDto>> GetUserRequestsAsync(
        Guid userId,
        string? status = null,
        string? type = null,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation("[GetUserRequests] userId={UserId}", userId);

        var user = await userRepository.GetByIdAsync(userId, cancellationToken);
        logger.LogInformation("[GetUserRequests] user from DB: Id={UserId}, Role={Role}, Email={Email}",
            user?.Id, user?.Role.ToString(), user?.Email ?? "(null)");

        List<MedicalRequest> requests;

        if (user?.Role == UserRole.Doctor)
        {
            logger.LogInformation("[GetUserRequests] branch: Doctor - fetching assigned + available (1 query for queue)");

            var doctorRequests = await requestRepository.GetByDoctorIdAsync(userId, cancellationToken);
            var available = await requestRepository.GetAvailableForQueueAsync(cancellationToken);

            logger.LogInformation("[GetUserRequests] doctor: assignedCount={Assigned}, availableInQueue={Available}",
                doctorRequests.Count, available.Count);

            requests = doctorRequests.Concat(available)
                .DistinctBy(r => r.Id)
                .OrderByDescending(r => r.CreatedAt)
                .ToList();

            logger.LogInformation("[GetUserRequests] doctor: totalRequests={Total}", requests.Count);
        }
        else
        {
            logger.LogInformation("[GetUserRequests] branch: Patient (or user not found) - fetching by patient_id");
            requests = await requestRepository.GetByPatientIdAsync(userId, cancellationToken);
            logger.LogInformation("[GetUserRequests] patient: totalRequests={Total}", requests.Count);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var statusEnum = EnumHelper.ParseSnakeCase<RequestStatus>(status);
            requests = requests.Where(r => r.Status == statusEnum).ToList();
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            var typeEnum = EnumHelper.ParseSnakeCase<RequestType>(type);
            requests = requests.Where(r => r.RequestType == typeEnum).ToList();
        }

        var consultationIds = requests.Where(r => r.RequestType == RequestType.Consultation).Select(r => r.Id).ToList();
        var anamnesisByRequest = consultationIds.Count > 0
            ? await consultationAnamnesisRepository.GetByRequestIdsAsync(consultationIds, cancellationToken)
            : new Dictionary<Guid, ConsultationAnamnesis>();

        var result = new List<RequestResponseDto>();
        foreach (var r in requests)
        {
            string? ct = null, ca = null, cs = null, ce = null;
            if (r.RequestType == RequestType.Consultation && r.DoctorId == userId && anamnesisByRequest.TryGetValue(r.Id, out var a))
            {
                ct = a.TranscriptText; ca = a.AnamnesisJson; cs = a.AiSuggestionsJson; ce = a.EvidenceJson;
            }
            result.Add(RequestHelpers.MapRequestToDto(r, _apiBaseUrl, documentTokenService, ct, ca, cs, ce));
        }
        logger.LogInformation("[GetUserRequests] final count after filters: {Count}", result.Count);
        return result;
    }

    public async Task<PagedResponse<RequestResponseDto>> GetUserRequestsPagedAsync(
        Guid userId,
        string? status = null,
        string? type = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var allRequests = await GetUserRequestsAsync(userId, status, type, cancellationToken);
        var totalCount = allRequests.Count;
        var offset = (page - 1) * pageSize;
        var items = allRequests.Skip(offset).Take(pageSize).ToList();

        return new PagedResponse<RequestResponseDto>(items, totalCount, page, pageSize);
    }

    public async Task<RequestResponseDto> GetRequestByIdAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var request = await requestRepository.GetByIdAsync(id, cancellationToken);
        if (request == null)
            throw new KeyNotFoundException("Request not found");

        var isPatient = request.PatientId == userId;
        var isAssignedDoctor = request.DoctorId.HasValue && request.DoctorId == userId;
        var isAvailableForDoctor = !request.DoctorId.HasValue || request.DoctorId == Guid.Empty;

        User? user = null;
        if (!isPatient && !isAssignedDoctor && isAvailableForDoctor)
        {
            user = await userRepository.GetByIdAsync(userId, cancellationToken);
        }

        var canAccess = isPatient
            || isAssignedDoctor
            || (isAvailableForDoctor && user?.Role == UserRole.Doctor);

        if (!canAccess)
            throw new KeyNotFoundException("Request not found");

        string? ct = null, ca = null, cs = null, ce = null;
        if (isAssignedDoctor)
        {
            var consultationData = await GetConsultationAnamnesisIfAnyAsync(request.Id, request.RequestType, cancellationToken);
            ct = consultationData.Transcript;
            ca = consultationData.AnamnesisJson;
            cs = consultationData.SuggestionsJson;
            ce = consultationData.EvidenceJson;
        }
        return RequestHelpers.MapRequestToDto(request, _apiBaseUrl, documentTokenService, ct, ca, cs, ce);
    }

    public async Task<List<RequestResponseDto>> GetPatientRequestsAsync(
        Guid doctorId,
        Guid patientId,
        CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(doctorId, cancellationToken);
        if (user?.Role != UserRole.Doctor)
            throw new UnauthorizedAccessException("Apenas médicos podem acessar o prontuário do paciente.");

        var requests = await requestRepository.GetByPatientIdAsync(patientId, cancellationToken);
        requests = requests
            .Where(r => r.DoctorId == null || r.DoctorId == Guid.Empty || r.DoctorId == doctorId)
            .OrderByDescending(r => r.CreatedAt)
            .ToList();

        var consultationIds = requests.Where(r => r.RequestType == RequestType.Consultation).Select(r => r.Id).ToList();
        var anamnesisByRequest = consultationIds.Count > 0
            ? await consultationAnamnesisRepository.GetByRequestIdsAsync(consultationIds, cancellationToken)
            : new Dictionary<Guid, ConsultationAnamnesis>();

        var dtos = new List<RequestResponseDto>();
        foreach (var r in requests)
        {
            string? ct = null, ca = null, cs = null, ce = null;
            if (r.RequestType == RequestType.Consultation && anamnesisByRequest.TryGetValue(r.Id, out var a))
            {
                ct = a.TranscriptText; ca = a.AnamnesisJson; cs = a.AiSuggestionsJson; ce = a.EvidenceJson;
            }
            dtos.Add(RequestHelpers.MapRequestToDto(r, _apiBaseUrl, documentTokenService, ct, ca, cs, ce));
        }
        return dtos;
    }

    public async Task<PatientProfileForDoctorDto?> GetPatientProfileForDoctorAsync(
        Guid doctorId,
        Guid patientId,
        CancellationToken cancellationToken = default)
    {
        var doctor = await userRepository.GetByIdAsync(doctorId, cancellationToken);
        if (doctor?.Role != UserRole.Doctor)
            return null;

        var requests = await requestRepository.GetByPatientIdAsync(patientId, cancellationToken);
        var hasAccess = requests.Any(r => r.DoctorId == null || r.DoctorId == Guid.Empty || r.DoctorId == doctorId);
        if (!hasAccess)
            return null;

        var user = await userRepository.GetByIdAsync(patientId, cancellationToken);
        if (user == null || user.Role != UserRole.Patient)
            return null;

        var cpfMasked = RequestHelpers.MaskCpf(user.Cpf);

        return new PatientProfileForDoctorDto(
            user.Name,
            user.Email.Value,
            user.Phone?.Value,
            user.BirthDate,
            cpfMasked,
            user.Gender,
            user.Street,
            user.Number,
            user.Neighborhood,
            user.Complement,
            user.City,
            user.State,
            user.PostalCode,
            user.AvatarUrl
        );
    }

    public async Task<(int PendingCount, int InReviewCount, int CompletedCount, decimal TotalEarnings)> GetDoctorStatsAsync(
        Guid doctorId, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(doctorId, cancellationToken);
        if (user?.Role != UserRole.Doctor)
            throw new UnauthorizedAccessException("Apenas médicos podem acessar as estatísticas.");
        return await requestRepository.GetDoctorStatsAsync(doctorId, cancellationToken);
    }

    private async Task<(string? Transcript, string? AnamnesisJson, string? SuggestionsJson, string? EvidenceJson)> GetConsultationAnamnesisIfAnyAsync(
        Guid requestId,
        RequestType requestType,
        CancellationToken cancellationToken)
    {
        if (requestType != RequestType.Consultation) return (null, null, null, null);
        var a = await consultationAnamnesisRepository.GetByRequestIdAsync(requestId, cancellationToken);
        if (a == null) return (null, null, null, null);
        return (a.TranscriptText, a.AnamnesisJson, a.AiSuggestionsJson, a.EvidenceJson);
    }
}
