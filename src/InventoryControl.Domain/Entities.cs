using System.Text.Json.Serialization;

namespace InventoryControl.Domain;

public abstract class NamedEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

/// <summary>Customer profile details (1:1 with the ASP.NET Identity user).</summary>
public sealed class CustomerProfile
{
    public long Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
}

public interface IShopScopedEntity
{
    int ShopId { get; set; }
}

public sealed class UnitOfMeasurement : NamedEntity { public string? Symbol { get; set; } }

/// <summary>Country used to scope address autocomplete and shop locations (ISO 3166-1 alpha-2 code).</summary>
public sealed class Country : NamedEntity
{
    public string Code { get; set; } = string.Empty;
    public string? PhoneCode { get; set; }
    public string? CurrencyCode { get; set; }
}

/// <summary>A shop is a marketplace tenant; it owns its warehouses, catalogue, and customers.</summary>
public sealed class Shop : NamedEntity
{
    public string Code { get; set; } = string.Empty;
    public string? Notes { get; set; }

    /// <summary>Country used to bias address autocomplete for this shop's customers.</summary>
    public int? CountryId { get; set; }

    [JsonIgnore]
    public Country? Country { get; set; }

    [JsonIgnore]
    public string? LogoPath { get; set; }

    /// <summary>URL of the shop's logo image, or null when none is uploaded.</summary>
    public string? LogoUrl => string.IsNullOrEmpty(LogoPath) ? null : $"/api/shops/{Id}/logo";
}

/// <summary>Global delivery option; shops opt in via the <see cref="ShopDeliveryMethod"/> link table.</summary>
public sealed class DeliveryMethod : NamedEntity
{
    [JsonIgnore]
    public string? LogoPath { get; set; }

    /// <summary>URL of the delivery method's logo image, or null when none is uploaded.</summary>
    public string? LogoUrl => string.IsNullOrEmpty(LogoPath) ? null : $"/api/delivery-methods/{Id}/logo";

    [JsonIgnore]
    public ICollection<ShopDeliveryMethod> ShopLinks { get; set; } = new List<ShopDeliveryMethod>();

    [JsonIgnore]
    public ICollection<PaymentMethod> PaymentMethods { get; set; } = new List<PaymentMethod>();
}

/// <summary>Links a shop to one of the global delivery methods it offers (composite key).</summary>
public sealed class ShopDeliveryMethod
{
    public int ShopId { get; set; }
    public int DeliveryMethodId { get; set; }

    [JsonIgnore]
    public Shop? Shop { get; set; }

    [JsonIgnore]
    public DeliveryMethod? DeliveryMethod { get; set; }
}

/// <summary>A payment option accepted for one delivery method.</summary>
public sealed class PaymentMethod : NamedEntity
{
    public int DeliveryMethodId { get; set; }

    [JsonIgnore]
    public DeliveryMethod? DeliveryMethod { get; set; }

    [JsonIgnore]
    public string? LogoPath { get; set; }

    /// <summary>URL of the payment method's logo image, or null when none is uploaded.</summary>
    public string? LogoUrl => string.IsNullOrEmpty(LogoPath) ? null : $"/api/delivery-methods/payments/{Id}/logo";
}


/// <summary>Shop-owned catalogue reference data.</summary>
public sealed class ProductType : NamedEntity, IShopScopedEntity { public string? Description { get; set; } public int ShopId { get; set; } }
public sealed class ProductGroup : NamedEntity, IShopScopedEntity { public string? Description { get; set; } public int ShopId { get; set; } }
public sealed class Warehouse : NamedEntity, IShopScopedEntity { public string? Code { get; set; } public string? Address { get; set; } public int ShopId { get; set; } }

public sealed class Product : NamedEntity
{
    public string Sku { get; set; } = string.Empty;
    public int ShopId { get; set; }
    public int UnitOfMeasurementId { get; set; }
    public int ProductTypeId { get; set; }
    public int ProductGroupId { get; set; }
    public decimal ReorderLevel { get; set; }

    /// <summary>Purchase (cost) price per unit.</summary>
    public decimal BuyPrice { get; set; }

    /// <summary>List (selling) price per unit shown to customers.</summary>
    public decimal SellPrice { get; set; }

    /// <summary>Optional promotional discount in percent (0-100); null means no promotion.</summary>
    public decimal? DiscountPercent { get; set; }

    /// <summary>Effective customer price after any promotion discount.</summary>
    public decimal EffectivePrice => DiscountPercent is { } discount and > 0 ? SellPrice - SellPrice * (discount / 100m) : SellPrice;

    [JsonIgnore]
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();

    /// <summary>URL of the primary image (lowest sort order), or null when the product has no images.</summary>
    public string? ImageUrl => Images.OrderBy(x => x.SortOrder).FirstOrDefault()?.Url;

    public UnitOfMeasurement? UnitOfMeasurement { get; set; }
    public ProductType? ProductType { get; set; }
    public ProductGroup? ProductGroup { get; set; }
}

/// <summary>One image in a product's gallery. The lowest <see cref="SortOrder"/> is the primary image.</summary>
public sealed class ProductImage
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int SortOrder { get; set; }

    [JsonIgnore]
    public string ImagePath { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public string Url => $"/api/products/{ProductId}/images/{Id}";
}

public sealed class InventoryBalance
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int WarehouseId { get; set; }
    public decimal Quantity { get; set; }
    public Product? Product { get; set; }
    public Warehouse? Warehouse { get; set; }
}

public enum InventoryTransactionType { Purchase, Sale, TransferOut, TransferIn }

public enum StockDocumentType { Purchase, Sale, Transfer }

public sealed class StockDocument
{
    public int Id { get; set; }
    public StockDocumentType Type { get; set; }
    public string? UserId { get; set; }
    public int? WarehouseId { get; set; }
    public int? FromWarehouseId { get; set; }
    public int? ToWarehouseId { get; set; }
    public string? ReferenceNo { get; set; }
    public string? Notes { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
    public Warehouse? Warehouse { get; set; }
    public Warehouse? FromWarehouse { get; set; }
    public Warehouse? ToWarehouse { get; set; }
    public ICollection<StockDocumentLine> Lines { get; set; } = new List<StockDocumentLine>();
}

public sealed class StockDocumentLine
{
    public int Id { get; set; }
    public int StockDocumentId { get; set; }
    public int LineNumber { get; set; }
    public int ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public StockDocument? Document { get; set; }
    public Product? Product { get; set; }
}

public sealed class InventoryTransaction
{
    public int Id { get; set; }
    public InventoryTransactionType Type { get; set; }
    public int ProductId { get; set; }
    public int WarehouseId { get; set; }
    public int? StockDocumentId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? ReferenceNo { get; set; }
    public string? Notes { get; set; }
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
    public Product? Product { get; set; }
    public Warehouse? Warehouse { get; set; }
    public StockDocument? StockDocument { get; set; }
}

public enum CustomerOrderStatus { PendingApproval, Approved, Delivered, Rejected }

/// <summary>
/// A customer order placed through the mobile portal. Stock is only moved when an admin
/// approves the order (payment approval), at which point a <see cref="SaleDocumentId"/> links
/// the generated Sale document.
/// </summary>
public sealed class CustomerOrder
{
    public int Id { get; set; }

    /// <summary>Identity user id of the customer who placed the order.</summary>
    public string CustomerUserId { get; set; } = string.Empty;

    public int ShopId { get; set; }
    public CustomerOrderStatus Status { get; set; } = CustomerOrderStatus.PendingApproval;

    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string ShippingAddress { get; set; } = string.Empty;

    /// <summary>Server-relative path of the uploaded bank-transfer screenshot, or null.</summary>
    public string? PaymentProofPath { get; set; }

    public string? Notes { get; set; }
    public string? AdminNote { get; set; }

    /// <summary>Delivery method chosen at checkout (from the shop's offered catalogue).</summary>
    public int? DeliveryMethodId { get; set; }

    /// <summary>Payment method chosen at checkout (one accepted for the chosen delivery method).</summary>
    public int? PaymentMethodId { get; set; }

    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal Total { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAtUtc { get; set; }
    public DateTime? DeliveredAtUtc { get; set; }

    /// <summary>Sale document created when the order was approved, or null.</summary>
    public int? SaleDocumentId { get; set; }

    public string Number => $"ORD-{Id:D6}";

    /// <summary>URL of the payment proof image, or null when none was uploaded.</summary>
    public string? PaymentProofUrl => PaymentProofPath is null ? null : $"/api/orders/{Id}/proof";

    public Shop? Shop { get; set; }
    public DeliveryMethod? DeliveryMethod { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public ICollection<CustomerOrderItem> Items { get; set; } = new List<CustomerOrderItem>();
}

public sealed class CustomerOrderItem
{
    public int Id { get; set; }
    public int CustomerOrderId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;

    /// <summary>Effective unit price applied at order time (after any promotion).</summary>
    public decimal UnitPrice { get; set; }

    public decimal Quantity { get; set; }
    public decimal LineTotal { get; set; }

    public CustomerOrder? Order { get; set; }
    public Product? Product { get; set; }
}
