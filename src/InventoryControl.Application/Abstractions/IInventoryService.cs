using InventoryControl.Application.Contracts;
using InventoryControl.Domain;

namespace InventoryControl.Application.Abstractions;

public interface IInventoryService
{
    Task<IReadOnlyList<InventoryBalance>> GetBalancesAsync(int? warehouseId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryTransaction>> GetTransactionsAsync(int? warehouseId, int? documentId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StockDocumentDto>> GetDocumentsAsync(StockDocumentType type, CancellationToken cancellationToken = default);
    Task<StockDocumentDto?> GetDocumentAsync(int id, StockDocumentType type, CancellationToken cancellationToken = default);
    Task<InventoryOperationResult> PurchaseAsync(StockDocumentRequest request, CancellationToken cancellationToken = default);
    Task<InventoryOperationResult> SaleAsync(StockDocumentRequest request, CancellationToken cancellationToken = default);
    Task<InventoryOperationResult> TransferAsync(TransferDocumentRequest request, CancellationToken cancellationToken = default);
}
