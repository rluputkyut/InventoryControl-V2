using InventoryControl.Application.Contracts;

namespace InventoryControl.Application.Abstractions;

public interface IUserService
{
    Task<IReadOnlyList<UserDto>> ListAsync(CancellationToken cancellationToken = default);
    Task<UserDto?> GetAsync(string id, CancellationToken cancellationToken = default);
    Task<MutationResult> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default);
    Task<MutationResult> SetRolesAsync(string id, SetRolesRequest request, CancellationToken cancellationToken = default);
    Task<MutationResult> SetActiveAsync(string id, bool isActive, CancellationToken cancellationToken = default);
    Task<MutationResult> ResetPasswordAsync(string id, ResetPasswordRequest request, CancellationToken cancellationToken = default);
    Task<MutationResult> DeleteAsync(string id, CancellationToken cancellationToken = default);
}