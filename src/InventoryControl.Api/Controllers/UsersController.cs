using InventoryControl.Application.Abstractions;
using InventoryControl.Application.Contracts;
using InventoryControl.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryControl.Api.Controllers;

public sealed record SetActiveRequest(bool IsActive);

/// <summary>Admin-only user management.</summary>
[ApiController]
[Route("api/users")]
[Authorize(Roles = Roles.Admin)]
public sealed class UsersController(IUserService users) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<UserDto>> List(CancellationToken cancellationToken) => users.ListAsync(cancellationToken);

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> Get(string id, CancellationToken cancellationToken)
    {
        var result = await users.GetAsync(id, cancellationToken);
        return result is null ? NotFound() : result;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest request, CancellationToken cancellationToken)
    {
        var result = await users.CreateAsync(request, cancellationToken);
        return result.Succeeded ? CreatedAtAction(nameof(Get), new { result.User!.Id }, result.User) : BadRequest(new { result.Message });
    }

    [HttpPut("{id}/roles")]
    public async Task<IActionResult> SetRoles(string id, SetRolesRequest request, CancellationToken cancellationToken)
    {
        var result = await users.SetRolesAsync(id, request, cancellationToken);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Message });
    }

    [HttpPut("{id}/active")]
    public async Task<IActionResult> SetActive(string id, [FromBody] SetActiveRequest request, CancellationToken cancellationToken)
    {
        var result = await users.SetActiveAsync(id, request.IsActive, cancellationToken);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Message });
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id, ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await users.ResetPasswordAsync(id, request, cancellationToken);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Message });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var result = await users.DeleteAsync(id, cancellationToken);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Message });
    }
}