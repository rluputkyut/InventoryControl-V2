using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;

namespace InventoryControl.Tests.Application;

/// <summary>In-memory <see cref="IInventoryRepository"/> that tracks live balances and records documents/transactions.</summary>
public sealed class FakeInventoryRepository : IInventoryRepository
{
    public bool ProductsAndWarehousesExist { get; set; } = true;
    public List<StockDocument> Documents { get; } = new();
    public List<InventoryTransaction> Transactions { get; } = new();
    public int SaveChangesCalls { get; private set; }

    private readonly Dictionary<(int ProductId, int WarehouseId), InventoryBalance> _balances = new();

    /// <summary>Pre-populate a starting balance for a product/warehouse.</summary>
    public void SeedBalance(int productId, int warehouseId, decimal quantity) =>
        _balances[(productId, warehouseId)] = new InventoryBalance
        {
            ProductId = productId,
            WarehouseId = warehouseId,
            Quantity = quantity
        };

    /// <summary>Current tracked quantity; 0 if never touched.</summary>
    public decimal Quantity(int productId, int warehouseId) =>
        _balances.TryGetValue((productId, warehouseId), out var balance) ? balance.Quantity : 0m;

    public Task<InventoryBalance> GetOrCreateBalanceAsync(int productId, int warehouseId, CancellationToken cancellationToken = default)
    {
        var key = (productId, warehouseId);
        if (!_balances.TryGetValue(key, out var balance))
        {
            balance = new InventoryBalance { ProductId = productId, WarehouseId = warehouseId, Quantity = 0m };
            _balances[key] = balance;
        }
        return Task.FromResult(balance);
    }

    public Task<IReadOnlyList<InventoryBalance>> ListBalancesAsync(int? warehouseId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<InventoryBalance>>(_balances.Values
            .Where(b => warehouseId is null || b.WarehouseId == warehouseId).ToList());

    public Task<IReadOnlyList<InventoryTransaction>> ListTransactionsAsync(int? warehouseId, int? documentId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<InventoryTransaction>>(Transactions.Where(t =>
            (warehouseId is null || t.WarehouseId == warehouseId) &&
            (documentId is null || t.StockDocumentId == documentId)).ToList());

    public Task<IReadOnlyList<StockDocument>> ListDocumentsAsync(StockDocumentType type, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<StockDocument>>(Documents.Where(d => d.Type == type).ToList());

    public Task<StockDocument?> GetDocumentAsync(int id, CancellationToken cancellationToken = default) =>
        Task.FromResult(Documents.FirstOrDefault(d => d.Id == id));

    public Task<bool> ProductsAndWarehousesExistAsync(IReadOnlyCollection<int> productIds, IReadOnlyCollection<int> warehouseIds, CancellationToken cancellationToken = default) =>
        Task.FromResult(ProductsAndWarehousesExist);

    public void AddDocument(StockDocument document) => Documents.Add(document);

    public void AddTransaction(InventoryTransaction transaction) => Transactions.Add(transaction);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SaveChangesCalls++;
        return Task.CompletedTask;
    }
}

/// <summary>Static <see cref="ICurrentUser"/> for Application tests.</summary>
public sealed class FakeCurrentUser : ICurrentUser
{
    public FakeCurrentUser(string? id = "user-1", IReadOnlyList<string>? roles = null, int? shopId = null)
    {
        Id = id;
        Roles = roles ?? [global::InventoryControl.Domain.Roles.Operator];
        ShopId = shopId;
    }

    public string? Id { get; }
    public string? UserName => Id;
    public bool IsAuthenticated => true;
    public IReadOnlyList<string> Roles { get; }
    public int? ShopId { get; }
}