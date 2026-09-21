using InventoryControl.Application.Abstractions;
using InventoryControl.Application.Contracts;
using InventoryControl.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryControl.Api.Controllers;

/// <summary>Posts invoice-style stock documents and retrieves on-hand stock.</summary>
[ApiController]
[Route("api/inventory")]
[Authorize]
public sealed class InventoryController(IInventoryService inventoryService) : ControllerBase
{
    /// <summary>Returns current stock balances, optionally limited to one warehouse.</summary>
    [HttpGet("balances")]
    public Task<IReadOnlyList<InventoryBalance>> Balances([FromQuery] int? warehouseId, CancellationToken cancellationToken) =>
        inventoryService.GetBalancesAsync(warehouseId, cancellationToken);

    /// <summary>Returns the stock movement audit trail, newest first. Filter with warehouseId or documentId.</summary>
    [HttpGet("transactions")]
    public Task<IReadOnlyList<InventoryTransaction>> Transactions([FromQuery] int? warehouseId, [FromQuery] int? documentId, CancellationToken cancellationToken) =>
        inventoryService.GetTransactionsAsync(warehouseId, documentId, cancellationToken);

    /// <summary>Returns posted purchase invoices, newest first.</summary>
    [HttpGet("purchases")]
    public Task<IReadOnlyList<StockDocumentDto>> Purchases(CancellationToken cancellationToken) =>
        inventoryService.GetDocumentsAsync(StockDocumentType.Purchase, cancellationToken);

    /// <summary>Returns one purchase invoice with its product lines.</summary>
    [HttpGet("purchases/{id:int}")]
    public Task<ActionResult<StockDocumentDto>> Purchase(int id, CancellationToken cancellationToken) =>
        GetDocument(id, StockDocumentType.Purchase, cancellationToken);

    /// <summary>Posts a purchase invoice with one or more product lines and increases stock. Customers place their orders here.</summary>
    [HttpPost("purchases")]
    [Authorize(Roles = Roles.Admin + "," + Roles.Operator + "," + Roles.Customer)]
    public async Task<ActionResult> Purchase(StockDocumentRequest request, CancellationToken cancellationToken) =>
        ToActionResult(await inventoryService.PurchaseAsync(request, cancellationToken));

    /// <summary>Returns posted sale invoices, newest first.</summary>
    [HttpGet("sales")]
    public Task<IReadOnlyList<StockDocumentDto>> Sales(CancellationToken cancellationToken) =>
        inventoryService.GetDocumentsAsync(StockDocumentType.Sale, cancellationToken);

    /// <summary>Returns one sale invoice with its product lines.</summary>
    [HttpGet("sales/{id:int}")]
    public Task<ActionResult<StockDocumentDto>> Sale(int id, CancellationToken cancellationToken) =>
        GetDocument(id, StockDocumentType.Sale, cancellationToken);

    /// <summary>Posts a sale invoice with one or more product lines when sufficient stock is available for every line.</summary>
    [HttpPost("sales")]
    [Authorize(Roles = Roles.Admin + "," + Roles.Operator)]
    public async Task<ActionResult> Sale(StockDocumentRequest request, CancellationToken cancellationToken) =>
        ToActionResult(await inventoryService.SaleAsync(request, cancellationToken));

    /// <summary>Returns posted warehouse transfers, newest first.</summary>
    [HttpGet("transfers")]
    public Task<IReadOnlyList<StockDocumentDto>> Transfers(CancellationToken cancellationToken) =>
        inventoryService.GetDocumentsAsync(StockDocumentType.Transfer, cancellationToken);

    /// <summary>Returns one warehouse transfer with its product lines.</summary>
    [HttpGet("transfers/{id:int}")]
    public Task<ActionResult<StockDocumentDto>> Transfer(int id, CancellationToken cancellationToken) =>
        GetDocument(id, StockDocumentType.Transfer, cancellationToken);

    /// <summary>Moves multiple products between warehouses as one document. All lines are rejected if any product has insufficient source stock.</summary>
    [HttpPost("transfers")]
    [Authorize(Roles = Roles.Admin + "," + Roles.Operator)]
    public async Task<ActionResult> Transfer(TransferDocumentRequest request, CancellationToken cancellationToken) =>
        ToActionResult(await inventoryService.TransferAsync(request, cancellationToken));

    private async Task<ActionResult<StockDocumentDto>> GetDocument(int id, StockDocumentType type, CancellationToken cancellationToken)
    {
        var document = await inventoryService.GetDocumentAsync(id, type, cancellationToken);
        return document is null ? NotFound() : document;
    }

    private ActionResult ToActionResult(InventoryOperationResult result) =>
        result.Succeeded ? Ok(result.Document) : BadRequest(new { message = result.Message });
}
