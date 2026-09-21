namespace InventoryControl.Infrastructure;

/// <summary>Configures on-disk storage. Relative paths resolve against the content root.</summary>
public sealed class StorageOptions
{
    public string UploadRoot { get; set; } = "uploads";
}