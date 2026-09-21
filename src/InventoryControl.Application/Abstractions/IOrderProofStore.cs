namespace InventoryControl.Application.Abstractions;

/// <summary>Persists customer payment-proof images on disk behind a server-relative path.</summary>
public interface IOrderProofStore
{
    /// <summary>Saves the screenshot and returns the server-relative path.</summary>
    Task<string> SaveAsync(Stream content, string contentType, CancellationToken cancellationToken = default);

    /// <summary>Opens the stored file, or null when the path is invalid or the file is missing.</summary>
    Task<Stream?> OpenAsync(string proofPath, CancellationToken cancellationToken = default);

    /// <summary>Deletes the stored file when it exists.</summary>
    Task DeleteAsync(string proofPath, CancellationToken cancellationToken = default);
}