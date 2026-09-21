using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace InventoryControl.Api.Controllers;

public sealed record SetShopDeliveryMethodsRequest(IReadOnlyList<int> DeliveryMethodIds);

/// <summary>
/// Shop management. Platform Admin manages the list of shops; ShopAdmins are scoped to one of them.
/// The public shop lookup and the logo stream are anonymous so the mobile app can render shop branding.
/// </summary>
[ApiController]
[Route("api/shops")]
[Authorize(Roles = Roles.Admin)]
public sealed class ShopsController(
    IRepository<Shop> shops,
    IRepository<Country> countries,
    IShopImageService images,
    IDeliveryMethodRepository deliveries,
    ICurrentUser currentUser) : ControllerBase
{
    private const int MaxLogoBytes = 2 * 1024 * 1024;
    private static readonly HashSet<string> AllowedLogoTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif",
    };

    public sealed record PublicShop(
        int Id,
        string Name,
        string Code,
        string? LogoUrl,
        string? CountryCode,
        string? CountryPhoneCode,
        string? CountryCurrencyCode);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Shop>>> List(CancellationToken cancellationToken)
    {
        var list = await shops.ListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Shop>> Get(int id, CancellationToken cancellationToken)
    {
        var shop = await shops.GetByIdAsync(id, cancellationToken);
        return shop is null ? NotFound() : Ok(shop);
    }

    /// <summary>Returns the active shop used for unnamed visitor branding (e.g. the mobile login screen).</summary>
    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<ActionResult<PublicShop>> Public(CancellationToken cancellationToken)
    {
        var list = await shops.ListAsync(cancellationToken);
        var shop = list.FirstOrDefault(x => x.IsActive) ?? list.FirstOrDefault();
        if (shop is null) return NotFound();
        var country = shop.CountryId is int id
            ? await countries.GetByIdAsync(id, cancellationToken)
            : null;
        return Ok(ToPublic(shop, country));
    }

    [HttpPost]
    public async Task<ActionResult<Shop>> Create(Shop shop, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(shop.Name) || string.IsNullOrWhiteSpace(shop.Code))
            return BadRequest("Name and Code are required.");
        await shops.AddAsync(shop, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = shop.Id }, shop);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Shop shop, CancellationToken cancellationToken)
    {
        if (id != shop.Id) return BadRequest("Route and body IDs must match.");
        var existing = await shops.GetByIdAsync(id, cancellationToken);
        if (existing is null) return NotFound();
        await shops.UpdateAsync(shop, cancellationToken);
        return NoContent();
    }

    /// <summary>Uploads or replaces the shop's logo (Admin).</summary>
    [HttpPost("{id:int}/logo")]
    public async Task<IActionResult> UploadLogo(int id, IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0) return BadRequest("A logo image file is required.");
        if (file.Length > MaxLogoBytes) return BadRequest("Logo image must be 2 MB or smaller.");
        if (!AllowedLogoTypes.Contains(file.ContentType)) return BadRequest("Only JPEG, PNG, WebP, or GIF images are supported.");

        var shop = await shops.GetByIdAsync(id, cancellationToken);
        if (shop is null) return NotFound();

        var path = await images.SaveAsync(id, file.OpenReadStream(), file.ContentType, cancellationToken);
        var previous = shop.LogoPath;
        shop.LogoPath = path;
        await shops.UpdateAsync(shop, cancellationToken);
        if (previous is not null) await images.DeleteAsync(previous, cancellationToken);
        return Ok(shop);
    }

    /// <summary>Streams the shop's logo image (anonymous, for app branding).</summary>
    [HttpGet("{id:int}/logo")]
    [AllowAnonymous]
    public async Task<ActionResult> GetLogo(int id, CancellationToken cancellationToken)
    {
        var shop = await shops.GetByIdAsync(id, cancellationToken);
        if (shop is null || string.IsNullOrEmpty(shop.LogoPath)) return NotFound();
        var stream = await images.OpenAsync(shop.LogoPath, cancellationToken);
        if (stream is null) return NotFound();
        return File(stream, ContentTypeFor(shop.LogoPath), enableRangeProcessing: true);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var existing = await shops.GetByIdAsync(id, cancellationToken);
        if (existing is null) return NotFound();
        await shops.DeleteAsync(id, cancellationToken);
        if (existing.LogoPath is not null) await images.DeleteAsync(existing.LogoPath, cancellationToken);
        return NoContent();
    }

    private static PublicShop ToPublic(Shop shop, Country? country) =>
        new(shop.Id, shop.Name, shop.Code, shop.LogoUrl, country?.Code, country?.PhoneCode, country?.CurrencyCode);

    /// <summary>Returns the delivery methods linked to a shop (Admin, or ShopAdmin for their own shop).</summary>
    [HttpGet("{id:int}/delivery-methods")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public async Task<ActionResult<IReadOnlyList<DeliveryMethod>>> GetDeliveryMethods(int id, CancellationToken cancellationToken)
    {
        var shop = await shops.GetByIdAsync(id, cancellationToken);
        if (shop is null) return NotFound();
        if (User.IsInRole(Roles.ShopAdmin) && currentUser.ShopId != id) return Forbid();
        return Ok(await deliveries.ListLinkedDeliveryMethodsAsync(id, includePayments: true, cancellationToken));
    }

    /// <summary>Replaces the set of delivery methods a shop offers (Admin, or ShopAdmin for their own shop).</summary>
    [HttpPut("{id:int}/delivery-methods")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public async Task<IActionResult> SetDeliveryMethods(int id, SetShopDeliveryMethodsRequest request, CancellationToken cancellationToken)
    {
        var shop = await shops.GetByIdAsync(id, cancellationToken);
        if (shop is null) return NotFound();
        if (User.IsInRole(Roles.ShopAdmin) && currentUser.ShopId != id) return Forbid();
        await deliveries.SetLinkedDeliveryMethodsAsync(id, request.DeliveryMethodIds, cancellationToken);
        return NoContent();
    }

    private static string ContentTypeFor(string imagePath) =>
        new FileExtensionContentTypeProvider().TryGetContentType(imagePath, out var contentType)
            ? contentType
            : "application/octet-stream";
}