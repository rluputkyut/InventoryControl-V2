using System.Security.Claims;
using InventoryControl.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InventoryControl.Infrastructure.Persistence;

public static class UserSeeder
{
    public static async Task SeedAsync(
        UserManager<IdentityUser> users, RoleManager<IdentityRole> roles, InventoryDbContext db, CancellationToken cancellationToken = default)
    {
        foreach (var role in Roles.All)
        {
            if (!await roles.RoleExistsAsync(role))
                await roles.CreateAsync(new IdentityRole(role));
        }

        var mainShopId = await db.Shops.Where(x => x.Code == "MAIN").Select(x => (int?)x.Id).SingleOrDefaultAsync(cancellationToken);

        // Platform admin (no shop).
        await EnsureAsync(users, "admin@inventory.local", Roles.Admin, "Admin@12345", shopId: null);
        // Shop staff and customers belong to the default shop.
        await EnsureAsync(users, "operator@inventory.local", Roles.Operator, "Operator@12345", shopId: mainShopId);
        await EnsureAsync(users, "customer@inventory.local", Roles.Customer, "Customer@12345", shopId: mainShopId);
    }

    private static async Task EnsureAsync(UserManager<IdentityUser> users, string userName, string role, string password, int? shopId)
    {
        var user = await users.FindByNameAsync(userName);
        if (user is null)
        {
            user = new IdentityUser { UserName = userName, Email = userName, EmailConfirmed = true };
            var result = await users.CreateAsync(user, password);
            if (result.Succeeded) await users.AddToRoleAsync(user, role);
        }
        if (shopId.HasValue)
        {
            var claims = await users.GetClaimsAsync(user);
            if (!claims.Any(x => x.Type == ShopClaims.ShopIdClaimType))
                await users.AddClaimAsync(user, new Claim(ShopClaims.ShopIdClaimType, shopId.Value.ToString()));
        }
    }
}