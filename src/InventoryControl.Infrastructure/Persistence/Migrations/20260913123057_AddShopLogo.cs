using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryControl.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddShopLogo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LogoPath",
                table: "Shops",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LogoPath",
                table: "Shops");
        }
    }
}
