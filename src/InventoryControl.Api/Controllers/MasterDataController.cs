using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryControl.Api.Controllers;

/// <summary>
/// Manages catalogue reference data. Reads are available to any authenticated user (scoped to their shop
/// for shop-owned reference data); units (unit of measurement) are global and Admin-managed.
/// Writes for shop-owned reference data require Admin or ShopAdmin (scoped to the caller's shop);
/// writes to units require Admin.
/// </summary>
[ApiController]
[Route("api/master-data")]
[Authorize]
public sealed class MasterDataController(
    IRepository<UnitOfMeasurement> units,
    IRepository<Country> countries,
    IRepository<ProductType> productTypes,
    IRepository<ProductGroup> productGroups,
    IRepository<Warehouse> warehouses,
    IRepository<Shop> shops,
    ICurrentUser currentUser) : ControllerBase
{
    private int? ShopId => currentUser.IsAuthenticated && Roles.IsShopScoped(currentUser.Roles) ? currentUser.ShopId : null;
    private int? AdminShopId => currentUser.IsAuthenticated && currentUser.Roles.Contains(Roles.ShopAdmin) ? currentUser.ShopId : null;

    [HttpGet("units")]
    public Task<IReadOnlyList<UnitOfMeasurement>> Units(CancellationToken ct) => units.ListAsync(ct);

    [HttpPost("units")]
    [Authorize(Roles = Roles.Admin)]
    public Task<ActionResult<UnitOfMeasurement>> CreateUnit(UnitOfMeasurement item, CancellationToken ct) => Create(item, units, ct, null);
    [HttpPut("units/{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public Task<IActionResult> UpdateUnit(int id, UnitOfMeasurement item, CancellationToken ct) => Update(id, item, units, ct, null);
    [HttpDelete("units/{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public Task<IActionResult> DeleteUnit(int id, CancellationToken ct) => Delete(id, units, ct, null);

    [HttpGet("countries")]
    public Task<IReadOnlyList<Country>> Countries(CancellationToken ct) => countries.ListAsync(ct);

    [HttpPost("countries")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<Country>> CreateCountry(Country item, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(item.Name) || string.IsNullOrWhiteSpace(item.Code))
            return BadRequest("Name and Code are required.");
        item.Code = item.Code.Trim().ToUpperInvariant();
        NormalizeCountryFields(item);
        await countries.AddAsync(item, ct);
        return Ok(item);
    }

    [HttpPut("countries/{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdateCountry(int id, Country item, CancellationToken ct)
    {
        if (id != item.Id) return BadRequest("Route and body IDs must match.");
        if (string.IsNullOrWhiteSpace(item.Name) || string.IsNullOrWhiteSpace(item.Code))
            return BadRequest("Name and Code are required.");
        var existing = await countries.GetByIdAsync(id, ct);
        if (existing is null) return NotFound();
        item.Code = item.Code.Trim().ToUpperInvariant();
        NormalizeCountryFields(item);
        return await countries.UpdateAsync(item, ct) ? NoContent() : NotFound();
    }

    [HttpDelete("countries/{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public Task<IActionResult> DeleteCountry(int id, CancellationToken ct) => Delete(id, countries, ct, null);

    [HttpGet("product-types")]
    public Task<IReadOnlyList<ProductType>> Types(CancellationToken ct) => productTypes.ListAsync(ct, ShopId);
    [HttpPost("product-types")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public Task<ActionResult<ProductType>> CreateType(ProductType item, CancellationToken ct) => Create(item, productTypes, ct, AdminShopId);
    [HttpPut("product-types/{id:int}")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public Task<IActionResult> UpdateType(int id, ProductType item, CancellationToken ct) => Update(id, item, productTypes, ct, AdminShopId);
    [HttpDelete("product-types/{id:int}")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public Task<IActionResult> DeleteType(int id, CancellationToken ct) => Delete(id, productTypes, ct, AdminShopId);

    [HttpGet("product-groups")]
    public Task<IReadOnlyList<ProductGroup>> Groups(CancellationToken ct) => productGroups.ListAsync(ct, ShopId);
    [HttpPost("product-groups")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public Task<ActionResult<ProductGroup>> CreateGroup(ProductGroup item, CancellationToken ct) => Create(item, productGroups, ct, AdminShopId);
    [HttpPut("product-groups/{id:int}")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public Task<IActionResult> UpdateGroup(int id, ProductGroup item, CancellationToken ct) => Update(id, item, productGroups, ct, AdminShopId);
    [HttpDelete("product-groups/{id:int}")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public Task<IActionResult> DeleteGroup(int id, CancellationToken ct) => Delete(id, productGroups, ct, AdminShopId);

    [HttpGet("warehouses")]
    public Task<IReadOnlyList<Warehouse>> Warehouses(CancellationToken ct) => warehouses.ListAsync(ct, ShopId);
    [HttpPost("warehouses")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public Task<ActionResult<Warehouse>> CreateWarehouse(Warehouse item, CancellationToken ct) => Create(item, warehouses, ct, AdminShopId);
    [HttpPut("warehouses/{id:int}")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public Task<IActionResult> UpdateWarehouse(int id, Warehouse item, CancellationToken ct) => Update(id, item, warehouses, ct, AdminShopId);
    [HttpDelete("warehouses/{id:int}")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public Task<IActionResult> DeleteWarehouse(int id, CancellationToken ct) => Delete(id, warehouses, ct, AdminShopId);

    private async Task<ActionResult<T>> Create<T>(T item, IRepository<T> repository, CancellationToken ct, int? forcedShopId) where T : NamedEntity
    {
        if (string.IsNullOrWhiteSpace(item.Name)) return BadRequest("Name is required.");
        if (item is IShopScopedEntity scoped)
        {
            if (forcedShopId is int owned) scoped.ShopId = owned;
            else if (scoped.ShopId <= 0 || await shops.GetByIdAsync(scoped.ShopId, ct) is null) return BadRequest("Shop does not exist.");
        }
        await repository.AddAsync(item, ct); return Ok(item);
    }

    private async Task<IActionResult> Update<T>(int id, T item, IRepository<T> repository, CancellationToken ct, int? forcedShopId) where T : NamedEntity
    {
        if (id != item.Id) return BadRequest("Route and body IDs must match.");
        if (string.IsNullOrWhiteSpace(item.Name)) return BadRequest("Name is required.");
        var existing = await repository.GetByIdAsync(id, ct);
        if (existing is null) return NotFound();
        if (existing is IShopScopedEntity scoped)
        {
            if (forcedShopId is int owned)
            {
                if (scoped.ShopId != owned) return Forbid();
                ((IShopScopedEntity)item).ShopId = owned;
            }
            else
            {
                ((IShopScopedEntity)item).ShopId = scoped.ShopId;
            }
        }
        return await repository.UpdateAsync(item, ct) ? NoContent() : NotFound();
    }

    private async Task<IActionResult> Delete<T>(int id, IRepository<T> repository, CancellationToken ct, int? forcedShopId) where T : NamedEntity
    {
        var existing = await repository.GetByIdAsync(id, ct);
        if (existing is null) return NotFound();
        if (existing is IShopScopedEntity scoped && forcedShopId is int owned && scoped.ShopId != owned) return Forbid();
        return await repository.DeleteAsync(id, ct) ? NoContent() : NotFound();
    }

    private static void NormalizeCountryFields(Country item)
    {
        item.PhoneCode = string.IsNullOrWhiteSpace(item.PhoneCode) ? null : item.PhoneCode.Trim();
        item.CurrencyCode = string.IsNullOrWhiteSpace(item.CurrencyCode) ? null : item.CurrencyCode.Trim().ToUpperInvariant();
    }
}
