using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InventoryControl.Infrastructure.Persistence;

public static class SampleDataSeeder
{
    public static async Task SeedAsync(InventoryDbContext db, IProductImageService images, CancellationToken cancellationToken = default)
    {
var mainShop = await GetOrCreateShopAsync(db, "Main Shop", "MAIN", "Default development shop", cancellationToken);
var myanmar = await GetOrCreateCountryAsync(db, "Myanmar", "MM", "+95", "MMK", cancellationToken);
await GetOrCreateCountryAsync(db, "Singapore", "SG", "+65", "SGD", cancellationToken);
await GetOrCreateCountryAsync(db, "New Zealand", "NZ", "+64", "NZD", cancellationToken);
await db.SaveChangesAsync(cancellationToken);

        mainShop.CountryId = myanmar.Id;
        await db.SaveChangesAsync(cancellationToken);

        var indonesia = await db.Countries.SingleOrDefaultAsync(x => x.Code == "ID", cancellationToken);
        if (indonesia is not null && !await db.Shops.AnyAsync(x => x.CountryId == indonesia.Id, cancellationToken))
        {
            db.Countries.Remove(indonesia);
            await db.SaveChangesAsync(cancellationToken);
        }

        var each = await GetOrCreateUnitAsync(db, "Each", "EA", cancellationToken);
        var kilogram = await GetOrCreateUnitAsync(db, "Kilogram", "KG", cancellationToken);
        var liter = await GetOrCreateUnitAsync(db, "Liter", "L", cancellationToken);
        var finishedGoods = await GetOrCreateTypeAsync(db, mainShop, "Finished Goods", "Products ready for sale", cancellationToken);
        var rawMaterial = await GetOrCreateTypeAsync(db, mainShop, "Raw Material", "Materials used in production", cancellationToken);
        var beverages = await GetOrCreateGroupAsync(db, mainShop, "Beverages", "Drinks and related goods", cancellationToken);
        var packaging = await GetOrCreateGroupAsync(db, mainShop, "Packaging", "Boxes, labels, and packing materials", cancellationToken);
        var mainWarehouse = await GetOrCreateWarehouseAsync(db, mainShop, "Main Warehouse", "MAIN", "100 Warehouse Road", cancellationToken);
        var northWarehouse = await GetOrCreateWarehouseAsync(db, mainShop, "North Warehouse", "NORTH", "25 North Street", cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        var samples = new[]
        {
            new Product { Name = "Sparkling Water 500ml", Sku = "DRK-500-SPK", ShopId = mainShop.Id, UnitOfMeasurementId = each.Id, ProductTypeId = finishedGoods.Id, ProductGroupId = beverages.Id, ReorderLevel = 50, BuyPrice = 0.80m, SellPrice = 1.50m },
            new Product { Name = "Green Tea 500ml", Sku = "DRK-500-GRN", ShopId = mainShop.Id, UnitOfMeasurementId = each.Id, ProductTypeId = finishedGoods.Id, ProductGroupId = beverages.Id, ReorderLevel = 40, BuyPrice = 0.90m, SellPrice = 1.70m, DiscountPercent = 5 },
            new Product { Name = "Orange Juice 1L", Sku = "DRK-1L-OJ", ShopId = mainShop.Id, UnitOfMeasurementId = liter.Id, ProductTypeId = finishedGoods.Id, ProductGroupId = beverages.Id, ReorderLevel = 30, BuyPrice = 1.60m, SellPrice = 2.80m },
            new Product { Name = "Cardboard Carton", Sku = "PKG-CTN-001", ShopId = mainShop.Id, UnitOfMeasurementId = each.Id, ProductTypeId = rawMaterial.Id, ProductGroupId = packaging.Id, ReorderLevel = 25, BuyPrice = 0.50m, SellPrice = 1.20m },
            new Product { Name = "Corrugated Box 40x30x30", Sku = "PKG-BOX-4030", ShopId = mainShop.Id, UnitOfMeasurementId = each.Id, ProductTypeId = rawMaterial.Id, ProductGroupId = packaging.Id, ReorderLevel = 60, BuyPrice = 1.10m, SellPrice = 2.30m },
            new Product { Name = "Packing Tape 48mm", Sku = "PKG-TAPE-48", ShopId = mainShop.Id, UnitOfMeasurementId = each.Id, ProductTypeId = rawMaterial.Id, ProductGroupId = packaging.Id, ReorderLevel = 80, BuyPrice = 0.70m, SellPrice = 1.40m, DiscountPercent = 10 },
        };
        foreach (var product in samples)
        {
            var existing = await db.Products.SingleOrDefaultAsync(x => x.ShopId == mainShop.Id && x.Sku == product.Sku, cancellationToken);
            if (existing is null) { db.Products.Add(product); }
            else if (existing.BuyPrice == 0 && existing.SellPrice == 0)
            {
                existing.BuyPrice = product.BuyPrice;
                existing.SellPrice = product.SellPrice;
                existing.DiscountPercent = product.DiscountPercent;
            }
        }
        await db.SaveChangesAsync(cancellationToken);

        var seeded = await db.Products.AsNoTracking()
            .Where(x => x.ShopId == mainShop.Id && samples.Select(p => p.Sku).Contains(x.Sku))
            .Select(x => new { x.Id, x.Sku }).ToListAsync(cancellationToken);
        foreach (var item in seeded)
        {
            if (await db.ProductImages.AnyAsync(x => x.ProductId == item.Id, cancellationToken)) continue;
            var imagePath = await images.SaveAsync(item.Id, new MemoryStream(SeedImageFactory.Placeholder(item.Sku)), "image/png", cancellationToken);
            db.ProductImages.Add(new ProductImage { ProductId = item.Id, ImagePath = imagePath, SortOrder = 0 });
        }
        await db.SaveChangesAsync(cancellationToken);

        var bySku = await db.Products.Where(x => x.ShopId == mainShop.Id).ToDictionaryAsync(x => x.Sku, cancellationToken);
        var seededAt = DateTime.UtcNow;
        var stock = new[]
        {
            new { Sku = "DRK-500-SPK", WarehouseId = mainWarehouse.Id, Quantity = 250, Price = 1.20m, Reference = "SEED-PO-001" },
            new { Sku = "DRK-500-SPK", WarehouseId = northWarehouse.Id, Quantity = 75, Price = 1.20m, Reference = "SEED-PO-002" },
            new { Sku = "DRK-500-GRN", WarehouseId = mainWarehouse.Id, Quantity = 120, Price = 1.35m, Reference = "SEED-PO-003" },
            new { Sku = "DRK-1L-OJ", WarehouseId = mainWarehouse.Id, Quantity = 90, Price = 2.10m, Reference = "SEED-PO-004" },
            new { Sku = "PKG-CTN-001", WarehouseId = mainWarehouse.Id, Quantity = 100, Price = 0.65m, Reference = "SEED-PO-005" },
            new { Sku = "PKG-BOX-4030", WarehouseId = northWarehouse.Id, Quantity = 180, Price = 1.40m, Reference = "SEED-PO-006" },
            new { Sku = "PKG-BOX-4030", WarehouseId = mainWarehouse.Id, Quantity = 60, Price = 1.40m, Reference = "SEED-PO-008" },
            new { Sku = "PKG-TAPE-48", WarehouseId = mainWarehouse.Id, Quantity = 220, Price = 0.90m, Reference = "SEED-PO-007" },
        };
        foreach (var entry in stock)
        {
            if (!bySku.TryGetValue(entry.Sku, out var product)) continue;
            var hasBalance = await db.InventoryBalances.AnyAsync(x => x.ProductId == product.Id && x.WarehouseId == entry.WarehouseId, cancellationToken);
            if (hasBalance) continue;
            db.InventoryBalances.Add(new InventoryBalance { ProductId = product.Id, WarehouseId = entry.WarehouseId, Quantity = entry.Quantity });
            db.InventoryTransactions.Add(Purchase(product.Id, entry.WarehouseId, entry.Quantity, entry.Price, entry.Reference, seededAt));
        }
        await db.SaveChangesAsync(cancellationToken);

        await EnsureCustomerProfilesAsync(db, cancellationToken);
        await EnsureDeliveryCatalogueAsync(db, mainShop, cancellationToken);
    }

    private static async Task EnsureDeliveryCatalogueAsync(InventoryDbContext db, Shop mainShop, CancellationToken ct)
    {
        var standard = await GetOrCreateDeliveryAsync(db, "Standard Delivery", ct);
        var express = await GetOrCreateDeliveryAsync(db, "Express Delivery", ct);
        var pickup = await GetOrCreateDeliveryAsync(db, "Pickup at Shop", ct);
        await db.SaveChangesAsync(ct);

        await GetOrCreatePaymentAsync(db, standard, "Cash on Delivery", ct);
        await GetOrCreatePaymentAsync(db, standard, "Bank Transfer", ct);
        await GetOrCreatePaymentAsync(db, express, "Cash on Delivery", ct);
        await GetOrCreatePaymentAsync(db, express, "Bank Transfer", ct);
        await GetOrCreatePaymentAsync(db, pickup, "Cash at Pickup", ct);

        foreach (var delivery in new[] { standard, express, pickup })
        {
            var link = await db.ShopDeliveryMethods.SingleOrDefaultAsync(x => x.ShopId == mainShop.Id && x.DeliveryMethodId == delivery.Id, ct);
            if (link is null) db.ShopDeliveryMethods.Add(new ShopDeliveryMethod { ShopId = mainShop.Id, DeliveryMethodId = delivery.Id });
        }
        await db.SaveChangesAsync(ct);
    }

    private static async Task<DeliveryMethod> GetOrCreateDeliveryAsync(InventoryDbContext db, string name, CancellationToken ct)
    {
        var delivery = await db.DeliveryMethods.SingleOrDefaultAsync(x => x.Name == name, ct);
        if (delivery is null) { delivery = new DeliveryMethod { Name = name }; db.DeliveryMethods.Add(delivery); }
        return delivery;
    }

    private static async Task<PaymentMethod> GetOrCreatePaymentAsync(InventoryDbContext db, DeliveryMethod delivery, string name, CancellationToken ct)
    {
        var payment = await db.PaymentMethods.SingleOrDefaultAsync(x => x.DeliveryMethodId == delivery.Id && x.Name == name, ct);
        if (payment is null) { payment = new PaymentMethod { Name = name, DeliveryMethodId = delivery.Id }; db.PaymentMethods.Add(payment); }
        return payment;
    }

    private static async Task EnsureCustomerProfilesAsync(InventoryDbContext db, CancellationToken ct)
    {
        var profiles = new (string UserName, string Name)[]
        {
            ("admin@inventory.local", "Admin User"),
            ("operator@inventory.local", "Operator User"),
            ("viewer@inventory.local", "Viewer User"),
            ("customer@inventory.local", "Customer User"),
        };

        foreach (var (userName, name) in profiles)
        {
            var user = await db.Users.SingleOrDefaultAsync(x => x.UserName == userName, ct);
            if (user is null) continue;
            var exists = await db.CustomerProfiles.AnyAsync(x => x.UserId == user.Id, ct);
            if (exists) continue;
            db.CustomerProfiles.Add(new CustomerProfile { UserId = user.Id, Name = name });
        }
        await db.SaveChangesAsync(ct);
    }

    private static async Task<Shop> GetOrCreateShopAsync(InventoryDbContext db, string name, string code, string notes, CancellationToken ct)
    {
        var shop = await db.Shops.SingleOrDefaultAsync(x => x.Code == code, ct);
        if (shop is null) { shop = new Shop { Name = name, Code = code, Notes = notes }; db.Shops.Add(shop); }
        return shop;
    }

    private static async Task<UnitOfMeasurement> GetOrCreateUnitAsync(InventoryDbContext db, string name, string symbol, CancellationToken ct)
    {
        var unit = await db.UnitsOfMeasurement.SingleOrDefaultAsync(x => x.Name == name, ct);
        if (unit is null) { unit = new UnitOfMeasurement { Name = name, Symbol = symbol }; db.UnitsOfMeasurement.Add(unit); }
        return unit;
    }

    private static async Task<ProductType> GetOrCreateTypeAsync(InventoryDbContext db, Shop shop, string name, string description, CancellationToken ct)
    {
        var type = await db.ProductTypes.SingleOrDefaultAsync(x => x.ShopId == shop.Id && x.Name == name, ct);
        if (type is null) { type = new ProductType { Name = name, Description = description, ShopId = shop.Id }; db.ProductTypes.Add(type); }
        return type;
    }

    private static async Task<ProductGroup> GetOrCreateGroupAsync(InventoryDbContext db, Shop shop, string name, string description, CancellationToken ct)
    {
        var group = await db.ProductGroups.SingleOrDefaultAsync(x => x.ShopId == shop.Id && x.Name == name, ct);
        if (group is null) { group = new ProductGroup { Name = name, Description = description, ShopId = shop.Id }; db.ProductGroups.Add(group); }
        return group;
    }

    private static async Task<Warehouse> GetOrCreateWarehouseAsync(InventoryDbContext db, Shop shop, string name, string code, string address, CancellationToken ct)
    {
        var warehouse = await db.Warehouses.SingleOrDefaultAsync(x => x.ShopId == shop.Id && x.Code == code, ct);
        if (warehouse is null) { warehouse = new Warehouse { Name = name, Code = code, Address = address, ShopId = shop.Id }; db.Warehouses.Add(warehouse); }
        return warehouse;
    }

private static async Task<Country> GetOrCreateCountryAsync(InventoryDbContext db, string name, string code, string phoneCode, string currencyCode, CancellationToken ct)
{
    var country = await db.Countries.SingleOrDefaultAsync(x => x.Code == code, ct);
    if (country is null)
    {
        country = new Country { Name = name, Code = code, PhoneCode = phoneCode, CurrencyCode = currencyCode };
        db.Countries.Add(country);
    }
    else
    {
        country.Name = name;
        country.PhoneCode = phoneCode;
        country.CurrencyCode = currencyCode;
    }
    return country;
}

    private static InventoryTransaction Purchase(int productId, int warehouseId, decimal quantity, decimal price, string referenceNo, DateTime occurredAtUtc) =>
        new()
        {
            Type = InventoryTransactionType.Purchase, ProductId = productId, WarehouseId = warehouseId,
            Quantity = quantity, UnitPrice = price, ReferenceNo = referenceNo, Notes = "Development sample data", OccurredAtUtc = occurredAtUtc
        };
}