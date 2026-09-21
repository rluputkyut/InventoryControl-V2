using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryControl.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddShopTenancy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Shops",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shops", x => x.Id);
                });

            // Default shop: existing rows are backfilled into it so the required FK can never dangle.
            migrationBuilder.InsertData(
                table: "Shops",
                columns: new[] { "Id", "Name", "Code", "IsActive" },
                values: new object[] { 1, "Main Shop", "MAIN", true });

            migrationBuilder.DropIndex(
                name: "IX_Warehouses_Code",
                table: "Warehouses");

            migrationBuilder.DropIndex(
                name: "IX_Products_Sku",
                table: "Products");

            migrationBuilder.AddColumn<int>(
                name: "ShopId",
                table: "Warehouses",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "ShopId",
                table: "ProductTypes",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "ShopId",
                table: "Products",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "ShopId",
                table: "ProductGroups",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_ShopId_Code",
                table: "Warehouses",
                columns: new[] { "ShopId", "Code" },
                unique: true,
                filter: "[Code] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProductTypes_ShopId",
                table: "ProductTypes",
                column: "ShopId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_ShopId_Sku",
                table: "Products",
                columns: new[] { "ShopId", "Sku" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductGroups_ShopId",
                table: "ProductGroups",
                column: "ShopId");

            migrationBuilder.CreateIndex(
                name: "IX_Shops_Code",
                table: "Shops",
                column: "Code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ProductGroups_Shops_ShopId",
                table: "ProductGroups",
                column: "ShopId",
                principalTable: "Shops",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Shops_ShopId",
                table: "Products",
                column: "ShopId",
                principalTable: "Shops",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProductTypes_Shops_ShopId",
                table: "ProductTypes",
                column: "ShopId",
                principalTable: "Shops",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Warehouses_Shops_ShopId",
                table: "Warehouses",
                column: "ShopId",
                principalTable: "Shops",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProductGroups_Shops_ShopId",
                table: "ProductGroups");

            migrationBuilder.DropForeignKey(
                name: "FK_Products_Shops_ShopId",
                table: "Products");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductTypes_Shops_ShopId",
                table: "ProductTypes");

            migrationBuilder.DropForeignKey(
                name: "FK_Warehouses_Shops_ShopId",
                table: "Warehouses");

            migrationBuilder.DropTable(
                name: "Shops");

            migrationBuilder.DropIndex(
                name: "IX_Warehouses_ShopId_Code",
                table: "Warehouses");

            migrationBuilder.DropIndex(
                name: "IX_ProductTypes_ShopId",
                table: "ProductTypes");

            migrationBuilder.DropIndex(
                name: "IX_Products_ShopId_Sku",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_ProductGroups_ShopId",
                table: "ProductGroups");

            migrationBuilder.DropColumn(
                name: "ShopId",
                table: "Warehouses");

            migrationBuilder.DropColumn(
                name: "ShopId",
                table: "ProductTypes");

            migrationBuilder.DropColumn(
                name: "ShopId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ShopId",
                table: "ProductGroups");

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_Code",
                table: "Warehouses",
                column: "Code",
                unique: true,
                filter: "[Code] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Products_Sku",
                table: "Products",
                column: "Sku",
                unique: true);
        }
    }
}
