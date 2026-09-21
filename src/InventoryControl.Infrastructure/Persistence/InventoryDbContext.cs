using InventoryControl.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace InventoryControl.Infrastructure.Persistence;

public sealed class InventoryDbContext(DbContextOptions<InventoryDbContext> options) : IdentityDbContext(options)
{
    public DbSet<UnitOfMeasurement> UnitsOfMeasurement => Set<UnitOfMeasurement>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<Shop> Shops => Set<Shop>();
    public DbSet<ProductType> ProductTypes => Set<ProductType>();
    public DbSet<ProductGroup> ProductGroups => Set<ProductGroup>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<InventoryBalance> InventoryBalances => Set<InventoryBalance>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<StockDocument> StockDocuments => Set<StockDocument>();
    public DbSet<StockDocumentLine> StockDocumentLines => Set<StockDocumentLine>();
    public DbSet<CustomerOrder> CustomerOrders => Set<CustomerOrder>();
    public DbSet<CustomerOrderItem> CustomerOrderItems => Set<CustomerOrderItem>();
    public DbSet<DeliveryMethod> DeliveryMethods => Set<DeliveryMethod>();
    public DbSet<ShopDeliveryMethod> ShopDeliveryMethods => Set<ShopDeliveryMethod>();
    public DbSet<PaymentMethod> PaymentMethods => Set<PaymentMethod>();
    public DbSet<CustomerProfile> CustomerProfiles => Set<CustomerProfile>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<RefreshToken>().HasIndex(x => x.TokenHash).IsUnique();
        modelBuilder.Entity<Country>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Shop>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Product>().HasIndex(x => new { x.ShopId, x.Sku }).IsUnique();
        modelBuilder.Entity<Warehouse>().HasIndex(x => new { x.ShopId, x.Code }).IsUnique();
        modelBuilder.Entity<Shop>().HasOne(x => x.Country).WithMany().HasForeignKey(x => x.CountryId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Product>().HasOne<Shop>().WithMany().HasForeignKey(x => x.ShopId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ProductType>().HasOne<Shop>().WithMany().HasForeignKey(x => x.ShopId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ProductGroup>().HasOne<Shop>().WithMany().HasForeignKey(x => x.ShopId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Warehouse>().HasOne<Shop>().WithMany().HasForeignKey(x => x.ShopId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<InventoryBalance>().HasIndex(x => new { x.ProductId, x.WarehouseId }).IsUnique();
        modelBuilder.Entity<Product>().HasMany(x => x.Images).WithOne().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ProductImage>().HasIndex(x => new { x.ProductId, x.SortOrder });
        modelBuilder.Entity<Product>().Property(x => x.ReorderLevel).HasPrecision(18, 3);
        modelBuilder.Entity<InventoryBalance>().Property(x => x.Quantity).HasPrecision(18, 3);
        modelBuilder.Entity<InventoryTransaction>().Property(x => x.Quantity).HasPrecision(18, 3);
        modelBuilder.Entity<InventoryTransaction>().Property(x => x.UnitPrice).HasPrecision(18, 2);
        modelBuilder.Entity<StockDocument>().Property(x => x.TotalAmount).HasPrecision(18, 2);
        modelBuilder.Entity<StockDocumentLine>().Property(x => x.Quantity).HasPrecision(18, 3);
        modelBuilder.Entity<StockDocumentLine>().Property(x => x.UnitPrice).HasPrecision(18, 2);
        modelBuilder.Entity<StockDocument>()
            .HasMany(x => x.Lines)
            .WithOne(x => x.Document)
            .HasForeignKey(x => x.StockDocumentId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<StockDocument>()
            .HasOne(x => x.Warehouse)
            .WithMany()
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<StockDocument>()
            .HasOne(x => x.FromWarehouse)
            .WithMany()
            .HasForeignKey(x => x.FromWarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<StockDocument>()
            .HasOne(x => x.ToWarehouse)
            .WithMany()
            .HasForeignKey(x => x.ToWarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<InventoryTransaction>()
            .HasOne(x => x.StockDocument)
            .WithMany()
            .HasForeignKey(x => x.StockDocumentId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Product>().Property(x => x.BuyPrice).HasPrecision(18, 2);
        modelBuilder.Entity<Product>().Property(x => x.SellPrice).HasPrecision(18, 2);
        modelBuilder.Entity<Product>().Property(x => x.DiscountPercent).HasPrecision(5, 2);
        modelBuilder.Entity<CustomerOrder>().HasIndex(x => x.CustomerUserId);
        modelBuilder.Entity<CustomerOrder>().HasIndex(x => new { x.ShopId, x.Status });
        modelBuilder.Entity<CustomerOrder>().HasIndex(x => x.Status);
        modelBuilder.Entity<CustomerOrder>().Property(x => x.Subtotal).HasPrecision(18, 2);
        modelBuilder.Entity<CustomerOrder>().Property(x => x.DiscountAmount).HasPrecision(18, 2);
        modelBuilder.Entity<CustomerOrder>().Property(x => x.Total).HasPrecision(18, 2);
        modelBuilder.Entity<CustomerOrderItem>().Property(x => x.UnitPrice).HasPrecision(18, 2);
        modelBuilder.Entity<CustomerOrderItem>().Property(x => x.Quantity).HasPrecision(18, 3);
        modelBuilder.Entity<CustomerOrderItem>().Property(x => x.LineTotal).HasPrecision(18, 2);
        modelBuilder.Entity<CustomerOrder>()
            .HasOne(x => x.Shop)
            .WithMany()
            .HasForeignKey(x => x.ShopId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CustomerOrder>()
            .HasMany(x => x.Items)
            .WithOne(x => x.Order)
            .HasForeignKey(x => x.CustomerOrderId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CustomerOrderItem>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CustomerProfile>().HasIndex(x => x.UserId).IsUnique();
        modelBuilder.Entity<CustomerProfile>()
            .HasOne<IdentityUser>()
            .WithOne()
            .HasForeignKey<CustomerProfile>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ShopDeliveryMethod>().HasKey(x => new { x.ShopId, x.DeliveryMethodId });
        modelBuilder.Entity<ShopDeliveryMethod>()
            .HasOne(x => x.Shop)
            .WithMany()
            .HasForeignKey(x => x.ShopId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ShopDeliveryMethod>()
            .HasOne(x => x.DeliveryMethod)
            .WithMany(x => x.ShopLinks)
            .HasForeignKey(x => x.DeliveryMethodId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<DeliveryMethod>()
            .HasMany(x => x.PaymentMethods)
            .WithOne(x => x.DeliveryMethod)
            .HasForeignKey(x => x.DeliveryMethodId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CustomerOrder>()
            .HasOne(x => x.DeliveryMethod)
            .WithMany()
            .HasForeignKey(x => x.DeliveryMethodId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CustomerOrder>()
            .HasOne(x => x.PaymentMethod)
            .WithMany()
            .HasForeignKey(x => x.PaymentMethodId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
