namespace InventoryControl.Application.Abstractions;

/// <summary>Persists product image files on disk behind a server-relative path.</summary>
public interface IProductImageService
{
    /// <summary>Saves the stream, replacing any existing file for the product, and returns the server-relative path.</summary>
    Task<string> SaveAsync(int productId, Stream content, string contentType, CancellationToken cancellationToken = default);

    /// <summary>Opens the stored file, or null when the path is invalid or the file is missing.</summary>
    Task<Stream?> OpenAsync(string imagePath, CancellationToken cancellationToken = default);

    /// <summary>Deletes the stored file when it exists.</summary>
    Task DeleteAsync(string imagePath, CancellationToken cancellationToken = default);
}