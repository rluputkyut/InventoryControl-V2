using InventoryControl.Domain;

namespace InventoryControl.Application.Abstractions;

public interface IRepository<T> where T : NamedEntity
{
    Task<IReadOnlyList<T>> ListAsync(CancellationToken cancellationToken = default);
    /// <summary>List entities, optionally scoped to a shop (for shop-scoped entities).</summary>
    Task<IReadOnlyList<T>> ListAsync(CancellationToken cancellationToken, int? shopId);
    Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<T> AddAsync(T entity, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(T entity, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}

public interface IProductRepository : IRepository<Product>
{
    Task<IReadOnlyList<Product>> ListWithDetailsAsync(CancellationToken cancellationToken = default);
    Task<Product?> GetWithDetailsAsync(int id, CancellationToken cancellationToken = default);
    Task<bool> ReferencesExistAsync(Product product, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductImage>> ListImagesAsync(int productId, CancellationToken cancellationToken = default);
    Task<ProductImage?> FindImageAsync(int imageId, CancellationToken cancellationToken = default);
    Task<ProductImage> AddImageAsync(int productId, string imagePath, CancellationToken cancellationToken = default);
    Task<ProductImage?> RemoveImageAsync(int imageId, CancellationToken cancellationToken = default);
    Task<bool> SetImageOrderAsync(int productId, IReadOnlyList<int> orderedImageIds, CancellationToken cancellationToken = default);
}

public interface IInventoryRepository
{
    Task<IReadOnlyList<InventoryBalance>> ListBalancesAsync(int? warehouseId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryTransaction>> ListTransactionsAsync(int? warehouseId, int? documentId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StockDocument>> ListDocumentsAsync(StockDocumentType type, CancellationToken cancellationToken = default);
    Task<StockDocument?> GetDocumentAsync(int id, CancellationToken cancellationToken = default);
    Task<bool> ProductsAndWarehousesExistAsync(IReadOnlyCollection<int> productIds, IReadOnlyCollection<int> warehouseIds, CancellationToken cancellationToken = default);
    Task<InventoryBalance> GetOrCreateBalanceAsync(int productId, int warehouseId, CancellationToken cancellationToken = default);
    void AddDocument(StockDocument document);
    void AddTransaction(InventoryTransaction transaction);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Global delivery/payment catalogue plus per-shop links. The catalogue is Admin-managed global
/// reference data; the per-shop links (and checkout validation) are used by shops and customers.
/// </summary>
public interface IDeliveryMethodRepository
{
    Task<IReadOnlyList<DeliveryMethod>> ListDeliveryMethodsAsync(CancellationToken cancellationToken = default);
    Task<DeliveryMethod?> GetDeliveryMethodAsync(int id, CancellationToken cancellationToken = default);
    Task<DeliveryMethod> AddDeliveryMethodAsync(DeliveryMethod delivery, CancellationToken cancellationToken = default);
    Task<bool> UpdateDeliveryMethodAsync(DeliveryMethod delivery, CancellationToken cancellationToken = default);
    Task<bool> DeleteDeliveryMethodAsync(int id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PaymentMethod>> ListPaymentsAsync(int deliveryMethodId, CancellationToken cancellationToken = default);
    Task<PaymentMethod?> GetPaymentMethodAsync(int id, CancellationToken cancellationToken = default);
    Task<PaymentMethod> AddPaymentMethodAsync(PaymentMethod payment, CancellationToken cancellationToken = default);
    Task<bool> UpdatePaymentMethodAsync(PaymentMethod payment, CancellationToken cancellationToken = default);
    Task<bool> DeletePaymentMethodAsync(int id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DeliveryMethod>> ListLinkedDeliveryMethodsAsync(int shopId, bool includePayments = false, CancellationToken cancellationToken = default);
    Task<bool> SetLinkedDeliveryMethodsAsync(int shopId, IReadOnlyList<int> deliveryMethodIds, CancellationToken cancellationToken = default);

    /// <summary>True when the shop offers the delivery method and the payment method is accepted for it.</summary>
    Task<bool> IsCheckoutOptionValidAsync(int shopId, int deliveryMethodId, int paymentMethodId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
