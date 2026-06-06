###############################################################################
# environments/prod.tfvars
# Usage: terraform apply -var-file=environments/prod.tfvars
###############################################################################

app_name       = "cloudtask"
environment    = "prod"
location       = "westeurope"
location_short = "we"
cost_center    = "engineering"

# ── Networking ────────────────────────────────────────────────────────────────
vnet_address_space    = ["10.0.0.0/16"]
subnet_aks_cidr       = "10.0.1.0/24"
subnet_data_cidr      = "10.0.2.0/24"
subnet_endpoints_cidr = "10.0.3.0/24"

# ── AKS ───────────────────────────────────────────────────────────────────────
kubernetes_version    = "1.29"
aks_system_node_count = 2
aks_user_node_min     = 2
aks_user_node_max     = 10
aks_system_vm_size    = "Standard_D2s_v3"
aks_user_vm_size      = "Standard_D4s_v3"

# ── Database ──────────────────────────────────────────────────────────────────
db_sku         = "GP_Standard_D2s_v3" # General Purpose — 2 vCores, 8 GB RAM
db_storage_mb  = 65536                # 64 GB — expand online as needed
db_name        = "cloudtaskdb"
db_admin_login = "pgadmin"

# ── Application ───────────────────────────────────────────────────────────────
custom_domain  = "app.example.com" # Replace with actual domain
alert_email    = "devops@example.com"
allowed_origin = "https://app.example.com" # Replace with actual domain
