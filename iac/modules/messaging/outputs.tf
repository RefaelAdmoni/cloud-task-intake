output "namespace_name" { value = azurerm_servicebus_namespace.main.name }
output "namespace_id"   { value = azurerm_servicebus_namespace.main.id }
output "queue_name"     { value = azurerm_servicebus_queue.tasks.name }

output "primary_connection_string" {
  sensitive = true
  value     = azurerm_servicebus_namespace.main.default_primary_connection_string
}

output "send_connection_string" {
  sensitive = true
  value     = azurerm_servicebus_queue_authorization_rule.send.primary_connection_string
}

output "listen_connection_string" {
  sensitive = true
  value     = azurerm_servicebus_queue_authorization_rule.listen.primary_connection_string
}
