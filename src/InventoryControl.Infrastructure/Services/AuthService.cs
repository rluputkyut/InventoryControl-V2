using System.Security.Claims;
using InventoryControl.Application.Abstractions;
using InventoryControl.Application.Contracts;
using InventoryControl.Domain;
using InventoryControl.Infrastructure.Persistence;
using InventoryControl.Infrastructure.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace InventoryControl.Infrastructure.Services;

public sealed class AuthService(
    UserManager<IdentityUser> userManager,
    InventoryDbContext db,
    TokenService tokenService,
    IOptions<JwtOptions> jwtOptions,
    ICurrentUser currentUser) : IAuthService
{
    private readonly JwtOptions _jwt = jwtOptions.Value;

    public async Task<AuthResult?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByNameAsync(request.UserName);
        if (user is null) return null;
        if (!await userManager.CheckPasswordAsync(user, request.Password)) return null;
        if (await userManager.IsLockedOutAsync(user)) return null;
        return await IssueAsync(user, cancellationToken);
    }

    public async Task<UserDto?> MeAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(currentUser.Id)) return null;
        var user = await userManager.FindByIdAsync(currentUser.Id);
        if (user is null) return null;
        return await ToDtoAsync(user, cancellationToken);
    }

    /// <summary>Updates the currently signed-in user's own profile (email and phone number).</summary>
    public async Task<UserDto?> UpdateProfileAsync(UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(currentUser.Id)) return null;
        var user = await userManager.FindByIdAsync(currentUser.Id);
        if (user is null || !UserService.IsActive(user)) return null;

        var email = request.Email?.Trim();
        if (string.IsNullOrEmpty(email)) email = null;
        if (email is not null && !string.Equals(email, user.Email, StringComparison.OrdinalIgnoreCase))
            await userManager.SetEmailAsync(user, email);

        var phone = request.PhoneNumber?.Trim();
        if (string.IsNullOrEmpty(phone)) phone = null;
        if (phone != user.PhoneNumber) user.PhoneNumber = phone;

        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name)) name = null;

        var address = request.Address?.Trim();
        if (string.IsNullOrEmpty(address)) address = null;
        var profile = await db.CustomerProfiles.SingleOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);
        if (profile is null)
        {
            db.CustomerProfiles.Add(new CustomerProfile { UserId = user.Id, Name = name ?? user.UserName ?? string.Empty, Address = address });
        }
        else
        {
            if (name is not null && profile.Name != name) profile.Name = name;
            if (profile.Address != address) profile.Address = address;
        }

        await userManager.UpdateAsync(user);
        await db.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(user, cancellationToken);
    }

    /// <summary>Creates a new customer account, links it to the default shop, and logs the user in.</summary>
    public async Task<AuthResult?> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var userName = request.UserName?.Trim();
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(request.Password)) return null;
        if (await userManager.FindByNameAsync(userName) is not null) return null;

        var user = new IdentityUser
        {
            UserName = userName,
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            EmailConfirmed = true
        };
        var createResult = await userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded) return null;
        var roleResult = await userManager.AddToRoleAsync(user, Roles.Customer);
        if (!roleResult.Succeeded) { await userManager.DeleteAsync(user); return null; }

        var shopId = await db.Shops.OrderBy(x => x.Id).Select(x => (int?)x.Id).FirstOrDefaultAsync(cancellationToken);
        if (shopId is not null)
        {
            var claimResult = await userManager.AddClaimAsync(user, new Claim(ShopClaims.ShopIdClaimType, shopId.Value.ToString()));
            if (!claimResult.Succeeded) { await userManager.DeleteAsync(user); return null; }
        }
        await db.CustomerProfiles.AddAsync(new CustomerProfile
        {
            UserId = user.Id,
            Name = name,
            Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim()
        }, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return await IssueAsync(user, cancellationToken);
    }

    public async Task<AuthResult?> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var hash = tokenService.HashToken(refreshToken);
        var stored = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);
        if (stored is null || stored.RevokedAtUtc is not null || stored.ExpiresAtUtc <= DateTime.UtcNow) return null;

        var user = await userManager.FindByIdAsync(stored.UserId);
        if (user is null) return null;

        stored.RevokedAtUtc = DateTime.UtcNow;
        stored.RevokedReason = "Replaced by rotation";
        return await IssueAsync(user, cancellationToken);
    }

    public async Task<bool> LogoutAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var hash = tokenService.HashToken(refreshToken);
        var stored = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);
        if (stored is null || stored.RevokedAtUtc is not null) return false;
        stored.RevokedAtUtc = DateTime.UtcNow;
        stored.RevokedReason = "Logged out";
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<AuthResult> IssueAsync(IdentityUser user, CancellationToken cancellationToken)
    {
        var roles = await userManager.GetRolesAsync(user);
        var shopId = await GetShopIdAsync(user, cancellationToken);
        var refreshToken = tokenService.CreateRefreshToken();
        var now = DateTime.UtcNow;
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenService.HashToken(refreshToken),
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddDays(_jwt.RefreshTokenDays)
        });
        await db.SaveChangesAsync(cancellationToken);
        return new AuthResult(
            tokenService.CreateAccessToken(user, roles, shopId),
            refreshToken,
            _jwt.AccessTokenMinutes * 60,
            await ToDtoAsync(user, userRoles: roles, shopId, cancellationToken));
    }

    private async Task<int?> GetShopIdAsync(IdentityUser user, CancellationToken cancellationToken)
    {
        var claims = await userManager.GetClaimsAsync(user);
        var value = claims.FirstOrDefault(x => x.Type == ShopClaims.ShopIdClaimType)?.Value;
        return int.TryParse(value, out var id) ? id : null;
    }

    private Task<UserDto> ToDtoAsync(IdentityUser user, CancellationToken cancellationToken) =>
        ToDtoAsync(user, userRoles: null, shopId: null, cancellationToken);

    private async Task<UserDto> ToDtoAsync(IdentityUser user, IList<string>? userRoles, int? shopId, CancellationToken cancellationToken)
    {
        var roles = userRoles ?? await userManager.GetRolesAsync(user);
        var effectiveShopId = shopId ?? await GetShopIdAsync(user, cancellationToken);
        var profile = await db.CustomerProfiles.AsNoTracking()
            .Where(x => x.UserId == user.Id)
            .Select(x => new { x.Name, x.Address })
            .FirstOrDefaultAsync(cancellationToken);
        return new UserDto(user.Id, user.UserName ?? string.Empty, user.Email, UserService.IsActive(user), roles.ToArray(), effectiveShopId, user.PhoneNumber, profile?.Address, profile?.Name);
    }
}