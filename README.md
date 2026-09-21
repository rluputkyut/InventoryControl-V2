# Inventory Control

.NET 10 REST API for inventory master data and stock movements. Persistence is EF Core against SQL Server. Explore and try the API at `/swagger`; the OpenAPI document is also mapped in Development at `/openapi/v1.json`.

## Features

- CRUD: unit of measurement, product type, product group, product, warehouse
- Purchase and sale invoices with multiple product lines, posted as one document
- Stock balances and transaction history (filter by warehouse or invoice)
- Warehouse-to-warehouse transfers of multiple products, with insufficient-stock protection on the whole invoice
- User management with ASP.NET Core Identity roles (Admin, Operator, Viewer, Customer)
- JWT access tokens with rotating refresh tokens (HttpOnly cookie for web, JSON body for native apps); every document records who posted it
- EF Core SQL Server configuration and OpenAPI endpoint
- Setup and request examples in this README

A purchase, sale, or transfer is one invoice: a header (`warehouseId` or from/to warehouses, `referenceNo`, `notes`) plus a `lines` array of products. All lines post in a single database transaction. Sales and transfers refuse the entire invoice if any product (including the same product on more than one line) would go below available stock.

## Roles

| Role | Access |
| --- | --- |
| `Admin` | User management, master data, products, and everything below |
| `Operator` | Post purchases, sales, and transfers; read stock |
| `Customer` | Place purchase orders and read stock; mobile app role |
| `Viewer` | Read-only: balances, transactions, and posted documents |

Every endpoint requires a valid bearer token. Master data, products, and users are Admin-only; sales and transfers require Admin or Operator; customers place purchase orders (`POST /api/inventory/purchases`).

## Clean Architecture layout

```
src/
  InventoryControl.Domain/          Business entities and rules; no framework dependencies
  InventoryControl.Application/     Use cases, request contracts, and repository abstractions
  InventoryControl.Infrastructure/  EF Core SQL Server DbContext and repository implementations
  InventoryControl.Api/             ASP.NET Core controllers, Swagger, configuration, and DI composition
```

Dependencies point inward only: `Api → Application`, `Api → Infrastructure`, and `Infrastructure → Application + Domain`. The `Domain` project does not depend on another project.

## Setup

1. Set `ConnectionStrings:InventoryDb` in `src/InventoryControl.Api/appsettings.json` for your SQL Server instance. The default targets LocalDB:

```json
"Server=(localdb)\\MSSQLLocalDB;Database=InventoryControlDb;Trusted_Connection=True;TrustServerCertificate=True"
```

2. Set the `Jwt` settings in `src/InventoryControl.Api/appsettings.json`. The default key is development-only — replace it in production:

```json
"Jwt": {
  "Issuer": "InventoryControl",
  "Audience": "InventoryControl.Api",
  "Key": "at-least-32-characters-random-secret",
  "AccessTokenMinutes": 15,
  "RefreshTokenDays": 7
}
```

3. Restore, apply migrations, and run (from the repository root):

```powershell
dotnet restore
dotnet tool install --global dotnet-ef --version 10.*
dotnet ef migrations add InitialCreate --project src/InventoryControl.Infrastructure --startup-project src/InventoryControl.Api
dotnet ef database update --project src/InventoryControl.Infrastructure --startup-project src/InventoryControl.Api
dotnet run --project src/InventoryControl.Api
```

The HTTP profile listens at `http://localhost:5023`. Swagger UI is at `/swagger`. In Development, OpenAPI JSON is at `/openapi/v1.json`.

Optional sample catalogue: set `Database:SeedSampleData` to `true` in `src/InventoryControl.Api/appsettings.Development.json`. Seeding is idempotent and does not overwrite an existing product catalogue. It also creates three development accounts:

| Username | Password | Role |
| --- | --- | --- |
| `admin@inventory.local` | `Admin@12345` | Admin |
| `operator@inventory.local` | `Operator@12345` | Operator |
| `customer@inventory.local` | `Customer@12345` | Customer |

### Web client

The React SPA lives in `web/` and runs against the API via CORS. `Cors:AllowedOrigins` in `appsettings.json` already includes `http://localhost:5173`.

```powershell
npm install      # in web/
npm run dev      # http://localhost:5173
```

The SPA speaks to `http://localhost:5023` by default; override with `VITE_API_URL` if the API moves. Sign in with one of the seeded development accounts above. Login and access/refresh tokens are handled automatically; the refresh token stays in an HttpOnly cookie.

To build for production: `npm run build` (output in `web/dist/`).

### Mobile client (customers)

The Expo React Native app lives in `mobile/` and targets iPhone/Android. It uses the `Customer` role: read-only catalogue and balances, plus placing purchase orders. Native apps cannot use the web refresh-token cookie, so the API exposes cookie-free auth endpoints that return the refresh token in the JSON body:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/mobile/login` | Username/password → `accessToken`, `refreshToken`, `expiresInSeconds`, `user` |
| `POST /api/auth/mobile/refresh` | Rotate a refresh token (body `{ "refreshToken": "..." }`) → new pair |
| `POST /api/auth/mobile/logout` | Revoke a refresh token (body) |

```powershell
npm install      # in mobile/
npm run start    # Expo dev server (QR code for Expo Go on a device)
npm run android  # or: opens Android emulator
npm run ios      # or: opens iOS simulator
```

Point the app at your API:

- iOS simulator / web: `http://localhost:5023` is the default.
- Android emulator: defaults to `http://10.0.2.2:5023`.
- Physical device: set `EXPO_PUBLIC_API_URL=http://<your-lan-ip>:5023` (see `mobile/src/config.ts`).

Tokens are stored with `expo-secure-store` (Android Keystore / iOS Keychain). Sign in with the seeded `customer@inventory.local` account. Ship to stores later with `eas build` (EAS Build).

To sanity-check a production bundle without a device: `npx expo export --platform android`.

## Request examples

Base URL in the examples: `http://localhost:5023`. Replace generated `id` values in later calls.

### Authentication

Every endpoint below (except `/api/auth/*`) requires `Authorization: Bearer <access token>`.

```http
POST /api/auth/login
Content-Type: application/json

{ "userName": "admin@inventory.local", "password": "Admin@12345" }
```

The response returns the access token and user profile. A rotating refresh token is stored in an HttpOnly cookie scoped to `/api/auth`:

```json
{ "accessToken": "...", "expiresInSeconds": 900, "user": { "id": "...", "userName": "admin@inventory.local", "roles": ["Admin"] } }
```

Send the token with every request:

```http
GET /api/inventory/balances
Authorization: Bearer <access token>
```

Refresh the access token (uses the cookie; new pair issued, old refresh token revoked):

```http
POST /api/auth/refresh
```

Revoke the current refresh token:

```http
POST /api/auth/logout
```

### User management (Admin only)

```http
GET /api/users
GET /api/users/{id}
```

```http
POST /api/users
Content-Type: application/json

{ "userName": "kate.porter", "email": "kate@corp.example", "password": "Passw0rd!", "roles": ["Viewer"] }
```

Assign roles, enable/disable, and reset a password:

```http
PUT /api/users/{id}/roles
Content-Type: application/json

{ "roles": ["Operator", "Viewer"] }
```

```http
PUT /api/users/{id}/active
Content-Type: application/json

{ "isActive": true }
```

```http
POST /api/users/{id}/reset-password
Content-Type: application/json

{ "newPassword": "Passw0rd!" }
```

```http
DELETE /api/users/{id}
```

### Units of measurement

```http
GET /api/master-data/units
```

```http
POST /api/master-data/units
Content-Type: application/json

{ "name": "Each", "symbol": "ea", "isActive": true }
```

```http
PUT /api/master-data/units/1
Content-Type: application/json

{ "id": 1, "name": "Each", "symbol": "ea", "isActive": true }
```

```http
DELETE /api/master-data/units/1
```

### Product types and groups

```http
POST /api/master-data/product-types
Content-Type: application/json

{ "name": "Finished good", "description": "Sellable stock", "isActive": true }
```

```http
POST /api/master-data/product-groups
Content-Type: application/json

{ "name": "Hardware", "description": "Tools and fittings", "isActive": true }
```

`GET`, `PUT /{id}`, and `DELETE /{id}` follow the same pattern as units (`/api/master-data/product-types`, `/api/master-data/product-groups`).

### Warehouses

```http
POST /api/master-data/warehouses
Content-Type: application/json

{ "name": "Main warehouse", "code": "WH-MAIN", "address": "Auckland", "isActive": true }
```

```http
POST /api/master-data/warehouses
Content-Type: application/json

{ "name": "Overflow", "code": "WH-2", "address": "Hamilton", "isActive": true }
```

### Products

```http
POST /api/products
Content-Type: application/json

{
  "name": "Hammer",
  "sku": "HAM-001",
  "unitOfMeasurementId": 1,
  "productTypeId": 1,
  "productGroupId": 1,
  "reorderLevel": 5,
  "isActive": true
}
```

```http
GET /api/products
GET /api/products/1
PUT /api/products/1
DELETE /api/products/1
```

Create and update require an existing unit, product type, and product group.

#### Product images

Each product can have one image, stored on disk under `Storage:UploadRoot` (default `uploads/`), served only to
authenticated clients. Products expose `imageUrl` (`/api/products/{id}/image`) when an image exists.

```http
# Upload or replace (Admin; max 2 MB; JPEG, PNG, WebP, or GIF)
POST /api/products/1/image
Content-Type: multipart/form-data

file=<binary>

# Fetch (any authenticated role — <img> tags cannot send the token, use fetch with the Authorization header)
GET /api/products/1/image

# Remove (Admin)
DELETE /api/products/1/image
```

Deleting a product also deletes its stored image.

### Purchase and sale invoices

Purchase increases on-hand quantity for every line. Sale decreases it and returns `400` if any line would exceed available stock.

```http
POST /api/inventory/purchases
Content-Type: application/json

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

```http
POST /api/inventory/sales
Content-Type: application/json

{
  "warehouseId": 1,
  "referenceNo": "INV-200",
  "notes": "Counter sale",
  "lines": [
    { "productId": 1, "quantity": 2, "unitPrice": 39.00 },
    { "productId": 2, "quantity": 1, "unitPrice": 12.00 }
  ]
}
```

```http
GET /api/inventory/purchases
GET /api/inventory/purchases/1
GET /api/inventory/sales
GET /api/inventory/sales/1
```

The POST response is the saved invoice (`id`, `lines`, `totalAmount`) plus updated `balances` for the products that moved. Each document also records `postedByUserId`, the Identity user who created it, for the audit trail.

### Stock balances and transaction history

```http
GET /api/inventory/balances
GET /api/inventory/balances?warehouseId=1
GET /api/inventory/transactions
GET /api/inventory/transactions?warehouseId=1
GET /api/inventory/transactions?documentId=1
```

Transactions are newest first. Types are `Purchase`, `Sale`, `TransferOut`, and `TransferIn`. Each row includes `stockDocumentId` so you can group movements by invoice.

### Warehouse transfer

Moves several products as one document (outbound and inbound per line). Returns `400` if any product has insufficient stock in the source warehouse.

```http
POST /api/inventory/transfers
Content-Type: application/json

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

```http
GET /api/inventory/transfers
GET /api/inventory/transfers/1
```
