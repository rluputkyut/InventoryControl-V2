using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace InventoryControl.Api.Controllers;

public sealed record ReorderImagesRequest(IReadOnlyList<int> ImageIds);

/// <summary>Manages the product catalogue. Reads are available to any authenticated role; writes are Admin-only.</summary>
[ApiController]
[Route("api/products")]
[Authorize]
public sealed class ProductsController(IProductRepository products, IProductImageService images, IRepository<Shop> shops)
    : ControllerBase
{
    private const int MaxImageBytes = 2 * 1024 * 1024;
    private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif",
    };

    /// <summary>Returns all products with their unit, type, group, and images.</summary>
    [HttpGet]
    public Task<IReadOnlyList<Product>> List(CancellationToken cancellationToken) => products.ListWithDetailsAsync(cancellationToken);

    /// <summary>Returns one product by its identifier.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Product>> Get(int id, CancellationToken cancellationToken)
    {
        var product = await products.GetWithDetailsAsync(id, cancellationToken);
        return product is null ? NotFound() : product;
    }

    /// <summary>Lists a product's images (lowest sort order first).</summary>
    [HttpGet("{id:int}/images")]
    public async Task<ActionResult> ListImages(int id, CancellationToken cancellationToken)
    {
        if (await products.GetWithDetailsAsync(id, cancellationToken) is null) return NotFound();
        return Ok(await products.ListImagesAsync(id, cancellationToken));
    }

    /// <summary>Streams one gallery image to any authenticated client.</summary>
    [HttpGet("{id:int}/images/{imageId:int}")]
    public async Task<ActionResult> GetImage(int id, int imageId, CancellationToken cancellationToken)
    {
        var image = await products.FindImageAsync(imageId, cancellationToken);
        if (image is null || image.ProductId != id) return NotFound();
        var stream = await images.OpenAsync(image.ImagePath, cancellationToken);
        if (stream is null) return NotFound();
        return File(stream, ContentTypeFor(image.ImagePath), enableRangeProcessing: true);
    }

    /// <summary>Creates a product.</summary>
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<Product>> Create(Product product, CancellationToken cancellationToken)
    {
        if (!await products.ReferencesExistAsync(product, cancellationToken)) return BadRequest("Unit, product type, or product group does not exist.");
        if (await shops.GetByIdAsync(product.ShopId, cancellationToken) is null) return BadRequest("Shop does not exist.");
        await products.AddAsync(product, cancellationToken); return CreatedAtAction(nameof(Get), new { id = product.Id }, product);
    }

    /// <summary>Updates a product.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Update(int id, Product product, CancellationToken cancellationToken)
    {
        if (id != product.Id) return BadRequest("Route and body IDs must match.");
        if (!await products.ReferencesExistAsync(product, cancellationToken)) return BadRequest("Unit, product type, or product group does not exist.");
        if (await shops.GetByIdAsync(product.ShopId, cancellationToken) is null) return BadRequest("Shop does not exist.");
        return await products.UpdateAsync(product, cancellationToken) ? NoContent() : NotFound();
    }

    /// <summary>Deletes a product and its stored images.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var storedImages = await products.ListImagesAsync(id, cancellationToken);
        if (!await products.DeleteAsync(id, cancellationToken)) return NotFound();
        foreach (var image in storedImages) await images.DeleteAsync(image.ImagePath, cancellationToken);
        return NoContent();
    }

    /// <summary>Uploads one image, appending it to the product's gallery.</summary>
    [HttpPost("{id:int}/images")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult> UploadImage(int id, IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0) return BadRequest("An image file is required.");
        if (file.Length > MaxImageBytes) return BadRequest("Image must be 2 MB or smaller.");
        if (!AllowedImageTypes.Contains(file.ContentType)) return BadRequest("Only JPEG, PNG, WebP, or GIF images are supported.");

        var imagePath = await images.SaveAsync(id, file.OpenReadStream(), file.ContentType, cancellationToken);
        if (await products.GetWithDetailsAsync(id, cancellationToken) is null) return NotFound();
        var image = await products.AddImageAsync(id, imagePath, cancellationToken);
        return CreatedAtAction(nameof(GetImage), new { id, imageId = image.Id }, image);
    }

    /// <summary>Sets gallery order; the first id becomes the primary image.</summary>
    [HttpPut("{id:int}/images/reorder")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> ReorderImages(int id, ReorderImagesRequest request, CancellationToken cancellationToken) =>
        await products.SetImageOrderAsync(id, request.ImageIds, cancellationToken) ? NoContent() : NotFound();

    /// <summary>Removes one image from a product's gallery.</summary>
    [HttpDelete("{id:int}/images/{imageId:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DeleteImage(int id, int imageId, CancellationToken cancellationToken)
    {
        var image = await products.FindImageAsync(imageId, cancellationToken);
        if (image is null || image.ProductId != id) return NotFound();
        await products.RemoveImageAsync(imageId, cancellationToken);
        await images.DeleteAsync(image.ImagePath, cancellationToken);
        return NoContent();
    }

    private static string ContentTypeFor(string imagePath) =>
        new FileExtensionContentTypeProvider().TryGetContentType(imagePath, out var contentType)
            ? contentType
            : "application/octet-stream";
}