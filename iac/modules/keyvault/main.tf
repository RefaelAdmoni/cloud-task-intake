###############################################################################
# Module: keyvault — Azure Key Vault + secrets storage
###############################################################################

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                = "kv-${var.prefix}" # Max 24 chars
  location            = var.location
  resource_group_name = var.resource_group_name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  # Soft delete: deleted secrets recoverable for 90 days.
  # WHY: Accidental deletion of a production secret shouldn't be catastrophic.
  soft_delete_retention_days = 90
  purge_protection_enabled   = true # Prevents force-purge during retention period

  # Disable public network access — Key Vault only reachable via private endpoint.
  public_network_access_enabled = false

  # RBAC authorization model (not the older access policies model).
  # WHY RBAC: Centrally managed in Azure AD, auditable, integrates with PIM.
  enable_rbac_authorization = true

  network_acls {
    bypass                     = "AzureServices"
    default_action             = "Deny"
    ip_rules                   = [] # No public IP access
    virtual_network_subnet_ids = []
  }

  tags = var.tags
}

# Private endpoint
resource "azurerm_private_endpoint" "keyvault" {
  name                = "pe-kv-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_endpoints_id

  private_service_connection {
    name                           = "psc-kv-${var.prefix}"
    private_connection_resource_id = azurerm_key_vault.main.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "dns-kv"
    private_dns_zone_ids = [var.keyvault_private_dns_zone_id]
  }

  tags = var.tags
}

###############################################################################
# RBAC assignments
# WHY per-identity assignments: least-privilege — API gets read, no write.
# The Terraform runner (CI/CD) gets Officer to write secrets at deploy time.
###############################################################################

# AKS kubelet (for Secrets Store CSI Driver) — Secret User = read-only
resource "azurerm_role_assignment" "aks_kv_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.aks_kubelet_identity_id
}

# API Managed Identity — also needs Secret User
resource "azurerm_role_assignment" "api_kv_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.api_mi_principal_id
}

###############################################################################
# Secrets — all application secrets stored here at deploy time
###############################################################################

resource "azurerm_key_vault_secret" "db_connection" {
  name         = "db-connection-string"
  value        = var.db_connection_string
  key_vault_id = azurerm_key_vault.main.id

  tags = var.tags

  depends_on = [azurerm_role_assignment.aks_kv_user]
}

resource "azurerm_key_vault_secret" "servicebus_connection" {
  name         = "servicebus-connection-string"
  value        = var.servicebus_connection_string
  key_vault_id = azurerm_key_vault.main.id
  tags         = var.tags
}

resource "azurerm_key_vault_secret" "storage_connection" {
  name         = "storage-connection-string"
  value        = var.storage_connection_string
  key_vault_id = azurerm_key_vault.main.id
  tags         = var.tags
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false # JWT secrets work best with alphanumeric only
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = random_password.jwt_secret.result
  key_vault_id = azurerm_key_vault.main.id
  tags         = var.tags
}

# Worker MI — גם Worker צריך לקרוא secrets (DB connection, SB connection)
resource "azurerm_role_assignment" "worker_kv_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.worker_mi_principal_id
}

# Terraform runner — נדרש ליצירת/עדכון secrets ב-apply time
# WHY Key Vault Administrator ולא Secrets Officer:
# Administrator נדרש גם לניהול access policies ו-purge protection.
# בסביבת prod, כדאי להחליף ל-Key Vault Secrets Officer לאחר ה-setup הראשוני.
resource "azurerm_role_assignment" "terraform_kv_admin" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = var.terraform_principal_id
}
