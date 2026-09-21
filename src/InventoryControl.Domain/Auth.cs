namespace InventoryControl.Domain;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Operator = "Operator";
    public const string Viewer = "Viewer";
    public const string Customer = "Customer";

    /// <summary>Manages one shop's catalog, warehouses, and master data (scoped to their shop).</summary>
    public const string ShopAdmin = "ShopAdmin";

    /// <summary>Admin or a shop admin (composite; use in [Authorize] filters).</summary>
    public const string ShopAdminOrAdmin = ShopAdmin + "," + Admin;

    /// <summary>Roles that are scoped to a specific shop (have a shop_id).</summary>
    public static bool IsShopScoped(IEnumerable<string> roles) => roles.Contains(ShopAdmin);

    /// <summary>All assignable roles.</summary>
    public static readonly IReadOnlyList<string> All = [Admin, Operator, Viewer, Customer, ShopAdmin];

    /// <summary>Roles allowed to create/edit/deactivate platform users.</summary>
    public static readonly IReadOnlyList<string> UserAdministrators = [Admin];
}

/// <summary>Shop-tenancy claim helpers. Users with a shop id belong to that shop; users without one are platform-level.</summary>
public static class ShopClaims
{
    public const string ShopIdClaimType = "shop_id";

    public static string ClaimValue(int? shopId) => shopId.HasValue ? shopId.Value.ToString() : string.Empty;
}

public sealed class RefreshToken
{
    public long Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? RevokedReason { get; set; }
}
