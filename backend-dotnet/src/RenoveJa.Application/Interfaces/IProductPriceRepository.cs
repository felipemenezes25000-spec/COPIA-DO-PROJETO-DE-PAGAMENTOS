using RenoveJa.Application.DTOs.Productivity;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Repositório para consulta e gestão de preços de produtos (prescrição, exame, consulta).
/// </summary>
public interface IProductPriceRepository
{
    Task<List<ProductPriceDto>> GetAllActiveAsync(CancellationToken ct = default);
    Task<List<ProductPriceDto>> GetAllAsync(CancellationToken ct = default);
    Task<ProductPriceDto?> GetByKeyAsync(string productKey, CancellationToken ct = default);
    Task<ProductPriceDto> UpsertAsync(string productKey, UpsertProductPriceDto dto, Guid? updatedBy, CancellationToken ct = default);
    Task<ProductPriceDto> CreateCustomAsync(CreateCustomProductDto dto, Guid? updatedBy, CancellationToken ct = default);
    Task<bool> DeactivateAsync(string productKey, Guid? updatedBy, CancellationToken ct = default);
}
