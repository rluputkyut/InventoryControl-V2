using InventoryControl.Application.Abstractions;
using InventoryControl.Application.Contracts;
using InventoryControl.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace InventoryControl.Api.Controllers;

public sealed record LoginResponse(string AccessToken, int ExpiresInSeconds, UserDto User);

/// <summary>Token pair for native clients that cannot use HttpOnly cookies.</summary>
public sealed record MobileLoginResponse(string AccessToken, string RefreshToken, int ExpiresInSeconds, UserDto User);

/// <summary>Issues and rotates JWT access tokens via username/password login.</summary>
[ApiController]
[Route("api/auth")]
[AllowAnonymous]
public sealed class AuthController(IAuthService authService, IOptions<JwtOptions> jwtOptions) : ControllerBase
{
    /// <summary>Logs in with a username and password; sets a rotating HttpOnly refresh-token cookie.</summary>
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        if (result is null) return Unauthorized(new { message = "Invalid username or password." });
        SetRefreshCookie(result.RefreshToken);
        return Ok(ToResponse(result));
    }

    /// <summary>Creates a customer account linked to the default shop and logs the user in.</summary>
    [HttpPost("register")]
    public async Task<ActionResult<MobileLoginResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.RegisterAsync(request, cancellationToken);
        if (result is null) return BadRequest(new { message = "Registration failed. The username may already be taken or the password is too weak." });
        return Ok(new MobileLoginResponse(result.AccessToken, result.RefreshToken, result.ExpiresInSeconds, result.User));
    }

    /// <summary>Issues a new access token from the refresh-token cookie, rotating the refresh token.</summary>
    [HttpPost("refresh")]
    public async Task<ActionResult<LoginResponse>> Refresh(CancellationToken cancellationToken)
    {
        var refreshToken = Request.Cookies["refresh_token"];
        if (string.IsNullOrEmpty(refreshToken)) return Unauthorized(new { message = "Missing refresh token." });
        var result = await authService.RefreshAsync(refreshToken, cancellationToken);
        if (result is null) return Unauthorized(new { message = "Refresh token is invalid or expired." });
        SetRefreshCookie(result.RefreshToken);
        return Ok(ToResponse(result));
    }

    /// <summary>Revokes the current refresh token.</summary>
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var refreshToken = Request.Cookies["refresh_token"];
        if (!string.IsNullOrEmpty(refreshToken)) await authService.LogoutAsync(refreshToken, cancellationToken);
        Response.Cookies.Delete("refresh_token", new CookieOptions { Path = "/api/auth", Secure = Request.IsHttps });
        return NoContent();
    }

    /// <summary>Native-client login; returns the refresh token in the JSON body instead of a cookie.</summary>
    [HttpPost("mobile/login")]
    public async Task<ActionResult<MobileLoginResponse>> MobileLogin(LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        if (result is null) return Unauthorized(new { message = "Invalid username or password." });
        return Ok(new MobileLoginResponse(result.AccessToken, result.RefreshToken, result.ExpiresInSeconds, result.User));
    }

    /// <summary>Rotates an already-issued refresh token; returns a new token pair in the JSON body.</summary>
    [HttpPost("mobile/refresh")]
    public async Task<ActionResult<MobileLoginResponse>> MobileRefresh(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.RefreshAsync(request.RefreshToken, cancellationToken);
        if (result is null) return Unauthorized(new { message = "Refresh token is invalid or expired." });
        return Ok(new MobileLoginResponse(result.AccessToken, result.RefreshToken, result.ExpiresInSeconds, result.User));
    }

    /// <summary>Revokes a refresh token supplied in the body (devices that do not store cookies).</summary>
    [HttpPost("mobile/logout")]
    public async Task<IActionResult> MobileLogout(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrEmpty(request.RefreshToken)) await authService.LogoutAsync(request.RefreshToken, cancellationToken);
        return NoContent();
    }

    /// <summary>Returns the current user profile for the access token.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me(CancellationToken cancellationToken)
    {
        var me = await authService.MeAsync(cancellationToken);
        return me is null ? Unauthorized() : Ok(me);
    }

    /// <summary>Updates the signed-in user's own profile (email and phone number).</summary>
    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<UserDto>> UpdateProfile(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email?.Trim();
        if (email is not null && email.Length > 0 && !email.Contains('@'))
            return BadRequest(new { message = "Enter a valid email address." });
        var updated = await authService.UpdateProfileAsync(request, cancellationToken);
        return updated is null ? Unauthorized() : Ok(updated);
    }

    private static LoginResponse ToResponse(AuthResult result) =>
        new(result.AccessToken, result.ExpiresInSeconds, result.User);

    private void SetRefreshCookie(string refreshToken)
    {
        Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth",
            Expires = DateTimeOffset.UtcNow.AddDays(jwtOptions.Value.RefreshTokenDays)
        });
    }
}