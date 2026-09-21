using InventoryControl.Application.Abstractions;
using System.Security.Claims;
using InventoryControl.Domain;

namespace InventoryControl.Api.Security;

public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string? Id => accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
    public string? UserName => accessor.HttpContext?.User.FindFirstValue(ClaimTypes.Name);
    public bool IsAuthenticated => accessor.HttpContext?.User.Identity?.IsAuthenticated == true;
    public IReadOnlyList<string> Roles =>
        accessor.HttpContext?.User.FindAll(ClaimTypes.Role).Select(x => x.Value).ToList() ?? [];

    public int? ShopId
    {
        get
        {
            var value = accessor.HttpContext?.User.FindFirstValue(ShopClaims.ShopIdClaimType);
            return int.TryParse(value, out var shopId) ? shopId : null;
        }
    }
}
