using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;
using InventoryControl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryControl.Infrastructure.Repositories;

public sealed class InventoryRepository(InventoryDbContext db) : IInventoryRepository
{
    public async Task<IReadOnlyList<InventoryBalance>> ListBalancesAsync(int? warehouseId, CancellationToken cancellationToken = default) =>
        await db.InventoryBalances.AsNoTracking().Include(x => x.Product).Include(x => x.Warehouse)
            .Where(x => warehouseId == null || x.WarehouseId == warehouseId).OrderBy(x => x.Product!.Name).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<InventoryTransaction>> ListTransactionsAsync(int? warehouseId, int? documentId, CancellationToken cancellationToken = default) =>
        await db.InventoryTransactions.AsNoTracking().Include(x => x.Product).Include(x => x.Warehouse)
            .Where(x => warehouseId == null || x.WarehouseId == warehouseId)
            .Where(x => documentId == null || x.StockDocumentId == documentId)
            .OrderByDescending(x => x.OccurredAtUtc).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<StockDocument>> ListDocumentsAsync(StockDocumentType type, CancellationToken cancellationToken = default) =>
        await Documents().AsNoTracking().Where(x => x.Type == type).OrderByDescending(x => x.OccurredAtUtc).ToListAsync(cancellationToken);

    public Task<StockDocument?> GetDocumentAsync(int id, CancellationToken cancellationToken = default) =>
        Documents().AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<bool> ProductsAndWarehousesExistAsync(IReadOnlyCollection<int> productIds, IReadOnlyCollection<int> warehouseIds, CancellationToken cancellationToken = default)
    {
        var distinctProducts = productIds.Distinct().ToList();
        var distinctWarehouses = warehouseIds.Distinct().ToList();
        return await db.Products.CountAsync(x => distinctProducts.Contains(x.Id), cancellationToken) == distinctProducts.Count &&
               await db.Warehouses.CountAsync(x => distinctWarehouses.Contains(x.Id), cancellationToken) == distinctWarehouses.Count;
    }

    public async Task<InventoryBalance> GetOrCreateBalanceAsync(int productId, int warehouseId, CancellationToken cancellationToken = default)
    {
        var balance = await db.InventoryBalances.SingleOrDefaultAsync(x => x.ProductId == productId && x.WarehouseId == warehouseId, cancellationToken);
        if (balance is not null) return balance;
        balance = new InventoryBalance { ProductId = productId, WarehouseId = warehouseId };
        db.InventoryBalances.Add(balance); return balance;
    }

    public void AddDocument(StockDocument document) => db.StockDocuments.Add(document);
    public void AddTransaction(InventoryTransaction transaction) => db.InventoryTransactions.Add(transaction);
    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => db.SaveChangesAsync(cancellationToken);

    private IQueryable<StockDocument> Documents() =>
        db.StockDocuments.Include(x => x.Lines).ThenInclude(x => x.Product)
            .Include(x => x.Warehouse).Include(x => x.FromWarehouse).Include(x => x.ToWarehouse);
}
