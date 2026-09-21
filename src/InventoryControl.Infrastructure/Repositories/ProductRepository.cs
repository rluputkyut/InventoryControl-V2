using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;
using InventoryControl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryControl.Infrastructure.Repositories;

public sealed class ProductRepository(InventoryDbContext db) : EfRepository<Product>(db), IProductRepository
{
    public async Task<IReadOnlyList<Product>> ListWithDetailsAsync(CancellationToken cancellationToken = default) =>
        await Details().OrderBy(x => x.Name).ToListAsync(cancellationToken);

    public Task<Product?> GetWithDetailsAsync(int id, CancellationToken cancellationToken = default) =>
        Details().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<bool> ReferencesExistAsync(Product product, CancellationToken cancellationToken = default) =>
        await Db.UnitsOfMeasurement.AnyAsync(x => x.Id == product.UnitOfMeasurementId, cancellationToken) &&
        await Db.ProductTypes.AnyAsync(x => x.Id == product.ProductTypeId, cancellationToken) &&
        await Db.ProductGroups.AnyAsync(x => x.Id == product.ProductGroupId, cancellationToken);

    public async Task<IReadOnlyList<ProductImage>> ListImagesAsync(int productId, CancellationToken cancellationToken = default) =>
        await Db.ProductImages.AsNoTracking().Where(x => x.ProductId == productId).OrderBy(x => x.SortOrder).ToListAsync(cancellationToken);

    public Task<ProductImage?> FindImageAsync(int imageId, CancellationToken cancellationToken = default) =>
        Db.ProductImages.AsNoTracking().SingleOrDefaultAsync(x => x.Id == imageId, cancellationToken);

    public async Task<ProductImage> AddImageAsync(int productId, string imagePath, CancellationToken cancellationToken = default)
    {
        var sortOrder = await Db.ProductImages.Where(x => x.ProductId == productId).MaxAsync(x => (int?)x.SortOrder, cancellationToken) + 1 ?? 0;
        var image = new ProductImage { ProductId = productId, ImagePath = imagePath, SortOrder = sortOrder };
        Db.ProductImages.Add(image);
        await Db.SaveChangesAsync(cancellationToken);
        return image;
    }

    public async Task<ProductImage?> RemoveImageAsync(int imageId, CancellationToken cancellationToken = default)
    {
        var image = await Db.ProductImages.SingleOrDefaultAsync(x => x.Id == imageId, cancellationToken);
        if (image is null) return null;
        Db.ProductImages.Remove(image);
        await Db.SaveChangesAsync(cancellationToken);
        return image;
    }

    public async Task<bool> SetImageOrderAsync(int productId, IReadOnlyList<int> orderedImageIds, CancellationToken cancellationToken = default)
    {
        var images = await Db.ProductImages.Where(x => x.ProductId == productId).ToListAsync(cancellationToken);
        if (images.Count != orderedImageIds.Count || orderedImageIds.Any(imageId => images.All(x => x.Id != imageId)))
            return false;
        var byId = images.ToDictionary(x => x.Id);
        for (var i = 0; i < orderedImageIds.Count; i++) byId[orderedImageIds[i]].SortOrder = i;
        await Db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<Product> Details() => Db.Products.AsNoTracking().Include(x => x.UnitOfMeasurement).Include(x => x.ProductType).Include(x => x.ProductGroup).Include(x => x.Images);
}
