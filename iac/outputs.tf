###############################################################################
# Root outputs — values needed by CI/CD and operators
###############################################################################

output "aks_cluster_name" {
  description = "AKS cluster name — used in GitHub Actions: az aks get-credentials"
  value       = module.aks.cluster_name
}

output "aks_resource_group" {
  value = azurerm_resource_group.main.name
}

output "acr_login_server" {
  description = "ACR login server — used in docker build/push commands"
  value       = module.acr.login_server
}

output "acr_name" {
  description = "ACR resource name — used by GitHub Actions when requesting an ACR token"
  value       = module.acr.acr_name
}

output "key_vault_uri" {
  description = "Key Vault URI — referenced by Secrets Store CSI Driver"
  value       = module.keyvault.vault_uri
}

output "key_vault_name" {
  description = "Key Vault name — passed into the Helm chart SecretProviderClass"
  value       = module.keyvault.vault_name
}

output "frontend_default_hostname" {
  description = "Azure Static Web Apps default hostname (before custom domain)"
  value       = module.swa.default_hostname
}

output "frontdoor_endpoint_hostname" {
  description = "Azure Front Door endpoint hostname — set as Cloudflare CNAME target"
  value       = module.frontdoor.endpoint_hostname
}

output "app_hostname" {
  description = "Application hostname used by the API ingress"
  value       = var.custom_domain
}

output "servicebus_namespace" {
  value = module.messaging.namespace_name
}

output "storage_account_name" {
  value = module.storage.account_name
}

# STS / Workload Identity outputs — נדרשים ל-helm deploy ול-GitHub Actions vars
output "api_mi_client_id" {
  description = "Client ID של API Managed Identity — PROD_API_MI_CLIENT_ID ב-GitHub vars"
  value       = module.aks.api_mi_client_id
}

output "worker_mi_client_id" {
  description = "Client ID של Worker Managed Identity — PROD_WORKER_MI_CLIENT_ID ב-GitHub vars"
  value       = module.aks.worker_mi_client_id
}

output "tenant_id" {
  description = "Azure AD Tenant ID — AZURE_TENANT_ID ב-GitHub secrets"
  value       = data.azurerm_client_config.current.tenant_id
}

output "gha_mi_client_id" {
  description = "GitHub Actions Managed Identity Client ID — AZURE_CLIENT_ID ב-GitHub secrets"
  value       = azurerm_user_assigned_identity.github_actions.client_id
}

output "oidc_issuer_url" {
  description = "AKS OIDC Issuer URL — ה-issuer שנרשם ב-Federated Identity Credential"
  value       = module.aks.oidc_issuer_url
}
