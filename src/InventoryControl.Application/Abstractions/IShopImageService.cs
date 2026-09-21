namespace InventoryControl.Application.Abstractions;

public interface IShopImageService
{
    Task<string> SaveAsync(int shopId, Stream content, string contentType, CancellationToken cancellationToken = default);
    Task<Stream?> OpenAsync(string imagePath, CancellationToken cancellationToken = default);
    Task DeleteAsync(string imagePath, CancellationToken cancellationToken = default);
}