###############################################################################
# Module: networking
# Creates: VNet, 3 subnets, NSGs, Private DNS Zones, Private Endpoints base
#
# WHY THIS MODULE EXISTS SEPARATELY:
# Networking is the foundation everything else depends on. Keeping it isolated
# means `terraform destroy -target module.networking` is intentionally hard
# (other modules would error), acting as a safety guard against accidental deletion.
###############################################################################

###############################################################################
# Virtual Network
###############################################################################

resource "azurerm_virtual_network" "main" {
  name                = "vnet-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = var.vnet_address_space

  # WHY: Azure DNS is the default — gives us automatic private DNS resolution
  # for private endpoints without maintaining custom DNS servers.
  dns_servers = []

  tags = var.tags
}

###############################################################################
# Subnets
# Three subnets enforce network segmentation:
#   1. snet-aks       — AKS node VMs (pods get IPs from here via Azure CNI)
#   2. snet-data      — PostgreSQL private endpoint only
#   3. snet-endpoints — All other private endpoints (Service Bus, Blob, KV, ACR)
###############################################################################

resource "azurerm_subnet" "aks" {
  name                 = "snet-aks"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.subnet_aks_cidr]

  # WHY: Delegating to AKS allows Azure to manage NIC attachment automatically.
  # Without this, Azure CNI node provisioning fails.
  service_endpoints = ["Microsoft.ContainerRegistry"]
}

resource "azurerm_subnet" "data" {
  name                 = "snet-data"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.subnet_data_cidr]

  # WHY: private_endpoint_network_policies must be Disabled for private endpoints
  # to receive traffic. Azure requirement — not optional.
  private_endpoint_network_policies_enabled = false
}

resource "azurerm_subnet" "endpoints" {
  name                 = "snet-endpoints"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.subnet_endpoints_cidr]

  private_endpoint_network_policies_enabled = false
}

###############################################################################
# Network Security Groups
# WHY NSGs even with private endpoints?
# Defence in depth — private endpoints prevent internet access, NSGs prevent
# lateral movement within the VNet (e.g., a compromised pod shouldn't be able
# to reach the data subnet directly on non-DB ports).
###############################################################################

resource "azurerm_network_security_group" "aks" {
  name                = "nsg-aks-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags

  # Allow HTTPS inbound from Front Door service tag only.
  # Front Door service tag covers all Azure Front Door backend IPs.
  security_rule {
    name                       = "AllowFrontDoorHttps"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "AzureFrontDoor.Backend"
    destination_address_prefix = var.subnet_aks_cidr
  }

  # Allow AKS node-to-node and node-to-pod communication (required by kubelet).
  security_rule {
    name                       = "AllowAksInternal"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.subnet_aks_cidr
    destination_address_prefix = var.subnet_aks_cidr
  }

  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks.id
}

resource "azurerm_network_security_group" "data" {
  name                = "nsg-data-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags

  # Only allow PostgreSQL port from AKS subnet.
  security_rule {
    name                       = "AllowPostgresFromAks"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5432"
    source_address_prefix      = var.subnet_aks_cidr
    destination_address_prefix = var.subnet_data_cidr
  }

  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "data" {
  subnet_id                 = azurerm_subnet.data.id
  network_security_group_id = azurerm_network_security_group.data.id
}

###############################################################################
# Private DNS Zones
# WHY: Private endpoints get a private IP, but services still use their FQDN
# (e.g. myserver.postgres.database.azure.com). The private DNS zone overrides
# public DNS resolution inside the VNet, so the FQDN resolves to the private IP.
# Without this, clients would resolve the FQDN to the public IP and be rejected.
###############################################################################

resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "link-postgres-${var.prefix}"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false
  tags                  = var.tags
}

resource "azurerm_private_dns_zone" "servicebus" {
  name                = "privatelink.servicebus.windows.net"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "servicebus" {
  name                  = "link-sb-${var.prefix}"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.servicebus.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false
  tags                  = var.tags
}

resource "azurerm_private_dns_zone" "blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "blob" {
  name                  = "link-blob-${var.prefix}"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.blob.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false
  tags                  = var.tags
}

resource "azurerm_private_dns_zone" "keyvault" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "keyvault" {
  name                  = "link-kv-${var.prefix}"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.keyvault.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false
  tags                  = var.tags
}

resource "azurerm_private_dns_zone" "acr" {
  name                = "privatelink.azurecr.io"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "acr" {
  name                  = "link-acr-${var.prefix}"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.acr.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false
  tags                  = var.tags
}
