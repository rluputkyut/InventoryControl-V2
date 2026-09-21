namespace InventoryControl.Application.Contracts;

public sealed record OrderItemRequest(int ProductId, decimal Quantity);

public sealed record CreateOrderRequest(
    string RecipientName,
    string RecipientPhone,
    string ShippingAddress,
    string? Notes,
    int DeliveryMethodId,
    int PaymentMethodId,
    IReadOnlyList<OrderItemRequest> Items);

public sealed record OrderMutationResult(bool Succeeded, string Message);