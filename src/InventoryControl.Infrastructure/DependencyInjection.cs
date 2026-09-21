using InventoryControl.Application.Abstractions;
using InventoryControl.Application.Services;
using InventoryControl.Infrastructure.Persistence;
using InventoryControl.Infrastructure.Repositories;
using InventoryControl.Infrastructure.Security;
using InventoryControl.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InventoryControl.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<InventoryDbContext>(options => options.UseSqlServer(configuration.GetConnectionString("InventoryDb")));

        services.AddIdentityCore<IdentityUser>(options =>
        {
            options.Password.RequiredLength = 8;
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.User.RequireUniqueEmail = false;
            options.Lockout.AllowedForNewUsers = true;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
        })
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<InventoryDbContext>();

        services.Configure<JwtOptions>(configuration.GetSection("Jwt"));
        services.Configure<StorageOptions>(configuration.GetSection("Storage"));
        services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IInventoryRepository, InventoryRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IDeliveryMethodRepository, DeliveryMethodRepository>();
        services.AddScoped<IProductImageService, ProductImageService>();
        services.AddScoped<IShopImageService, ShopImageService>();
        services.AddScoped<IReferenceImageService, ReferenceImageService>();
        services.AddScoped<IOrderProofStore, OrderProofStore>();
        services.AddScoped<ICustomerOrderService, CustomerOrderService>();
        services.AddScoped<TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        return services;
    }

    public static async Task SeedDatabaseAsync(this IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;
        var db = provider.GetRequiredService<InventoryDbContext>();
        await SampleDataSeeder.SeedAsync(db, provider.GetRequiredService<IProductImageService>(), cancellationToken);
        await UserSeeder.SeedAsync(
            provider.GetRequiredService<UserManager<IdentityUser>>(),
            provider.GetRequiredService<RoleManager<IdentityRole>>(),
            db,
            cancellationToken);
    }
}