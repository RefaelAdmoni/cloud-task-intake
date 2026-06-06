output "default_hostname" { value = azurerm_static_web_app.main.default_host_name }
output "api_key" {
  sensitive = true
  value     = azurerm_static_web_app.main.api_key
}
