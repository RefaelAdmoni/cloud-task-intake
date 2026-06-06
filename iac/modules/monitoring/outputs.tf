output "log_analytics_workspace_id" { value = var.log_analytics_workspace_id }
output "grafana_endpoint" { value = azurerm_dashboard_grafana.main.endpoint }
