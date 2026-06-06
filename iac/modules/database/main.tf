###############################################################################
# Module: database — Azure Database for PostgreSQL Flexible Server
###############################################################################

resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  # WHY random_password: never hardcode DB passwords. This generates one at
  # apply-time, stores it in Terraform state (encrypted), and we push it to
  # Key Vault immediately so the app never reads state directly.
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                = "psql-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name

  administrator_login    = var.db_admin_login
  administrator_password = random_password.db.result

  sku_name   = var.db_sku       # e.g. "GP_Standard_D2s_v3"
  storage_mb = var.db_storage_mb
  version    = "15"

  # Zone-Redundant HA: standby replica in a different AZ.
  # Failover is automatic (~60s). RPO = 0 (synchronous replication).
  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }

  # Maintenance window: Sunday 03:00 UTC — lowest traffic window.
  maintenance_window {
    day_of_week  = 0
    start_hour   = 3
    start_minute = 0
  }

  # WHY delegated subnet, not private endpoint for PostgreSQL Flexible Server:
  # PostgreSQL Flexible Server uses VNet integration via delegation — it does
  # NOT use private endpoints (that's Single Server's approach). The server
  # is injected directly into the subnet and gets a VNet IP.
  delegated_subnet_id = var.subnet_data_id
  private_dns_zone_id = var.private_dns_zone_id

  # Geo-redundant backup: stores backups in a paired region.
  # Useful if we ever need to restore into a DR region.
  geo_redundant_backup_enabled = true
  backup_retention_days        = 35  # Maximum retention (default is 7)

  tags = var.tags

  depends_on = [var.private_dns_zone_id]

  lifecycle {
    prevent_destroy = true   # Extra guard — losing prod DB is catastrophic
  }
}

# Initial database creation
resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = var.db_name
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Firewall: deny all external access. VNet integration means we don't need
# any firewall rules — the server is only reachable inside the VNet.
resource "azurerm_postgresql_flexible_server_firewall_rule" "deny_all" {
  name             = "deny-all-public"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
  # Blank start/end = Azure Services internal only (this actually denies public)
}

# PostgreSQL configuration tuning
resource "azurerm_postgresql_flexible_server_configuration" "connection_throttling" {
  name      = "connection_throttling"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_checkpoints" {
  name      = "log_checkpoints"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}
