using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryControl.Api.Controllers;

public sealed record CheckoutOptionsDto(IReadOnlyList<CheckoutDeliveryDto> Deliveries);
public sealed record CheckoutDeliveryDto(int Id, string Name, string? LogoUrl, IReadOnlyList<CheckoutPaymentDto> Payments);
public sealed record CheckoutPaymentDto(int Id, string Name, string? LogoUrl);

/// <summary>Returns the checkout options (active delivery methods with their payment methods) for the customer's shop.</summary>
[ApiController]
[Route("api/checkout")]
[Authorize(Roles = Roles.Customer)]
public sealed class CheckoutController(IDeliveryMethodRepository deliveries, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet("options")]
    public async Task<ActionResult<CheckoutOptionsDto>> Options(CancellationToken cancellationToken)
    {
        var shopId = currentUser.ShopId;
        if (shopId is null) return BadRequest(new { message = "Your account is not linked to a shop." });

        var linked = await deliveries.ListLinkedDeliveryMethodsAsync(shopId.Value, includePayments: true, cancellationToken);
        var items = linked
            .Where(d => d.IsActive)
            .Select(d => new CheckoutDeliveryDto(
                d.Id,
                d.Name,
                d.LogoUrl,
                d.PaymentMethods.Where(p => p.IsActive).Select(p => new CheckoutPaymentDto(p.Id, p.Name, p.LogoUrl)).ToList()))
            .ToList();
        return Ok(new CheckoutOptionsDto(items));
    }
}