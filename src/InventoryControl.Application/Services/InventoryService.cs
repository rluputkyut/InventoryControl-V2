using InventoryControl.Application.Abstractions;
using InventoryControl.Application.Contracts;
using InventoryControl.Domain;

namespace InventoryControl.Application.Services;

public sealed class InventoryService(IInventoryRepository repository, ICurrentUser currentUser) : IInventoryService
{
    public Task<IReadOnlyList<InventoryBalance>> GetBalancesAsync(int? warehouseId, CancellationToken cancellationToken = default) =>
        repository.ListBalancesAsync(warehouseId, cancellationToken);

    public Task<IReadOnlyList<InventoryTransaction>> GetTransactionsAsync(int? warehouseId, int? documentId, CancellationToken cancellationToken = default) =>
        repository.ListTransactionsAsync(warehouseId, documentId, cancellationToken);

    public async Task<IReadOnlyList<StockDocumentDto>> GetDocumentsAsync(StockDocumentType type, CancellationToken cancellationToken = default) =>
        (await repository.ListDocumentsAsync(type, cancellationToken)).Select(document => StockDocumentMapper.ToDto(document)).ToList();

    public async Task<StockDocumentDto?> GetDocumentAsync(int id, StockDocumentType type, CancellationToken cancellationToken = default)
    {
        var document = await repository.GetDocumentAsync(id, cancellationToken);
        return document is null || document.Type != type ? null : StockDocumentMapper.ToDto(document);
    }

    public Task<InventoryOperationResult> PurchaseAsync(StockDocumentRequest request, CancellationToken cancellationToken = default) =>
        PostAsync(StockDocumentType.Purchase, request.WarehouseId, null, null, request.Lines, request.ReferenceNo, request.Notes, cancellationToken);

    public Task<InventoryOperationResult> SaleAsync(StockDocumentRequest request, CancellationToken cancellationToken = default) =>
        PostAsync(StockDocumentType.Sale, request.WarehouseId, null, null, request.Lines, request.ReferenceNo, request.Notes, cancellationToken);

    public Task<InventoryOperationResult> TransferAsync(TransferDocumentRequest request, CancellationToken cancellationToken = default) =>
        PostAsync(StockDocumentType.Transfer, null, request.FromWarehouseId, request.ToWarehouseId, request.Lines, request.ReferenceNo, request.Notes, cancellationToken);

    private async Task<InventoryOperationResult> PostAsync(
        StockDocumentType type,
        int? warehouseId,
        int? fromWarehouseId,
        int? toWarehouseId,
        IReadOnlyList<StockLineRequest>? lines,
        string? referenceNo,
        string? notes,
        CancellationToken cancellationToken)
    {
        if (lines is null || lines.Count == 0)
            return new(false, "At least one product line is required.");
        if (lines.Any(line => line.Quantity <= 0 || line.UnitPrice < 0))
            return new(false, "Each line must have a positive quantity and a non-negative unit price.");
        if (type == StockDocumentType.Transfer && (fromWarehouseId is null || toWarehouseId is null || fromWarehouseId == toWarehouseId))
            return new(false, "Quantity must be positive and warehouses must differ.");

        var productIds = lines.Select(line => line.ProductId).Distinct().ToList();
        var warehouseIds = type == StockDocumentType.Transfer
            ? new[] { fromWarehouseId!.Value, toWarehouseId!.Value }
            : [warehouseId!.Value];
        if (!await repository.ProductsAndWarehousesExistAsync(productIds, warehouseIds, cancellationToken))
            return new(false, "Product or warehouse was not found.");

        var sourceWarehouseId = type == StockDocumentType.Transfer ? fromWarehouseId!.Value : warehouseId!.Value;
        var balances = new Dictionary<(int ProductId, int WarehouseId), InventoryBalance>();

        if (type is StockDocumentType.Sale or StockDocumentType.Transfer)
        {
            foreach (var group in lines.GroupBy(line => line.ProductId))
            {
                var balance = await BalanceAsync(group.Key, sourceWarehouseId, balances, cancellationToken);
                var required = group.Sum(line => line.Quantity);
                if (balance.Quantity < required)
                    return new(false, $"Insufficient stock{(type == StockDocumentType.Transfer ? " in source warehouse" : "")} for product {group.Key}.");
            }
        }

        var occurredAt = DateTime.UtcNow;
        var document = new StockDocument
        {
            Type = type,
            WarehouseId = warehouseId,
            FromWarehouseId = fromWarehouseId,
            ToWarehouseId = toWarehouseId,
            ReferenceNo = referenceNo,
            Notes = notes,
            OccurredAtUtc = occurredAt,
            UserId = currentUser.Id,
            TotalAmount = lines.Sum(line => line.Quantity * line.UnitPrice)
        };

        var lineNumber = 1;
        foreach (var line in lines)
        {
            document.Lines.Add(new StockDocumentLine
            {
                LineNumber = lineNumber++,
                ProductId = line.ProductId,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice
            });

            if (type == StockDocumentType.Transfer)
            {
                var from = await BalanceAsync(line.ProductId, fromWarehouseId!.Value, balances, cancellationToken);
                var to = await BalanceAsync(line.ProductId, toWarehouseId!.Value, balances, cancellationToken);
                from.Quantity -= line.Quantity;
                to.Quantity += line.Quantity;
                repository.AddTransaction(Movement(InventoryTransactionType.TransferOut, line, fromWarehouseId.Value, referenceNo, notes, occurredAt, document));
                repository.AddTransaction(Movement(InventoryTransactionType.TransferIn, line, toWarehouseId.Value, referenceNo, notes, occurredAt, document));
            }
            else
            {
                var balance = await BalanceAsync(line.ProductId, warehouseId!.Value, balances, cancellationToken);
                balance.Quantity += type == StockDocumentType.Purchase ? line.Quantity : -line.Quantity;
                var movementType = type == StockDocumentType.Purchase ? InventoryTransactionType.Purchase : InventoryTransactionType.Sale;
                repository.AddTransaction(Movement(movementType, line, warehouseId.Value, referenceNo, notes, occurredAt, document));
            }
        }

        repository.AddDocument(document);
        await repository.SaveChangesAsync(cancellationToken);

        var balanceDtos = balances.Values
            .Select(balance => new StockLineBalanceDto(balance.ProductId, balance.WarehouseId, balance.Quantity))
            .ToList();
        return new(true, type switch
        {
            StockDocumentType.Purchase => "Purchase posted.",
            StockDocumentType.Sale => "Sale posted.",
            _ => "Transfer completed."
        }, StockDocumentMapper.ToDto(document, balanceDtos));
    }

    private async Task<InventoryBalance> BalanceAsync(
        int productId,
        int warehouseId,
        IDictionary<(int ProductId, int WarehouseId), InventoryBalance> cache,
        CancellationToken cancellationToken)
    {
        var key = (productId, warehouseId);
        if (cache.TryGetValue(key, out var existing)) return existing;
        var balance = await repository.GetOrCreateBalanceAsync(productId, warehouseId, cancellationToken);
        cache[key] = balance;
        return balance;
    }

    private static InventoryTransaction Movement(
        InventoryTransactionType type,
        StockLineRequest line,
        int warehouseId,
        string? referenceNo,
        string? notes,
        DateTime occurredAtUtc,
        StockDocument document) =>
        new()
        {
            Type = type,
            ProductId = line.ProductId,
            WarehouseId = warehouseId,
            Quantity = line.Quantity,
            UnitPrice = line.UnitPrice,
            ReferenceNo = referenceNo,
            Notes = notes,
            OccurredAtUtc = occurredAtUtc,
            StockDocument = document
        };
}
