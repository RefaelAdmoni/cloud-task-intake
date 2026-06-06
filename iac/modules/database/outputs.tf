output "server_fqdn" { value = azurerm_postgresql_flexible_server.main.fqdn }
output "db_name"     { value = azurerm_postgresql_flexible_server_database.app.name }

output "connection_string" {
  sensitive = true
  value     = "postgresql://${var.db_admin_login}:${random_password.db.result}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${var.db_name}?sslmode=require"
}

output "admin_password" {
  sensitive = true
  value     = random_password.db.result
}
