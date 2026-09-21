using System.Security.Claims;
using InventoryControl.Application.Abstractions;
using InventoryControl.Application.Contracts;
using InventoryControl.Domain;
using InventoryControl.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InventoryControl.Infrastructure.Services;

public sealed class UserService(UserManager<IdentityUser> userManager, InventoryDbContext db) : IUserService
{
    public async Task<IReadOnlyList<UserDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        var users = await userManager.Users.OrderBy(x => x.UserName).ToListAsync(cancellationToken);
        var result = new List<UserDto>();
        foreach (var user in users) result.Add(await ToDtoAsync(user, cancellationToken));
        return result;
    }

    public async Task<UserDto?> GetAsync(string id, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(id);
        return user is null ? null : await ToDtoAsync(user, cancellationToken);
    }

    public async Task<MutationResult> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.UserName)) return new(false, "Username is required.");
        if (!request.Roles.All(Roles.All.Contains)) return new(false, "Unknown role specified.");
        if (request.ShopId is { } shopId && !await db.Shops.AnyAsync(x => x.Id == shopId, cancellationToken))
            return new(false, "Shop does not exist.");
        var user = new IdentityUser { UserName = request.UserName.Trim(), Email = request.Email };
        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded) return new(false, string.Join("; ", result.Errors.Select(e => e.Description)));
        if (await userManager.AddToRolesAsync(user, request.Roles) is { } assigned && !assigned.Succeeded)
        {
            await userManager.DeleteAsync(user);
            return new(false, string.Join("; ", assigned.Errors.Select(e => e.Description)));
        }
        if (request.ShopId is { } assignedShopId)
        {
            var claimResult = await userManager.AddClaimAsync(user, new Claim(ShopClaims.ShopIdClaimType, assignedShopId.ToString()));
            if (!claimResult.Succeeded)
            {
                await userManager.DeleteAsync(user);
                return new(false, string.Join("; ", claimResult.Errors.Select(e => e.Description)));
            }
        }
        return new(true, "User created.", await ToDtoAsync(user, cancellationToken));
    }

    public async Task<MutationResult> SetRolesAsync(string id, SetRolesRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null) return new(false, "User not found.");
        if (!request.Roles.All(Roles.All.Contains)) return new(false, "Unknown role specified.");
        if (request.ShopId is { } shopId && !await db.Shops.AnyAsync(x => x.Id == shopId, cancellationToken))
            return new(false, "Shop does not exist.");

        var current = await userManager.GetRolesAsync(user);
        var remove = await userManager.RemoveFromRolesAsync(user, current.Where(x => !request.Roles.Contains(x)));
        if (!remove.Succeeded) return new(false, string.Join("; ", remove.Errors.Select(e => e.Description)));
        var add = await userManager.AddToRolesAsync(user, request.Roles.Where(x => !current.Contains(x)));
        if (!add.Succeeded) return new(false, string.Join("; ", add.Errors.Select(e => e.Description)));

        var claims = await userManager.GetClaimsAsync(user);
        var shopClaim = claims.FirstOrDefault(x => x.Type == ShopClaims.ShopIdClaimType);
        if (shopClaim is not null)
        {
            var removedClaim = await userManager.RemoveClaimAsync(user, shopClaim);
            if (!removedClaim.Succeeded) return new(false, string.Join("; ", removedClaim.Errors.Select(e => e.Description)));
        }
        if (request.ShopId is { } assignedShopId)
        {
            var addedClaim = await userManager.AddClaimAsync(user, new Claim(ShopClaims.ShopIdClaimType, assignedShopId.ToString()));
            if (!addedClaim.Succeeded) return new(false, string.Join("; ", addedClaim.Errors.Select(e => e.Description)));
        }
        return new(true, "Roles updated.", await ToDtoAsync(user, cancellationToken));
    }

    public async Task<MutationResult> SetActiveAsync(string id, bool isActive, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null) return new(false, "User not found.");
        var result = await userManager.SetLockoutEndDateAsync(user, isActive ? null : DateTimeOffset.MaxValue);
        if (!result.Succeeded) return new(false, string.Join("; ", result.Errors.Select(e => e.Description)));
        return new(true, "Active state updated.", await ToDtoAsync(user, cancellationToken));
    }

    public async Task<MutationResult> ResetPasswordAsync(string id, ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null) return new(false, "User not found.");
        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var result = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
        if (!result.Succeeded) return new(false, string.Join("; ", result.Errors.Select(e => e.Description)));
        return new(true, "Password reset.", await ToDtoAsync(user, cancellationToken));
    }

    public async Task<MutationResult> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null) return new(false, "User not found.");
        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded) return new(false, string.Join("; ", result.Errors.Select(e => e.Description)));
        return new(true, "User deleted.");
    }

    private async Task<UserDto> ToDtoAsync(IdentityUser user, CancellationToken cancellationToken)
    {
        var roles = await userManager.GetRolesAsync(user);
        var claims = await userManager.GetClaimsAsync(user);
        int? shopId = int.TryParse(claims.FirstOrDefault(x => x.Type == ShopClaims.ShopIdClaimType)?.Value, out var parsed) ? parsed : null;
        var profile = await db.CustomerProfiles.AsNoTracking()
            .Where(x => x.UserId == user.Id)
            .Select(x => new { x.Name, x.Address })
            .FirstOrDefaultAsync(cancellationToken);
        return new(user.Id, user.UserName ?? string.Empty, user.Email, IsActive(user), roles.ToArray(), shopId, user.PhoneNumber, profile?.Address, profile?.Name);
    }

    public static bool IsActive(IdentityUser user) =>
        !user.LockoutEnabled || user.LockoutEnd is null || user.LockoutEnd <= DateTimeOffset.UtcNow;
}
