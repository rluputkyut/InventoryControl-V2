using InventoryControl.Application.Contracts;
using InventoryControl.Application.Services;
using InventoryControl.Domain;
using Xunit;

namespace InventoryControl.Tests.Application;

public class InventoryServiceTests
{
    private const int Warehouse = 1;
    private const int OtherWarehouse = 2;
    private const int Product = 100;

    private readonly FakeInventoryRepository _repo = new();
    private readonly InventoryService _service;

    public InventoryServiceTests() =>
        _service = new InventoryService(_repo, new FakeCurrentUser("user-1", [Roles.Operator]));

    private static StockDocumentRequest Request(int warehouseId = Warehouse, params StockLineRequest[] lines) =>
        new(warehouseId, lines, "REF-1", null);

    private static StockLineRequest Line(decimal quantity, decimal unitPrice = 0) => new(Product, quantity, unitPrice);

    [Fact]
    public async Task Purchase_PositiveQuantity_AddsStockAndCreatesDocument()
    {
        _repo.ProductsAndWarehousesExist = true;
        var result = await _service.PurchaseAsync(Request(Warehouse, Line(10, 5m)));

        Assert.True(result.Succeeded);
        Assert.Equal("Purchase posted.", result.Message);
        Assert.Equal(10m, _repo.Quantity(Product, Warehouse));
        Assert.Single(_repo.Documents);
        Assert.Equal(StockDocumentType.Purchase, Assert.Single(_repo.Documents).Type);
        Assert.Equal(50m, Assert.Single(_repo.Documents).TotalAmount);
        Assert.Single(_repo.Transactions);
        Assert.Equal(InventoryTransactionType.Purchase, Assert.Single(_repo.Transactions).Type);
        Assert.Equal(1, _repo.SaveChangesCalls);
    }

    [Fact]
    public async Task Purchase_EmptyLines_IsRejected() =>
        Assert.False((await _service.PurchaseAsync(Request(Warehouse))).Succeeded);

    [Fact]
    public async Task Purchase_ZeroQuantity_IsRejected() =>
        Assert.False((await _service.PurchaseAsync(Request(Warehouse, Line(0)))).Succeeded);

    [Fact]
    public async Task Purchase_NegativeQuantity_IsRejected() =>
        Assert.False((await _service.PurchaseAsync(Request(Warehouse, Line(-5)))).Succeeded);

    [Fact]
    public async Task Purchase_NegativeUnitPrice_IsRejected() =>
        Assert.False((await _service.PurchaseAsync(Request(Warehouse, Line(5, -1m)))).Succeeded);

    [Fact]
    public async Task Purchase_MissingProductOrWarehouse_IsRejected()
    {
        _repo.ProductsAndWarehousesExist = false;
        var result = await _service.PurchaseAsync(Request(Warehouse, Line(5)));
        Assert.False(result.Succeeded);
        Assert.Equal("Product or warehouse was not found.", result.Message);
        Assert.Empty(_repo.Documents);
    }

    [Fact]
    public async Task Sale_WithEnoughStock_DecreasesBalance()
    {
        _repo.SeedBalance(Product, Warehouse, 20m);
        var result = await _service.SaleAsync(Request(Warehouse, Line(6, 3m)));

        Assert.True(result.Succeeded);
        Assert.Equal("Sale posted.", result.Message);
        Assert.Equal(14m, _repo.Quantity(Product, Warehouse));
        Assert.Equal(InventoryTransactionType.Sale, Assert.Single(_repo.Transactions).Type);
    }

    [Fact]
    public async Task Sale_WithInsufficientStock_IsRejected()
    {
        _repo.SeedBalance(Product, Warehouse, 2m);
        var result = await _service.SaleAsync(Request(Warehouse, Line(5)));
        Assert.False(result.Succeeded);
        Assert.Contains("Insufficient stock", result.Message);
        Assert.Empty(_repo.Documents);
    }

    [Fact]
    public async Task Transfer_MovesStockBetweenWarehouses()
    {
        _repo.SeedBalance(Product, Warehouse, 10m);
        _repo.SeedBalance(Product, OtherWarehouse, 0m);
        var request = new TransferDocumentRequest(Warehouse, OtherWarehouse, [Line(4)], "T-1", null);

        var result = await _service.TransferAsync(request);

        Assert.True(result.Succeeded);
        Assert.Contains("Transfer", result.Message);
        Assert.Equal(6m, _repo.Quantity(Product, Warehouse));
        Assert.Equal(4m, _repo.Quantity(Product, OtherWarehouse));
        Assert.Equal(2, _repo.Transactions.Count);
        Assert.Equal(new[] { InventoryTransactionType.TransferOut, InventoryTransactionType.TransferIn },
            _repo.Transactions.Select(t => t.Type).ToArray());
        Assert.Single(_repo.Documents);
        Assert.Equal(StockDocumentType.Transfer, Assert.Single(_repo.Documents).Type);
    }

    [Fact]
    public async Task Transfer_SameWarehouse_IsRejected()
    {
        var request = new TransferDocumentRequest(Warehouse, Warehouse, [Line(4)], "T-1", null);
        var result = await _service.TransferAsync(request);
        Assert.False(result.Succeeded);
        Assert.Empty(_repo.Documents);
    }

    [Fact]
    public async Task Transfer_InsufficientSourceStock_IsRejected()
    {
        _repo.SeedBalance(Product, Warehouse, 1m);
        _repo.SeedBalance(Product, OtherWarehouse, 0m);
        var request = new TransferDocumentRequest(Warehouse, OtherWarehouse, [Line(4)], "T-1", null);

        var result = await _service.TransferAsync(request);

        Assert.False(result.Succeeded);
        Assert.Contains("Insufficient stock in source warehouse", result.Message);
        Assert.Empty(_repo.Documents);
    }

    [Fact]
    public async Task Purchase_DocumentCapturesPostingUser()
    {
        await _service.PurchaseAsync(Request(Warehouse, Line(1, 2m)));
        Assert.Equal("user-1", Assert.Single(_repo.Documents).UserId);
    }
}