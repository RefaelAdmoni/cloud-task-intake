###############################################################################
# Module: monitoring — Log Analytics, Container Insights, Alerts, Grafana
###############################################################################

resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 90
  tags                = var.tags
}

# Container Insights — sends AKS pod logs and metrics to Log Analytics
resource "azurerm_monitor_diagnostic_setting" "aks" {
  name                       = "diag-aks-${var.prefix}"
  target_resource_id         = var.aks_cluster_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log { category = "kube-apiserver" }
  enabled_log { category = "kube-controller-manager" }
  enabled_log { category = "kube-scheduler" }
  enabled_log { category = "kube-audit" }
  enabled_log { category = "cluster-autoscaler" }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Action group — where alerts are sent
resource "azurerm_monitor_action_group" "main" {
  name                = "ag-${var.prefix}"
  resource_group_name = var.resource_group_name
  short_name          = "cloudtask"
  tags                = var.tags

  email_receiver {
    name                    = "devops-email"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }
}

# Alert — high API pod restart count (crashloop indicator)
resource "azurerm_monitor_metric_alert" "pod_restarts" {
  name                = "alert-pod-restarts-${var.prefix}"
  resource_group_name = var.resource_group_name
  scopes              = [var.aks_cluster_id]
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"
  tags                = var.tags

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "restartingContainerCount"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 3
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }
}

# Alert — node CPU high
resource "azurerm_monitor_metric_alert" "node_cpu" {
  name                = "alert-node-cpu-${var.prefix}"
  resource_group_name = var.resource_group_name
  scopes              = [var.aks_cluster_id]
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"
  tags                = var.tags

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_cpu_usage_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }
}

# Azure Managed Grafana
resource "azurerm_dashboard_grafana" "main" {
  name                              = "grafana-${var.prefix}"
  resource_group_name               = var.resource_group_name
  location                          = var.location
  sku                               = "Standard"
  grafana_major_version             = 10
  zone_redundancy_enabled           = true
  api_key_enabled                   = false
  deterministic_outbound_ip_enabled = false
  public_network_access_enabled     = true
  tags                              = var.tags
}
