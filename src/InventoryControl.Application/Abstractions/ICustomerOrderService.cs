using InventoryControl.Application.Contracts;
using InventoryControl.Domain;

namespace InventoryControl.Application.Abstractions;

public interface ICustomerOrderService
{
    Task<IReadOnlyList<CustomerOrder>> ListForCustomerAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CustomerOrder>> ListAsync(int? shopId, CancellationToken cancellationToken = default);
    Task<CustomerOrder?> GetAsync(int id, CancellationToken cancellationToken = default);
    Task<(CustomerOrder? Order, string Message)> CreateAsync(CreateOrderRequest request, CancellationToken cancellationToken = default);
    Task<OrderMutationResult> SetPaymentProofAsync(int id, string proofPath, CancellationToken cancellationToken = default);
    Task<OrderMutationResult> ApproveAsync(int id, string? note, CancellationToken cancellationToken = default);
    Task<OrderMutationResult> RejectAsync(int id, string reason, CancellationToken cancellationToken = default);
    Task<OrderMutationResult> DeliverAsync(int id, CancellationToken cancellationToken = default);
}