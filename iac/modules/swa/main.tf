###############################################################################
# Module: swa — Azure Static Web Apps (React/Vite frontend)
###############################################################################

resource "azurerm_static_web_app" "main" {
  name                = "swa-${var.prefix}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku_tier            = "Standard"
  sku_size            = "Standard"
  tags                = var.tags
}
