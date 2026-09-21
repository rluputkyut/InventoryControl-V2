using InventoryControl.Domain;
using Xunit;

namespace InventoryControl.Tests.Domain;

public class RolesAndShopClaimsTests
{
    [Theory]
    [InlineData("ShopAdmin", true)]
    [InlineData("Admin", false)]
    [InlineData("Operator", false)]
    [InlineData("Viewer", false)]
    [InlineData("Customer", false)]
    public void IsShopScoped_OnlyTrueForShopAdmin(string role, bool expected) =>
        Assert.Equal(expected, Roles.IsShopScoped([role]));

    [Fact]
    public void IsShopScoped_MultipleRoles_WithShopAdmin_IsTrue() =>
        Assert.True(Roles.IsShopScoped(["Viewer", "ShopAdmin", "Customer"]));

    [Fact]
    public void All_ContainsEveryAssignableRole() =>
        Assert.Equal(["Admin", "Operator", "Viewer", "Customer", "ShopAdmin"], Roles.All);

    [Theory]
    [InlineData("Admin")]
    [InlineData("Operator")]
    [InlineData("Viewer")]
    [InlineData("Customer")]
    [InlineData("ShopAdmin")]
    public void All_RolesAreValid(string role) => Assert.Contains(role, Roles.All);

    [Fact]
    public void ShopAdminOrAdmin_IsCommaJoinedComposite() =>
        Assert.Equal("ShopAdmin,Admin", Roles.ShopAdminOrAdmin);

    [Fact]
    public void ShopClaims_ClaimValue_NullYieldsEmpty() =>
        Assert.Equal(string.Empty, ShopClaims.ClaimValue(null));

    [Fact]
    public void ShopClaims_ClaimValue_ValueToString() =>
        Assert.Equal("42", ShopClaims.ClaimValue(42));
}