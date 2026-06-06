###############################################################################
# Module: aks
# Creates: AKS cluster, system + user node pools, Workload Identity, OIDC issuer
#
# KEY DECISIONS:
# - Azure CNI (not kubenet): pods get VNet IPs → direct private endpoint access
# - Two node pools: system (tainted, k8s-only) and user (application workloads)
# - Workload Identity: pods authenticate to Azure AD without any static secret
# - OIDC Issuer: required for Workload Identity federation
###############################################################################

data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

###############################################################################
# AKS Cluster
###############################################################################

resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.prefix
  kubernetes_version  = var.kubernetes_version

  # WHY private_cluster_enabled = false here:
  # We use Front Door → private endpoint → NGINX ingress for data plane,
  # but keep the AKS API server reachable by GitHub Actions (which uses
  # az aks get-credentials). For fully locked-down environments, set this
  # to true and add a self-hosted runner inside the VNet.
  private_cluster_enabled = false

  # OIDC issuer is REQUIRED for Workload Identity to work.
  # It exposes a well-known endpoint that Azure AD uses to validate pod tokens.
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  # Automatic channel: Azure handles patch-version upgrades automatically.
  # WHY 'patch' not 'rapid': patch only upgrades 1.29.x → 1.29.y (same minor),
  # which is safe. 'rapid' can upgrade minor versions unexpectedly.
  automatic_upgrade_channel = "patch"

  # System node pool — only Kubernetes system components run here.
  # Taint prevents application pods from landing here accidentally.
  default_node_pool {
    name                 = "system"
    node_count           = var.system_node_count
    vm_size              = var.system_vm_size
    vnet_subnet_id       = var.subnet_aks_id
    os_disk_size_gb      = 100
    os_disk_type         = "Managed"  # Managed = standard SSD; Ephemeral has size limits
    type                 = "VirtualMachineScaleSets"
    zones                = ["1", "2"]  # Spread across 2 AZs for zone-level HA
    only_critical_addons_enabled = true  # Taint = CriticalAddonsOnly


    upgrade_settings {
      max_surge = "33%"   # Allow 33% extra nodes during upgrade (rolling, no downtime)
    }
  }

  identity {
    type = "SystemAssigned"
    # WHY SystemAssigned not UserAssigned for the cluster identity:
    # Cluster identity manages infrastructure (Load Balancer, disk CSI) — it's
    # tightly coupled to the cluster lifecycle. Workload Identity (per-pod) uses
    # UserAssigned MIs.
  }

  network_profile {
    network_plugin    = "azure"   # Azure CNI: pods get real VNet IPs
    network_policy    = "calico"  # Calico enforces Kubernetes NetworkPolicy objects
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
    service_cidr      = "10.1.0.0/16"
    dns_service_ip    = "10.1.0.10"
  }

  # Container Insights — sends pod logs/metrics to Log Analytics.
  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  # Key Vault Secrets Store CSI Driver — mounts Key Vault secrets as files.
  # WHY: This is how pods get secrets without env vars or Kubernetes Secrets.
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"   # Re-sync every 2 minutes
  }

  azure_policy_enabled = true   # Enforces Azure Policy (e.g. block privileged containers)

  tags = var.tags

  lifecycle {
    # Prevent accidental Kubernetes version downgrade.
    ignore_changes = [kubernetes_version]
  }
}

###############################################################################
# User Node Pool — application workloads (API, Worker)
# Separate from system pool so we can scale app nodes independently.
###############################################################################

resource "azurerm_kubernetes_cluster_node_pool" "user" {
  name                  = "user"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.user_vm_size
  vnet_subnet_id        = var.subnet_aks_id
  os_disk_size_gb       = 128
  os_disk_type          = "Managed"
  zones                 = ["1", "2"]

  # Cluster Autoscaler — scales node count based on pending pods.
  auto_scaling_enabled = true
  min_count           = var.user_node_min
  max_count           = var.user_node_max

  # Node labels — used by pod nodeSelector to ensure apps land on user nodes.
  node_labels = {
    "workload" = "application"
  }

  upgrade_settings {
    max_surge = "33%"
  }

  tags = var.tags
}

###############################################################################
# ACR → AKS attachment
# WHY: AKS kubelet identity needs AcrPull role to pull images from ACR.
# Without this, image pulls fail with "unauthorized" even inside the VNet.
###############################################################################

resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

###############################################################################
# Workload Identity — Managed Identity for API pods
# This MI is what the API pod "becomes" when talking to Service Bus, Blob, KV.
###############################################################################

resource "azurerm_user_assigned_identity" "api" {
  name                = "mi-${var.prefix}-api"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_user_assigned_identity" "worker" {
  name                = "mi-${var.prefix}-worker"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

# Federated credential — links the K8s Service Account to the Azure MI.
# Subject format: system:serviceaccount:<namespace>:<service-account-name>
resource "azurerm_federated_identity_credential" "api" {
  name                = "fedcred-${var.prefix}-api"
  resource_group_name = var.resource_group_name
  parent_id           = azurerm_user_assigned_identity.api.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.main.oidc_issuer_url
  subject             = "system:serviceaccount:default:sa-api"
}

resource "azurerm_federated_identity_credential" "worker" {
  name                = "fedcred-${var.prefix}-worker"
  resource_group_name = var.resource_group_name
  parent_id           = azurerm_user_assigned_identity.worker.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.main.oidc_issuer_url
  subject             = "system:serviceaccount:default:sa-worker"
}
