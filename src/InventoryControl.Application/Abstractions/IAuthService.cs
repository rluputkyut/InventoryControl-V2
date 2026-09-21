using InventoryControl.Application.Contracts;

namespace InventoryControl.Application.Abstractions;

public interface IAuthService
{
    Task<AuthResult?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult?> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult?> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);
    Task<UserDto?> MeAsync(CancellationToken cancellationToken = default);
    Task<UserDto?> UpdateProfileAsync(UpdateProfileRequest request, CancellationToken cancellationToken = default);
    Task<bool> LogoutAsync(string refreshToken, CancellationToken cancellationToken = default);
}