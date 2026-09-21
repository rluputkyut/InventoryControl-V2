using InventoryControl.Application.Abstractions;
using Microsoft.Extensions.Options;

namespace InventoryControl.Infrastructure.Services;

/// <summary>Stores customer bank-transfer screenshots under the uploads root.</summary>
public sealed class OrderProofStore(IOptions<StorageOptions> options) : IOrderProofStore
{
    private static readonly Dictionary<string, string> ExtensionByType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif",
    };

    private readonly string _root = ResolveRoot(options.Value.UploadRoot);

    private static string ResolveRoot(string configured)
    {
        var root = Path.IsPathRooted(configured) ? configured : Path.Combine(Directory.GetCurrentDirectory(), configured);
        return Path.GetFullPath(Path.Combine(root, "orders"));
    }

    public async Task<string> SaveAsync(Stream content, string contentType, CancellationToken cancellationToken = default)
    {
        if (!ExtensionByType.TryGetValue(contentType, out var extension))
            throw new InvalidOperationException($"Unsupported image content type '{contentType}'.");
        var relativePath = $"{Guid.NewGuid():N}{extension}";
        Directory.CreateDirectory(_root);
        var fullPath = SafePath(relativePath);
        await using var file = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None, 64 * 1024, useAsync: true);
        await content.CopyToAsync(file, cancellationToken);
        return relativePath;
    }

    public Task<Stream?> OpenAsync(string proofPath, CancellationToken cancellationToken = default)
    {
        Stream? stream = null;
        try
        {
            var fullPath = SafePath(proofPath);
            if (File.Exists(fullPath)) stream = File.OpenRead(fullPath);
        }
        catch (UnauthorizedAccessException)
        {
            // Treat paths escaping the upload root as missing.
        }
        return Task.FromResult(stream);
    }

    public Task DeleteAsync(string proofPath, CancellationToken cancellationToken = default)
    {
        try
        {
            var fullPath = SafePath(proofPath);
            if (File.Exists(fullPath)) File.Delete(fullPath);
        }
        catch (UnauthorizedAccessException)
        {
            // Ignore files outside the upload root.
        }
        return Task.CompletedTask;
    }

    private string SafePath(string relativePath)
    {
        var full = Path.GetFullPath(Path.Combine(_root, relativePath));
        var rootPrefix = _root.EndsWith(Path.DirectorySeparatorChar) ? _root : _root + Path.DirectorySeparatorChar;
        if (!full.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Image path escapes the upload root.");
        return full;
    }
}