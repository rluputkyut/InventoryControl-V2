using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;
using InventoryControl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryControl.Infrastructure.Repositories;

public sealed class OrderRepository(InventoryDbContext db) : IOrderRepository
{
    public async Task<IReadOnlyList<CustomerOrder>> ListAsync(int? shopId, CancellationToken cancellationToken = default) =>
        await Orders().AsNoTracking()
            .Where(x => shopId == null || x.ShopId == shopId)
            .OrderByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<CustomerOrder>> ListForCustomerAsync(string userId, CancellationToken cancellationToken = default) =>
        await Orders().AsNoTracking()
            .Where(x => x.CustomerUserId == userId)
            .OrderByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

    public Task<CustomerOrder?> GetAsync(int id, CancellationToken cancellationToken = default) =>
        Orders().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<Warehouse?> GetDefaultWarehouseAsync(int shopId, IReadOnlyList<int> productIds, CancellationToken cancellationToken = default) =>
        await db.Warehouses.AsNoTracking()
            .Where(x => x.ShopId == shopId)
            .Where(x => productIds.Count == 0 || productIds.All(id => db.InventoryBalances.Any(b => b.WarehouseId == x.Id && b.ProductId == id && b.Quantity > 0)))
            .OrderBy(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<Product>> GetProductsForShopAsync(int shopId, IReadOnlyList<int> productIds, CancellationToken cancellationToken = default) =>
        await db.Products.AsNoTracking()
            .Where(x => x.ShopId == shopId && productIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

    public void Add(CustomerOrder order) => db.CustomerOrders.Add(order);
    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => db.SaveChangesAsync(cancellationToken);

    private IQueryable<CustomerOrder> Orders() =>
        db.CustomerOrders.Include(x => x.Shop)
            .Include(x => x.DeliveryMethod)
            .Include(x => x.PaymentMethod)
            .Include(x => x.Items).ThenInclude(x => x.Product);
}