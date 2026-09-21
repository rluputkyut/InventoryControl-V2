using InventoryControl.Api.Security;
using InventoryControl.Application.Abstractions;
using InventoryControl.Application.Services;
using InventoryControl.Infrastructure;
using InventoryControl.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Reflection;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    // EF entities carry bidirectional navigations (e.g. Order <-> Items); drop cycles instead of failing.
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    // Enums travel as their exact PascalCase names (e.g. "Purchase", "PendingApproval") so both
    // the web and mobile clients can compare against the string unions declared in their types.
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(NamingPolicy.Identity, allowIntegerValues: false));
});
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddCors(options =>
{
    options.AddPolicy("WebClient", policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Inventory Control API",
        Version = "v1",
        Description = "API for inventory master data, stock movements, sales, purchases, and warehouse transfers."
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer <access token>' from /api/auth/login."
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>()
    });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath)) options.IncludeXmlComments(xmlPath);
});
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddHttpClient();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = System.Security.Claims.ClaimTypes.Name
        };
    });

var app = builder.Build();

if (app.Configuration.GetValue<bool>("Database:SeedSampleData"))
{
    await app.Services.SeedDatabaseAsync();
}

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Inventory Control API v1");
    options.RoutePrefix = "swagger";
    options.DocumentTitle = "Inventory Control API Docs";
});

if (app.Environment.IsDevelopment()) app.MapOpenApi();

app.UseCors("WebClient");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

/// <summary>JsonNamingPolicy that keeps enum names exactly as declared (PascalCase).</summary>
internal sealed class NamingPolicy : System.Text.Json.JsonNamingPolicy
{
    public static readonly NamingPolicy Identity = new();

    public override string ConvertName(string name) => name;
}