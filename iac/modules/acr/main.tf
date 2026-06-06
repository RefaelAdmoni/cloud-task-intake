###############################################################################
# Module: acr — Azure Container Registry
###############################################################################

resource "azurerm_container_registry" "main" {
  name                = "acr${replace(var.prefix, "-", "")}"  # No hyphens allowed
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Premium"
  # WHY Premium not Standard:
  # Private endpoints are only available on Premium tier.
  # Premium also includes: geo-replication, content trust (image signing),
  # and customer-managed keys. The cost delta (~$165/mo) is worth it for
  # production where image pull over public internet is a security risk.

  admin_enabled = false
  # WHY admin disabled: admin credentials are static username/password —
  # exactly what we're avoiding. AKS uses Managed Identity (AcrPull role)
  # to pull images, which needs no credentials at all.

  # Quarantine: images must pass security scan before they can be pulled.
  # This prevents deploying images with known critical CVEs.
  quarantine_policy_enabled = true

  # Retention: untagged manifests (leftover from builds) deleted after 7 days.
  retention_policy {
    days    = 7
    enabled = true
  }

  # Trust policy: only signed images can be pulled (requires Notary).
#  trust_policy {
#    enabled = false   # Enable when image signing workflow is set up
#  }

  tags = var.tags
}

# Private endpoint — ACR traffic stays within the VNet.
resource "azurerm_private_endpoint" "acr" {
  name                = "pe-acr-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_endpoints_id

  private_service_connection {
    name                           = "psc-acr-${var.prefix}"
    private_connection_resource_id = azurerm_container_registry.main.id
    is_manual_connection           = false
    subresource_names              = ["registry"]
  }

  private_dns_zone_group {
    name                 = "dns-acr"
    private_dns_zone_ids = [var.acr_private_dns_zone_id]
  }

  tags = var.tags
}

# Microsoft Defender for Containers — vulnerability scanning on image push.
resource "azurerm_security_center_subscription_pricing" "containers" {
  tier          = "Standard"
  resource_type = "ContainerRegistry"
}
