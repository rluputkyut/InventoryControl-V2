using InventoryControl.Domain;

namespace InventoryControl.Application.Abstractions;

public interface IOrderRepository
{
    Task<IReadOnlyList<CustomerOrder>> ListAsync(int? shopId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CustomerOrder>> ListForCustomerAsync(string userId, CancellationToken cancellationToken = default);
    Task<CustomerOrder?> GetAsync(int id, CancellationToken cancellationToken = default);
    Task<Warehouse?> GetDefaultWarehouseAsync(int shopId, IReadOnlyList<int> productIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Product>> GetProductsForShopAsync(int shopId, IReadOnlyList<int> productIds, CancellationToken cancellationToken = default);
    void Add(CustomerOrder order);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}