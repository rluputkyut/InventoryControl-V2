using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace InventoryControl.Api.Controllers;

/// <summary>
/// Address autocomplete proxy. All calls to the Google Places API (New) Autocomplete endpoint
/// go through the server so the API key never leaves the backend.
/// </summary>
[ApiController]
[Route("api/addresses")]
public sealed class AddressesController(IHttpClientFactory httpClientFactory, IConfiguration configuration) : ControllerBase
{
    private const string AutocompleteUrl = "https://places.googleapis.com/v1/places:autocomplete";

    public sealed record AddressSuggestion(string Id, string Text, string? Description);

    /// <summary>Searches for addresses. If a country is given, results are biased to it.</summary>
    [HttpGet("autocomplete")]
    public async Task<ActionResult<IReadOnlyList<AddressSuggestion>>> Autocomplete(
        [FromQuery] string q,
        [FromQuery] string? country,
        CancellationToken cancellationToken)
    {
        var query = q?.Trim();
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
            return Ok(Array.Empty<AddressSuggestion>());

        var key = configuration["Google:PlacesApiKey"];
        if (string.IsNullOrWhiteSpace(key))
            return BadRequest("Address lookup is not configured.");

        var countryCode = string.IsNullOrWhiteSpace(country)
            ? null
            : country.Trim().ToUpperInvariant();
        var language = configuration["Google:LanguageCode"] ?? "id";

        var body = new AutocompleteRequest(
            query,
            countryCode is null ? null : new[] { countryCode },
            language);

        HttpClient client = httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, AutocompleteUrl)
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Add("X-Goog-Api-Key", key);
        request.Headers.Add("X-Goog-FieldMask",
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat");

        AutocompleteResponse? google;
        try
        {
            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, "Address lookup service failed.");
            google = await response.Content.ReadFromJsonAsync<AutocompleteResponse>(cancellationToken);
        }
        catch
        {
            return StatusCode(502, "Address lookup service is unavailable.");
        }

        var suggestions = google?.Suggestions
            .Where(x => !string.IsNullOrWhiteSpace(x.PlacePrediction?.Text?.Text))
            .Select(x => new AddressSuggestion(
                x.PlacePrediction!.PlaceId ?? string.Empty,
                x.PlacePrediction.Text!.Text.Trim(),
                Clean(x.PlacePrediction.StructuredFormat?.SecondaryText?.Text)))
            .ToList() ?? [];

        return Ok(suggestions);
    }

    private static string? Clean(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private sealed record AutocompleteRequest(
        [property: JsonPropertyName("input")] string Input,
        [property: JsonPropertyName("includedRegionCodes")] string[]? IncludedRegionCodes,
        [property: JsonPropertyName("languageCode")] string LanguageCode);

    private sealed class AutocompleteResponse
    {
        [JsonPropertyName("suggestions")]
        public List<Suggestion> Suggestions { get; set; } = [];

        public sealed class Suggestion
        {
            [JsonPropertyName("placePrediction")]
            public PlacePrediction? PlacePrediction { get; set; }
        }

        public sealed class PlacePrediction
        {
            [JsonPropertyName("placeId")]
            public string? PlaceId { get; set; }

            [JsonPropertyName("text")]
            public PredictionText? Text { get; set; }

            [JsonPropertyName("structuredFormat")]
            public StructuredFormat? StructuredFormat { get; set; }
        }

        public sealed class PredictionText
        {
            [JsonPropertyName("text")]
            public string? Text { get; set; }
        }

        public sealed class StructuredFormat
        {
            [JsonPropertyName("secondaryText")]
            public PredictionText? SecondaryText { get; set; }
        }
    }
}