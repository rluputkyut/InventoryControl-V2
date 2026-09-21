namespace InventoryControl.Application.Abstractions;

/// <summary>Persists small reference images (delivery/payment logos) on disk behind a server-relative path.</summary>
public interface IReferenceImageService
{
    Task<string> SaveAsync(int referenceId, Stream content, string contentType, CancellationToken cancellationToken = default);
    Task<Stream?> OpenAsync(string imagePath, CancellationToken cancellationToken = default);
    Task DeleteAsync(string imagePath, CancellationToken cancellationToken = default);
}