namespace InventoryControl.Application.Contracts;

public sealed record LoginRequest(string UserName, string Password);

public sealed record RegisterRequest(string UserName, string Name, string? Email, string Password, string? PhoneNumber = null, string? Address = null);

public sealed record RefreshTokenRequest(string RefreshToken);

public sealed record AuthResult(string AccessToken, string RefreshToken, int ExpiresInSeconds, UserDto User);

public sealed record UserDto(string Id, string UserName, string? Email, bool IsActive, IReadOnlyList<string> Roles, int? ShopId = null, string? PhoneNumber = null, string? Address = null, string? Name = null);

public sealed record UpdateProfileRequest(string? Email, string? PhoneNumber, string? Address, string Name);

public sealed record CreateUserRequest(string UserName, string? Email, string Password, IReadOnlyList<string> Roles, int? ShopId = null);

public sealed record SetRolesRequest(IReadOnlyList<string> Roles, int? ShopId = null);

public sealed record ResetPasswordRequest(string NewPassword);

public sealed record MutationResult(bool Succeeded, string Message, UserDto? User = null);
