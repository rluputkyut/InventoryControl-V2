namespace InventoryControl.Application.Abstractions;

public interface ICurrentUser
{
    string? Id { get; }
    string? UserName { get; }
    bool IsAuthenticated { get; }
    IReadOnlyList<string> Roles { get; }

    /// <summary>Shop the authenticated user belongs to, or null for platform-level users (Admin).</summary>
    int? ShopId { get; }
}