output "log_analytics_workspace_id" { value = azurerm_log_analytics_workspace.main.id }
output "grafana_endpoint"           { value = azurerm_dashboard_grafana.main.endpoint }
