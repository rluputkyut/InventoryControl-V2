using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace InventoryControl.Api.Controllers;

/// <summary>
/// Global delivery and payment method catalogue (Admin-managed). Delivery methods are global reference
/// data; payment methods belong to one delivery method; shops opt into deliveries via shop links.
/// Logo streams are anonymous so customers can render badges on checkout.
/// </summary>
[ApiController]
[Route("api/delivery-methods")]
[Authorize(Roles = Roles.Admin)]
public sealed class DeliveryMethodsController(IDeliveryMethodRepository deliveries, IReferenceImageService images) : ControllerBase
{
    private const int MaxLogoBytes = 2 * 1024 * 1024;
    private static readonly HashSet<string> AllowedLogoTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif",
    };

    [HttpGet]
    public Task<IReadOnlyList<DeliveryMethod>> List(CancellationToken cancellationToken) => deliveries.ListDeliveryMethodsAsync(cancellationToken);

    [HttpPost]
    public async Task<ActionResult<DeliveryMethod>> Create(DeliveryMethod item, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(item.Name)) return BadRequest("Name is required.");
        item.Name = item.Name.Trim();
        item.LogoPath = null;
        return Ok(await deliveries.AddDeliveryMethodAsync(item, cancellationToken));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, DeliveryMethod item, CancellationToken cancellationToken)
    {
        var existing = await deliveries.GetDeliveryMethodAsync(id, cancellationToken);
        if (existing is null) return NotFound();
        if (id != item.Id) return BadRequest("Route and body IDs must match.");
        if (string.IsNullOrWhiteSpace(item.Name)) return BadRequest("Name is required.");
        item.Name = item.Name.Trim();
        item.LogoPath = existing.LogoPath;
        return await deliveries.UpdateDeliveryMethodAsync(item, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var existing = await deliveries.GetDeliveryMethodAsync(id, cancellationToken);
        if (existing is null) return NotFound();
        if (!await deliveries.DeleteDeliveryMethodAsync(id, cancellationToken)) return NotFound();
        if (existing.LogoPath is not null) await images.DeleteAsync(existing.LogoPath, cancellationToken);
        return NoContent();
    }

    /// <summary>Uploads or replaces the delivery method's logo (Admin).</summary>
    [HttpPost("{id:int}/logo")]
    public async Task<IActionResult> UploadLogo(int id, IFormFile file, CancellationToken cancellationToken)
    {
        var delivery = await deliveries.GetDeliveryMethodAsync(id, cancellationToken);
        if (delivery is null) return NotFound();
        if (file is null || file.Length == 0) return BadRequest("A logo image file is required.");
        if (file.Length > MaxLogoBytes) return BadRequest("Logo image must be 2 MB or smaller.");
        if (!AllowedLogoTypes.Contains(file.ContentType)) return BadRequest("Only JPEG, PNG, WebP, or GIF images are supported.");

        var path = await images.SaveAsync(id, file.OpenReadStream(), file.ContentType, cancellationToken);
        var previous = delivery.LogoPath;
        delivery.LogoPath = path;
        await deliveries.UpdateDeliveryMethodAsync(delivery, cancellationToken);
        if (previous is not null) await images.DeleteAsync(previous, cancellationToken);
        return Ok(delivery);
    }

    /// <summary>Streams the delivery method's logo image (anonymous).</summary>
    [HttpGet("{id:int}/logo")]
    [AllowAnonymous]
    public async Task<ActionResult> GetLogo(int id, CancellationToken cancellationToken)
    {
        var delivery = await deliveries.GetDeliveryMethodAsync(id, cancellationToken);
        if (delivery is null || string.IsNullOrEmpty(delivery.LogoPath)) return NotFound();
        var stream = await images.OpenAsync(delivery.LogoPath, cancellationToken);
        if (stream is null) return NotFound();
        return File(stream, ContentTypeFor(delivery.LogoPath), enableRangeProcessing: true);
    }

    [HttpGet("{deliveryId:int}/payments")]
    public Task<IReadOnlyList<PaymentMethod>> ListPayments(int deliveryId, CancellationToken cancellationToken) =>
        deliveries.ListPaymentsAsync(deliveryId, cancellationToken);

    [HttpPost("{deliveryId:int}/payments")]
    public async Task<ActionResult<PaymentMethod>> CreatePayment(int deliveryId, PaymentMethod item, CancellationToken cancellationToken)
    {
        if (await deliveries.GetDeliveryMethodAsync(deliveryId, cancellationToken) is null) return NotFound();
        if (string.IsNullOrWhiteSpace(item.Name)) return BadRequest("Name is required.");
        item.Name = item.Name.Trim();
        item.DeliveryMethodId = deliveryId;
        item.LogoPath = null;
        return Ok(await deliveries.AddPaymentMethodAsync(item, cancellationToken));
    }

    [HttpPut("payments/{paymentId:int}")]
    public async Task<IActionResult> UpdatePayment(int paymentId, PaymentMethod item, CancellationToken cancellationToken)
    {
        var existing = await deliveries.GetPaymentMethodAsync(paymentId, cancellationToken);
        if (existing is null) return NotFound();
        if (paymentId != item.Id) return BadRequest("Route and body IDs must match.");
        if (string.IsNullOrWhiteSpace(item.Name)) return BadRequest("Name is required.");
        if (await deliveries.GetDeliveryMethodAsync(item.DeliveryMethodId, cancellationToken) is null) return BadRequest("Delivery method does not exist.");
        item.Name = item.Name.Trim();
        item.LogoPath = existing.LogoPath;
        return await deliveries.UpdatePaymentMethodAsync(item, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpDelete("payments/{paymentId:int}")]
    public async Task<IActionResult> DeletePayment(int paymentId, CancellationToken cancellationToken)
    {
        var existing = await deliveries.GetPaymentMethodAsync(paymentId, cancellationToken);
        if (existing is null) return NotFound();
        if (!await deliveries.DeletePaymentMethodAsync(paymentId, cancellationToken)) return NotFound();
        if (existing.LogoPath is not null) await images.DeleteAsync(existing.LogoPath, cancellationToken);
        return NoContent();
    }

    /// <summary>Uploads or replaces the payment method's logo (Admin).</summary>
    [HttpPost("payments/{paymentId:int}/logo")]
    public async Task<IActionResult> UploadPaymentLogo(int paymentId, IFormFile file, CancellationToken cancellationToken)
    {
        var payment = await deliveries.GetPaymentMethodAsync(paymentId, cancellationToken);
        if (payment is null) return NotFound();
        if (file is null || file.Length == 0) return BadRequest("A logo image file is required.");
        if (file.Length > MaxLogoBytes) return BadRequest("Logo image must be 2 MB or smaller.");
        if (!AllowedLogoTypes.Contains(file.ContentType)) return BadRequest("Only JPEG, PNG, WebP, or GIF images are supported.");

        var path = await images.SaveAsync(paymentId, file.OpenReadStream(), file.ContentType, cancellationToken);
        var previous = payment.LogoPath;
        payment.LogoPath = path;
        await deliveries.UpdatePaymentMethodAsync(payment, cancellationToken);
        if (previous is not null) await images.DeleteAsync(previous, cancellationToken);
        return Ok(payment);
    }

    /// <summary>Streams the payment method's logo image (anonymous).</summary>
    [HttpGet("payments/{paymentId:int}/logo")]
    [AllowAnonymous]
    public async Task<ActionResult> GetPaymentLogo(int paymentId, CancellationToken cancellationToken)
    {
        var payment = await deliveries.GetPaymentMethodAsync(paymentId, cancellationToken);
        if (payment is null || string.IsNullOrEmpty(payment.LogoPath)) return NotFound();
        var stream = await images.OpenAsync(payment.LogoPath, cancellationToken);
        if (stream is null) return NotFound();
        return File(stream, ContentTypeFor(payment.LogoPath), enableRangeProcessing: true);
    }

    private static string ContentTypeFor(string imagePath) =>
        new FileExtensionContentTypeProvider().TryGetContentType(imagePath, out var contentType)
            ? contentType
            : "application/octet-stream";
}