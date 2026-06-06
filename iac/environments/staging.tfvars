###############################################################################
# environments/staging.tfvars
# Smaller, cheaper configuration for staging/QA
###############################################################################

app_name       = "cloudtask"
environment    = "staging"
location       = "westeurope"
location_short = "we"
cost_center    = "engineering"

vnet_address_space    = ["10.1.0.0/16"]
subnet_aks_cidr       = "10.1.1.0/24"
subnet_data_cidr      = "10.1.2.0/24"
subnet_endpoints_cidr = "10.1.3.0/24"

kubernetes_version    = "1.29"
aks_system_node_count = 1 # Single node for staging — cost saving
aks_user_node_min     = 1
aks_user_node_max     = 3
aks_system_vm_size    = "Standard_D2s_v3"
aks_user_vm_size      = "Standard_D2s_v3" # Smaller VM for staging

db_sku         = "B_Standard_B1ms" # Burstable — much cheaper for staging
db_storage_mb  = 32768             # 32 GB
db_name        = "cloudtaskdb"
db_admin_login = "pgadmin"

custom_domain  = "staging.example.com"
alert_email    = "devops@example.com"
allowed_origin = "https://staging.example.com"
