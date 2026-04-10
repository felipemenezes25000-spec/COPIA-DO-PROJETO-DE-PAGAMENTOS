using Microsoft.Extensions.Logging;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Application.Services.Requests;

public class RequestClaimService(
    IRequestRepository requestRepository,
    IUserRepository userRepository,
    IRequestEventsPublisher eventsPublisher,
    ILogger<RequestClaimService> logger) : IRequestClaimService
{
    public async Task<ClaimResult> ClaimAsync(
        Guid requestId,
        Guid doctorId,
        CancellationToken cancellationToken = default)
    {
        var doctor = await userRepository.GetByIdAsync(doctorId, cancellationToken);
        if (doctor == null || !doctor.IsDoctor())
            return ClaimResult.Invalid("Usuário não é médico.");

        var claimed = await requestRepository.TryClaimAsync(
            requestId, doctorId, doctor.Name, cancellationToken);

        if (!claimed)
        {
            var existing = await requestRepository.GetByIdAsync(requestId, cancellationToken);
            if (existing == null)
                return ClaimResult.NotFound();

            var holder = existing.DoctorName ?? "outro médico";
            logger.LogInformation(
                "Claim conflict: requestId={RequestId} doctor={DoctorId} holder={Holder}",
                requestId, doctorId, holder);
            return ClaimResult.Conflict(holder);
        }

        var updated = await requestRepository.GetByIdAsync(requestId, cancellationToken);
        if (updated == null)
            return ClaimResult.Invalid("Pedido desapareceu após claim.");

        try
        {
            await eventsPublisher.NotifyRequestClaimedAsync(
                requestId, doctor.Name, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Claim SignalR publish failed: requestId={RequestId}", requestId);
        }

        logger.LogInformation(
            "Claim success: requestId={RequestId} doctor={DoctorId}",
            requestId, doctorId);

        return ClaimResult.Ok(updated);
    }
}
