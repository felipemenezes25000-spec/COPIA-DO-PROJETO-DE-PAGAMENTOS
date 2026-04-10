using RenoveJa.Application.DTOs.Clinical;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Orquestra a emissão em lote de documentos pós-consulta.
/// </summary>
public interface IPostConsultationService
{
    /// <summary>Emite documentos pós-consulta (receita, exame, atestado, encaminhamento).</summary>
    Task<PostConsultationEmitResponse> EmitDocumentsAsync(
        Guid doctorUserId,
        PostConsultationEmitRequest request,
        CancellationToken cancellationToken = default);
}
