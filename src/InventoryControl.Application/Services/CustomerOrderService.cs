using InventoryControl.Application.Abstractions;
using InventoryControl.Application.Contracts;
using InventoryControl.Domain;

namespace InventoryControl.Application.Services;

public sealed class CustomerOrderService(
    IOrderRepository orders,
    IInventoryService inventory,
    IDeliveryMethodRepository deliveries,
    ICurrentUser currentUser) : ICustomerOrderService
{
    public Task<IReadOnlyList<CustomerOrder>> ListForCustomerAsync(CancellationToken cancellationToken = default) =>
        orders.ListForCustomerAsync(currentUser.Id ?? string.Empty, cancellationToken);

    public Task<IReadOnlyList<CustomerOrder>> ListAsync(int? shopId, CancellationToken cancellationToken = default) =>
        orders.ListAsync(shopId, cancellationToken);

    public async Task<CustomerOrder?> GetAsync(int id, CancellationToken cancellationToken = default)
    {
        var order = await orders.GetAsync(id, cancellationToken);
        if (order is null) return null;
        var isAdmin = currentUser.Roles.Contains(Roles.Admin) || currentUser.Roles.Contains(Roles.ShopAdmin);
        if (isAdmin && (currentUser.ShopId is int shopId && order.ShopId != shopId)) return null;
        if (!isAdmin && order.CustomerUserId != currentUser.Id) return null;
        return order;
    }

    public async Task<(CustomerOrder? Order, string Message)> CreateAsync(CreateOrderRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RecipientName) || string.IsNullOrWhiteSpace(request.RecipientPhone) || string.IsNullOrWhiteSpace(request.ShippingAddress))
            return (null, "Recipient name, phone, and shipping address are required.");
        if (request.Items is null || request.Items.Count == 0)
            return (null, "At least one product is required.");
        if (request.Items.Any(item => item.Quantity <= 0)) return (null, "Each line must have a positive quantity.");

        var shopId = currentUser.ShopId;
        if (shopId is null) return (null, "Your account is not linked to a shop.");
        if (request.DeliveryMethodId <= 0 || request.PaymentMethodId <= 0)
            return (null, "A delivery method and a payment method are required.");
        if (!await deliveries.IsCheckoutOptionValidAsync(shopId.Value, request.DeliveryMethodId, request.PaymentMethodId, cancellationToken))
            return (null, "The selected delivery or payment method is not available for this shop.");

        var productIds = request.Items.Select(item => item.ProductId).Distinct().ToList();
        var products = (await orders.GetProductsForShopAsync(shopId.Value, productIds, cancellationToken))
            .ToDictionary(x => x.Id);
        if (products.Count != productIds.Count) return (null, "One or more products were not found.");

        var order = new CustomerOrder
        {
            CustomerUserId = currentUser.Id ?? string.Empty,
            ShopId = shopId.Value,
            RecipientName = request.RecipientName.Trim(),
            RecipientPhone = request.RecipientPhone.Trim(),
            ShippingAddress = request.ShippingAddress.Trim(),
            Notes = request.Notes?.Trim(),
            DeliveryMethodId = request.DeliveryMethodId,
            PaymentMethodId = request.PaymentMethodId,
        };

        foreach (var item in request.Items)
        {
            var product = products[item.ProductId];
            var quantity = item.Quantity;
            var unitPrice = product.EffectivePrice;
            order.Items.Add(new CustomerOrderItem
            {
                ProductId = product.Id,
                ProductName = product.Name,
                Sku = product.Sku,
                UnitPrice = unitPrice,
                Quantity = quantity,
                LineTotal = unitPrice * quantity,
            });
            order.Subtotal += product.SellPrice * quantity;
            order.Total += unitPrice * quantity;
        }
        order.DiscountAmount = order.Subtotal - order.Total;

        orders.Add(order);
        await orders.SaveChangesAsync(cancellationToken);
        return (order, string.Empty);
    }

    public async Task<OrderMutationResult> SetPaymentProofAsync(int id, string proofPath, CancellationToken cancellationToken = default)
    {
        var order = await orders.GetAsync(id, cancellationToken);
        if (order is null) return new(false, "Order not found.");
        if (order.Status != CustomerOrderStatus.PendingApproval) return new(false, "Payment proof can only be uploaded while the order is pending approval.");
        order.PaymentProofPath = proofPath;
        await orders.SaveChangesAsync(cancellationToken);
        return new(true, "Payment proof uploaded.");
    }

    public async Task<OrderMutationResult> ApproveAsync(int id, string? note, CancellationToken cancellationToken = default)
    {
        var order = await orders.GetAsync(id, cancellationToken);
        if (order is null) return new(false, "Order not found.");
        if (order.Status != CustomerOrderStatus.PendingApproval)
            return new(false, $"Order is already {order.Status}.");

        var productIds = order.Items.Select(x => x.ProductId).Distinct().ToList();
        var warehouse = await orders.GetDefaultWarehouseAsync(order.ShopId, productIds, cancellationToken);
        if (warehouse is null) return new(false, "No warehouse currently holds stock for every item in this order.");

        var sale = await inventory.SaleAsync(new StockDocumentRequest(
            warehouse.Id,
            order.Items.OrderBy(x => x.Id)
                .Select(item => new StockLineRequest(item.ProductId, item.Quantity, item.UnitPrice))
                .ToList(),
            order.Number,
            $"Customer order {order.Number}"
        ), cancellationToken);
        if (!sale.Succeeded) return new(false, sale.Message);

        order.Status = CustomerOrderStatus.Approved;
        order.ApprovedAtUtc = DateTime.UtcNow;
        order.AdminNote = note?.Trim();
        order.SaleDocumentId = sale.Document?.Id;
        await orders.SaveChangesAsync(cancellationToken);
        return new(true, "Payment approved; sale posted and stock deducted.");
    }

    public async Task<OrderMutationResult> RejectAsync(int id, string reason, CancellationToken cancellationToken = default)
    {
        var order = await orders.GetAsync(id, cancellationToken);
        if (order is null) return new(false, "Order not found.");
        if (order.Status != CustomerOrderStatus.PendingApproval) return new(false, $"Order is already {order.Status}.");
        order.Status = CustomerOrderStatus.Rejected;
        order.AdminNote = reason?.Trim();
        await orders.SaveChangesAsync(cancellationToken);
        return new(true, "Order rejected.");
    }

    public async Task<OrderMutationResult> DeliverAsync(int id, CancellationToken cancellationToken = default)
    {
        var order = await orders.GetAsync(id, cancellationToken);
        if (order is null) return new(false, "Order not found.");
        if (order.Status != CustomerOrderStatus.Approved) return new(false, "Only approved orders can be marked as delivered.");
        order.Status = CustomerOrderStatus.Delivered;
        order.DeliveredAtUtc = DateTime.UtcNow;
        await orders.SaveChangesAsync(cancellationToken);
        return new(true, "Order marked as delivered.");
    }
}