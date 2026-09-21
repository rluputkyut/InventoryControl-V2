using InventoryControl.Domain;

namespace InventoryControl.Application.Contracts;

public sealed record StockLineRequest(int ProductId, decimal Quantity, decimal UnitPrice = 0);

public sealed record StockDocumentRequest(int WarehouseId, IReadOnlyList<StockLineRequest> Lines, string? ReferenceNo, string? Notes);

public sealed record TransferDocumentRequest(int FromWarehouseId, int ToWarehouseId, IReadOnlyList<StockLineRequest> Lines, string? ReferenceNo, string? Notes);

public sealed record StockLineDto(int Id, int LineNumber, int ProductId, string? ProductName, decimal Quantity, decimal UnitPrice, decimal LineTotal);

public sealed record StockLineBalanceDto(int ProductId, int WarehouseId, decimal Quantity);

public sealed record StockDocumentDto(
    int Id,
    string Type,
    int? WarehouseId,
    int? FromWarehouseId,
    int? ToWarehouseId,
    string? ReferenceNo,
    string? Notes,
    DateTime OccurredAtUtc,
    decimal TotalAmount,
    string? PostedByUserId = null,
    IReadOnlyList<StockLineDto>? Lines = null,
    IReadOnlyList<StockLineBalanceDto>? Balances = null);

public sealed record InventoryOperationResult(bool Succeeded, string Message, StockDocumentDto? Document = null);

public static class StockDocumentMapper
{
    public static StockDocumentDto ToDto(StockDocument document, IReadOnlyList<StockLineBalanceDto>? balances = null) =>
        new(
            document.Id,
            document.Type.ToString(),
            document.WarehouseId,
            document.FromWarehouseId,
            document.ToWarehouseId,
            document.ReferenceNo,
            document.Notes,
            document.OccurredAtUtc,
            document.TotalAmount,
            document.UserId,
            document.Lines
                .OrderBy(x => x.LineNumber)
                .Select(x => new StockLineDto(x.Id, x.LineNumber, x.ProductId, x.Product?.Name, x.Quantity, x.UnitPrice, x.Quantity * x.UnitPrice))
                .ToList(),
            balances);
}
