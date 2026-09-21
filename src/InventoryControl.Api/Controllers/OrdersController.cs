using InventoryControl.Application.Abstractions;
using InventoryControl.Application.Contracts;
using InventoryControl.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace InventoryControl.Api.Controllers;

public sealed record ApproveOrderRequest(string? Note);
public sealed record RejectOrderRequest(string Reason);

/// <summary>
/// Customer orders placed through the mobile portal. Customers create orders and upload a
/// bank-transfer screenshot; admins review the proof, approve (which posts the Sale and deducts
/// stock), and mark the order as delivered.
/// </summary>
[ApiController]
[Route("api/orders")]
[Authorize]
public sealed class OrdersController(ICustomerOrderService orders, IOrderProofStore proofStore, ICurrentUser currentUser) : ControllerBase
{
    private const int MaxProofBytes = 2 * 1024 * 1024;
    private static readonly HashSet<string> AllowedProofTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif",
    };

    /// <summary>Returns the current customer's orders, newest first.</summary>
    [HttpGet("my")]
    [Authorize(Roles = Roles.Customer)]
    public Task<IReadOnlyList<CustomerOrder>> MyOrders(CancellationToken cancellationToken) =>
        orders.ListForCustomerAsync(cancellationToken);

    /// <summary>Returns all orders. ShopAdmins see their own shop; platform Admins see every order.</summary>
    [HttpGet("admin")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public Task<IReadOnlyList<CustomerOrder>> AdminOrders(CancellationToken cancellationToken) =>
        orders.ListAsync(AdminScope(), cancellationToken);

    /// <summary>Returns one order. Customers see their own; admins see their shop (or all).</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<CustomerOrder>> Get(int id, CancellationToken cancellationToken)
    {
        var order = await orders.GetAsync(id, cancellationToken);
        return order is null ? NotFound() : order;
    }

    /// <summary>Places an order from the mobile cart before any payment proof is uploaded.</summary>
    [HttpPost]
    [Authorize(Roles = Roles.Customer)]
    public async Task<ActionResult<CustomerOrder>> Create(CreateOrderRequest request, CancellationToken cancellationToken)
    {
        var (order, message) = await orders.CreateAsync(request, cancellationToken);
        if (order is null) return BadRequest(new { message });
        return CreatedAtAction(nameof(Get), new { id = order.Id }, order);
    }

    /// <summary>Uploads the bank-transfer screenshot for a pending order.</summary>
    [HttpPut("{id:int}/proof")]
    public async Task<IActionResult> UploadProof(int id, IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "A proof image file is required." });
        if (file.Length > MaxProofBytes) return BadRequest(new { message = "Proof image must be 2 MB or smaller." });
        if (!AllowedProofTypes.Contains(file.ContentType)) return BadRequest(new { message = "Only JPEG, PNG, WebP, or GIF images are supported." });

        var order = await orders.GetAsync(id, cancellationToken);
        if (order is null) return NotFound();
        if (order.Status != CustomerOrderStatus.PendingApproval)
            return BadRequest(new { message = "Payment proof can only be uploaded while the order is pending approval." });

        var path = await proofStore.SaveAsync(file.OpenReadStream(), file.ContentType, cancellationToken);
        var result = await orders.SetPaymentProofAsync(id, path, cancellationToken);
        if (!result.Succeeded)
        {
            await proofStore.DeleteAsync(path, cancellationToken);
            return BadRequest(new { message = result.Message });
        }
        order.PaymentProofPath = path;
        return Ok(order);
    }

    /// <summary>Approves an order: posts the Sale document, deducts stock, and moves it forward.</summary>
    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public async Task<IActionResult> Approve(int id, ApproveOrderRequest request, CancellationToken cancellationToken)
    {
        var result = await orders.ApproveAsync(id, request?.Note, cancellationToken);
        return result.Succeeded ? Ok(new { message = result.Message }) : BadRequest(new { message = result.Message });
    }

    /// <summary>Rejects a pending order, leaving stock untouched.</summary>
    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public async Task<IActionResult> Reject(int id, RejectOrderRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason)) return BadRequest(new { message = "A rejection reason is required." });
        var result = await orders.RejectAsync(id, request.Reason, cancellationToken);
        return result.Succeeded ? Ok(new { message = result.Message }) : BadRequest(new { message = result.Message });
    }

    /// <summary>Marks an approved order as delivered.</summary>
    [HttpPost("{id:int}/deliver")]
    [Authorize(Roles = Roles.ShopAdminOrAdmin)]
    public async Task<IActionResult> Deliver(int id, CancellationToken cancellationToken)
    {
        var result = await orders.DeliverAsync(id, cancellationToken);
        return result.Succeeded ? Ok(new { message = result.Message }) : BadRequest(new { message = result.Message });
    }

    /// <summary>Streams the payment-proof image to the order owner or an admin.</summary>
    [HttpGet("{id:int}/proof")]
    public async Task<ActionResult> Proof(int id, CancellationToken cancellationToken)
    {
        var order = await orders.GetAsync(id, cancellationToken);
        if (order is null || order.PaymentProofPath is null) return NotFound();
        var stream = await proofStore.OpenAsync(order.PaymentProofPath, cancellationToken);
        if (stream is null) return NotFound();
        return File(stream, ContentTypeFor(order.PaymentProofPath));
    }

    private int? AdminScope() => User.IsInRole(Roles.ShopAdmin) ? currentUser.ShopId : null;

    private static string ContentTypeFor(string imagePath) =>
        new FileExtensionContentTypeProvider().TryGetContentType(imagePath, out var contentType)
            ? contentType
            : "application/octet-stream";
}