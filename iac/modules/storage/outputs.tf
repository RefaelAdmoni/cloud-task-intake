output "account_name" { value = azurerm_storage_account.main.name }
output "container_name" { value = azurerm_storage_container.uploads.name }
output "connection_string" {
  sensitive = true
  value     = azurerm_storage_account.main.primary_connection_string
}
output "primary_blob_endpoint" { value = azurerm_storage_account.main.primary_blob_endpoint }
