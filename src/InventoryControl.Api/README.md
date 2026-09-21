# Inventory Control API

## Architecture

The solution follows Clean Architecture. `Domain` contains business entities with no framework dependencies. `Application` contains inventory use cases and persistence abstractions. `Infrastructure` provides EF Core / SQL Server implementations. `Api` contains only HTTP, Swagger, and dependency-composition concerns.

.NET 10 REST API backed by Microsoft SQL Server. It manages units of measurement, product types, product groups, products, warehouses, purchases, sales, inventory balances, and transfers between warehouses.

## Configure and run

1. Update `ConnectionStrings:InventoryDb` in `appsettings.json` for your SQL Server instance.
2. Install the EF command-line tool once, then create the database schema and start the API:

```powershell
dotnet tool install --global dotnet-ef --version 10.*
dotnet ef migrations add InitialCreate --project src/InventoryControl.Infrastructure --startup-project src/InventoryControl.Api
dotnet ef database update --project src/InventoryControl.Infrastructure --startup-project src/InventoryControl.Api
dotnet run --project src/InventoryControl.Api
```

Swagger UI is available at `/swagger` and the Swagger document at `/swagger/v1/swagger.json`. OpenAPI JSON is also available in Development at `/openapi/v1.json`.

In the Development environment, the first startup after the database schema is created also adds sample master data, two warehouses, two products, starting balances, and purchase transactions. Set `Database:SeedSampleData` to `false` in `appsettings.Development.json` to disable it. Seeding is idempotent and does not overwrite an existing product catalogue.

## Main endpoints

| Area | Routes |
| --- | --- |
| Master data | `GET/POST/PUT/DELETE /api/master-data/units`, `product-types`, `product-groups`, `warehouses` |
| Products | `GET/POST/PUT/DELETE /api/products` |
| Stock inquiry | `GET /api/inventory/balances`, `GET /api/inventory/transactions` |
| Purchase invoice | `GET/POST /api/inventory/purchases`, `GET /api/inventory/purchases/{id}` |
| Sale invoice | `GET/POST /api/inventory/sales`, `GET /api/inventory/sales/{id}` |
| Warehouse transfer | `GET/POST /api/inventory/transfers`, `GET /api/inventory/transfers/{id}` |

Purchase/sale body (multiple products per invoice):

```json
{
  "warehouseId": 1,
  "referenceNo": "PO-100",
  "notes": "Supplier delivery",
  "lines": [
    { "productId": 1, "quantity": 10, "unitPrice": 25.50 },
    { "productId": 2, "quantity": 5, "unitPrice": 8.00 }
  ]
}
```

Transfer body:

```json
{
  "fromWarehouseId": 1,
  "toWarehouseId": 2,
  "referenceNo": "TR-100",
  "notes": "Replenishment",
  "lines": [
    { "productId": 1, "quantity": 3 },
    { "productId": 2, "quantity": 1 }
  ]
}
```

All lines on an invoice post together. Sales and transfers are rejected in full if any product has insufficient stock.
