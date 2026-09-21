using System.Buffers.Binary;
using System.IO.Compression;
using System.Text;

namespace InventoryControl.Infrastructure.Persistence;

/// <summary>Deterministic placeholder product images generated at seed time (no external assets).</summary>
internal static class SeedImageFactory
{
    private const int Size = 400;

    /// <summary>Renders a 400x400 PNG placeholder whose colors derive from the given seed string.</summary>
    public static byte[] Placeholder(string seed)
    {
        const int stride = Size * 3;
        var rgb = new byte[Size * stride];

        var hash = 2166136261u;
        foreach (var c in seed) hash = (hash ^ c) * 16777619u;
        var baseR = 70 + (int)(hash % 120);
        var baseG = 70 + (int)((hash >> 9) % 120);
        var baseB = 70 + (int)((hash >> 18) % 120);

        for (var y = 0; y < Size; y++)
        {
            var t = y / (double)(Size - 1);
            var row = y * stride;
            var inLabelBand = y is >= (Size * 3 / 8) and <= (Size * 5 / 8);
            for (var x = 0; x < Size; x++)
            {
                var sheen = x <= y * 2 && x >= y / 2 ? 1.15 : 1.0;
                var brightness = sheen * (inLabelBand ? 1.12 : 1.0);
                var i = row + x * 3;
                rgb[i] = ToByte(baseR, t, brightness);
                rgb[i + 1] = ToByte(baseG, t, brightness);
                rgb[i + 2] = ToByte(baseB, t, brightness);
            }
        }
        return EncodePng(rgb);
    }

    private static byte ToByte(int baseValue, double t, double brightness)
    {
        var target = 60 + baseValue * 0.55;
        var value = ((1 - t) * baseValue + t * target) * brightness;
        return (byte)Math.Clamp(value, 0, 255);
    }

    private static byte[] EncodePng(byte[] rgb)
    {
        using var stream = new MemoryStream();
        stream.Write([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

        var header = new byte[13];
        BinaryPrimitives.WriteInt32BigEndian(header, Size);
        BinaryPrimitives.WriteInt32BigEndian(header.AsSpan(4), Size);
        header[8] = 8;  // bit depth
        header[9] = 2;  // color type: truecolor RGB
        WriteChunk(stream, "IHDR", header);

        var raw = new byte[Size * (1 + Size * 3)];
        for (var y = 0; y < Size; y++)
        {
            var row = y * (1 + Size * 3);
            raw[row] = 0; // filter type: none
            Array.Copy(rgb, y * Size * 3, raw, row + 1, Size * 3);
        }
        using var compressed = new MemoryStream();
        using (var zlib = new ZLibStream(compressed, CompressionLevel.Fastest, leaveOpen: true))
            zlib.Write(raw);
        WriteChunk(stream, "IDAT", compressed.ToArray());

        WriteChunk(stream, "IEND", []);
        return stream.ToArray();
    }

    private static void WriteChunk(Stream target, string type, byte[] data)
    {
        Span<byte> length = stackalloc byte[4];
        BinaryPrimitives.WriteInt32BigEndian(length, data.Length);
        target.Write(length);

        var typeBytes = Encoding.ASCII.GetBytes(type);
        var crcInput = new byte[typeBytes.Length + data.Length];
        typeBytes.CopyTo(crcInput, 0);
        data.CopyTo(crcInput, typeBytes.Length);

        target.Write(typeBytes);
        target.Write(data);
        Span<byte> crc = stackalloc byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(crc, Crc32(crcInput));
        target.Write(crc);
    }

    private static uint Crc32(byte[] data)
    {
        var crc = 0xFFFFFFFFu;
        foreach (var b in data)
        {
            crc ^= b;
            for (var i = 0; i < 8; i++)
                crc = (crc & 1) != 0 ? (crc >> 1) ^ 0xEDB88320u : crc >> 1;
        }
        return crc ^ 0xFFFFFFFFu;
    }
}