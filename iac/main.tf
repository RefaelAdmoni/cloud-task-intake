###############################################################################
# Cloud Task Intake — Azure Production Infrastructure
# Author  : Senior DevOps
# Purpose : Root module — provider config, remote state backend, module wiring
###############################################################################

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.50"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.53"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.1.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0.3"
    }
  }

  # Remote state: stored in Azure Blob Storage.
  # WHY: Never store .tfstate locally or in Git — it contains plaintext secrets.
  # Blob lease provides distributed locking so two engineers can't apply simultaneously.
  backend "azurerm" {
    resource_group_name  = "rg-tfstate-shared"
    storage_account_name = "stcloudtasktfstate"   # must be globally unique
    container_name       = "tfstate"
    key                  = "cloudtask/prod.terraform.tfstate"
    # Authentication via ARM_* env vars or az CLI — no static credentials here.
  }
}

###############################################################################
# Providers
###############################################################################

provider "azurerm" {
  features {
    key_vault {
      # Ensure soft-deleted keys/secrets are purged on destroy (useful for CI).
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      # Prevent accidental destruction of a non-empty RG.
      prevent_deletion_if_contains_resources = true
    }
  }
}

provider "azuread" {}

# Helm + Kubernetes providers are configured AFTER AKS is created,
# using the cluster's kubeconfig output. This avoids chicken-and-egg issues.
provider "helm" {
  kubernetes {
    host                   = module.aks.kube_config.host
    client_certificate     = base64decode(module.aks.kube_config.client_certificate)
    client_key             = base64decode(module.aks.kube_config.client_key)
    cluster_ca_certificate = base64decode(module.aks.kube_config.cluster_ca_certificate)
  }
}

provider "kubernetes" {
  host                   = module.aks.kube_config.host
  client_certificate     = base64decode(module.aks.kube_config.client_certificate)
  client_key             = base64decode(module.aks.kube_config.client_key)
  cluster_ca_certificate = base64decode(module.aks.kube_config.cluster_ca_certificate)
}

###############################################################################
# Resource Group
# WHY: All prod resources share one RG for unified lifecycle, RBAC, and billing.
###############################################################################

resource "azurerm_resource_group" "main" {
  name     = "rg-${var.app_name}-${var.environment}-${var.location_short}"
  location = var.location

  tags = local.common_tags
}

###############################################################################
# Locals — shared values used across modules
###############################################################################

locals {
  common_tags = {
    application = var.app_name
    environment = var.environment
    managed_by  = "terraform"
    team        = "devops"
    cost_center = var.cost_center
  }

  # Naming prefix used in every module: e.g. "cloudtask-prod"
  prefix = "${var.app_name}-${var.environment}"
}

###############################################################################
# Modules — called in dependency order
###############################################################################

module "networking" {
  source = "./modules/networking"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = local.prefix
  tags                = local.common_tags

  vnet_address_space      = var.vnet_address_space
  subnet_aks_cidr         = var.subnet_aks_cidr
  subnet_data_cidr        = var.subnet_data_cidr
  subnet_endpoints_cidr   = var.subnet_endpoints_cidr
}

module "acr" {
  source = "./modules/acr"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = local.prefix
  tags                = local.common_tags

  subnet_endpoints_id  = module.networking.subnet_endpoints_id
  vnet_id              = module.networking.vnet_id
  acr_private_dns_zone_id = module.networking.acr_private_dns_zone_id
}


# Bootstrap Log Analytics Workspace — created before AKS because AKS Container
# Insights needs the workspace ID at cluster creation time.
# The monitoring module also creates this but we need it earlier in the graph.
resource "azurerm_log_analytics_workspace" "bootstrap" {
  name                = "law-${local.prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
  tags                = local.common_tags
}

module "aks" {
  source = "./modules/aks"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = local.prefix
  tags                = local.common_tags

  subnet_aks_id              = module.networking.subnet_aks_id
  acr_id                     = module.acr.acr_id
  system_node_count          = var.aks_system_node_count
  user_node_min              = var.aks_user_node_min
  user_node_max              = var.aks_user_node_max
  system_vm_size             = var.aks_system_vm_size
  user_vm_size               = var.aks_user_vm_size
  kubernetes_version         = var.kubernetes_version
  log_analytics_workspace_id = azurerm_log_analytics_workspace.bootstrap.id
}

module "database" {
  source = "./modules/database"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = local.prefix
  tags                = local.common_tags

  subnet_data_id      = module.networking.subnet_data_id
  private_dns_zone_id = module.networking.postgres_private_dns_zone_id
  db_sku              = var.db_sku
  db_storage_mb       = var.db_storage_mb
  db_name             = var.db_name
  db_admin_login      = var.db_admin_login
}

module "messaging" {
  source = "./modules/messaging"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = local.prefix
  tags                = local.common_tags

  subnet_endpoints_id  = module.networking.subnet_endpoints_id
  vnet_id              = module.networking.vnet_id
  api_mi_principal_id    = module.aks.api_mi_principal_id
  worker_mi_principal_id = module.aks.worker_mi_principal_id
}

module "storage" {
  source = "./modules/storage"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = local.prefix
  tags                = local.common_tags

  subnet_endpoints_id      = module.networking.subnet_endpoints_id
  vnet_id                  = module.networking.vnet_id
  blob_private_dns_zone_id = module.networking.blob_private_dns_zone_id
  allowed_origin           = "https://${var.custom_domain}"
  api_mi_principal_id      = module.aks.api_mi_principal_id
}

module "keyvault" {
  source = "./modules/keyvault"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = local.prefix
  tags                = local.common_tags

  subnet_endpoints_id          = module.networking.subnet_endpoints_id
  vnet_id                      = module.networking.vnet_id
  keyvault_private_dns_zone_id = module.networking.keyvault_private_dns_zone_id
  aks_kubelet_identity_id      = module.aks.kubelet_identity_object_id
  api_mi_principal_id          = module.aks.api_mi_principal_id
  worker_mi_principal_id       = module.aks.worker_mi_principal_id
  terraform_principal_id       = data.azurerm_client_config.current.object_id
  db_connection_string         = module.database.connection_string
  servicebus_connection_string = module.messaging.primary_connection_string
  storage_connection_string    = module.storage.connection_string
}

module "frontdoor" {
  source = "./modules/frontdoor"

  resource_group_name  = azurerm_resource_group.main.name
  prefix               = local.prefix
  tags                 = local.common_tags

  swa_hostname         = module.swa.default_hostname
  aks_ingress_hostname = module.aks.nginx_ingress_private_ip
  custom_domain        = var.custom_domain
}

module "monitoring" {
  source = "./modules/monitoring"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = local.prefix
  tags                = local.common_tags

  aks_cluster_id      = module.aks.cluster_id
  alert_email         = var.alert_email
}

module "swa" {
  source = "./modules/swa"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = local.prefix
  tags                = local.common_tags
}

###############################################################################
# GitHub Actions Managed Identity + RBAC
#
# זהות ייעודית ל-CI/CD — נפרדת מהMIs של ה-pods.
# WHY נפרד: ל-GitHub Actions יש הרשאות deploy בלבד — לא הרשאות runtime.
# Pod MIs לא צריכים לדחוף images, GHA MI לא צריך לגשת ל-Key Vault.
###############################################################################

resource "azurerm_user_assigned_identity" "github_actions" {
  name                = "mi-${local.prefix}-gha"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}

# Federated credential — רק ל-main branch (prod deploys)
resource "azurerm_federated_identity_credential" "github_actions" {
  name                = "fedcred-${local.prefix}-gha"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.github_actions.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  # subject מגביל לבקשות מ-main branch בלבד
  subject             = "repo:RefaelAdmoni/cloud-task-intake:ref:refs/heads/main"
}

# Federated credential נוסף — ל-hotfix branches
resource "azurerm_federated_identity_credential" "github_actions_hotfix" {
  name                = "fedcred-${local.prefix}-gha-hotfix"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.github_actions.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:RefaelAdmoni/cloud-task-intake:ref:refs/heads/hotfix/*"
}

# GHA → ACR: AcrPush — דחיפת images לאחר build
resource "azurerm_role_assignment" "gha_acr_push" {
  scope                = module.acr.acr_id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id

  depends_on = [azurerm_user_assigned_identity.github_actions]
}

resource "azurerm_role_assignment" "gha_aks_user" {
  scope                = module.aks.cluster_id
  role_definition_name = "Azure Kubernetes Service Cluster User Role"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id

  depends_on = [azurerm_user_assigned_identity.github_actions]
}

data "azurerm_client_config" "current" {}

resource "azurerm_role_assignment" "terraform_rg_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = data.azurerm_client_config.current.object_id

  # WHY depends_on RG: ה-RG חייב להיות קיים לפני שניתן לתת הרשאות עליו
  depends_on = [azurerm_resource_group.main]
}
