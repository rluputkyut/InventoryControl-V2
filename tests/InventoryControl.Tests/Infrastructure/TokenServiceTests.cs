using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using InventoryControl.Domain;
using InventoryControl.Infrastructure.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Xunit;

namespace InventoryControl.Tests.Infrastructure;

public class TokenServiceTests
{
    private static TokenService NewService(out JwtOptions options)
    {
        options = new JwtOptions
        {
            Issuer = "inventory-control",
            Audience = "inventory-control-web",
            Key = "test-signing-key-with-more-than-32-characters-0000",
            AccessTokenMinutes = 15,
        };
        return new TokenService(Options.Create(options));
    }

    private static IdentityUser NewUser(string id = "user-1", string userName = "admin") =>
        new() { Id = id, UserName = userName };

    [Fact]
    public void CreateAccessToken_IncludesIdentityRoleAndShopClaims()
    {
        var service = NewService(out _);
        var token = service.CreateAccessToken(NewUser(), ["Admin", "Operator"], shopId: 7);

        var principal = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal("user-1", principal.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Contains("Admin", principal.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value));
        Assert.Contains("Operator", principal.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value));
        Assert.Equal("7", principal.Claims.First(c => c.Type == ShopClaims.ShopIdClaimType).Value);
    }

    [Fact]
    public void CreateAccessToken_ShopAdminClaim_OnlyWhenShopIdProvided()
    {
        var service = NewService(out _);

        var withShop = service.CreateAccessToken(NewUser(), ["ShopAdmin"], shopId: 3);
        Assert.Contains(new JwtSecurityTokenHandler().ReadJwtToken(withShop).Claims,
            c => c.Type == ShopClaims.ShopIdClaimType && c.Value == "3");

        var withoutShop = service.CreateAccessToken(NewUser(), ["Admin"]);
        Assert.DoesNotContain(new JwtSecurityTokenHandler().ReadJwtToken(withoutShop).Claims,
            c => c.Type == ShopClaims.ShopIdClaimType);
    }

    [Fact]
    public void CreateAccessToken_IssuesAndExpiryAreSet()
    {
        var service = NewService(out var options);
        var token = new JwtSecurityTokenHandler().ReadJwtToken(service.CreateAccessToken(NewUser(), ["Operator"]));

        Assert.Equal(options.Issuer, token.Issuer);
        Assert.Equal(options.Audience, token.Audiences.First());
        Assert.InRange(token.ValidFrom, DateTime.UtcNow.AddSeconds(-5), DateTime.UtcNow);
        Assert.Equal(TimeSpan.FromMinutes(options.AccessTokenMinutes), token.ValidTo - token.ValidFrom);
    }

    [Fact]
    public void CreateRefreshToken_ProducesDistinctHighEntropyValues()
    {
        var service = NewService(out _);
        var a = service.CreateRefreshToken();
        var b = service.CreateRefreshToken();
        Assert.NotEqual(a, b);
        Assert.Equal(64, Convert.FromBase64String(a).Length);
    }

    [Fact]
    public void HashToken_IsDeterministicAndNonReversibleFromOutput()
    {
        var service = NewService(out _);
        var one = service.HashToken("token");
        var two = service.HashToken("token");
        Assert.Equal(one, two);
        Assert.NotEqual("token", one);
    }
}