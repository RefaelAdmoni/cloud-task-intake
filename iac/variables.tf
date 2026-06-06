###############################################################################
# Root variables — passed in via environments/*.tfvars
###############################################################################

variable "app_name" {
  description = "Short application identifier. Used in every resource name."
  type        = string
  default     = "cloudtask"
}

variable "environment" {
  description = "Deployment environment: prod | staging | dev"
  type        = string
  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "environment must be prod, staging, or dev."
  }
}

variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "westeurope"
}

variable "location_short" {
  description = "Short region code for naming (e.g. 'we' for westeurope)."
  type        = string
  default     = "we"
}

variable "cost_center" {
  description = "Cost centre tag applied to all resources."
  type        = string
  default     = "engineering"
}

# ── Networking ────────────────────────────────────────────────────────────────
variable "vnet_address_space" {
  description = "CIDR block for the Virtual Network."
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "subnet_aks_cidr" {
  type    = string
  default = "10.0.1.0/24"
}

variable "subnet_data_cidr" {
  type    = string
  default = "10.0.2.0/24"
}

variable "subnet_endpoints_cidr" {
  type    = string
  default = "10.0.3.0/24"
}

# ── AKS ───────────────────────────────────────────────────────────────────────
variable "kubernetes_version" {
  description = "Kubernetes version for AKS. Always pin to a specific minor version."
  type        = string
  default     = "1.29"
}

variable "aks_system_node_count" {
  description = "Fixed node count for the system node pool (no autoscale)."
  type        = number
  default     = 2
}

variable "aks_user_node_min" {
  type    = number
  default = 2
}

variable "aks_user_node_max" {
  type    = number
  default = 10
}

variable "aks_system_vm_size" {
  type    = string
  default = "Standard_D2s_v3"
}

variable "aks_user_vm_size" {
  type    = string
  default = "Standard_D4s_v3"
}

# ── Database ──────────────────────────────────────────────────────────────────
variable "db_sku" {
  description = "PostgreSQL Flexible Server SKU. GP = General Purpose."
  type        = string
  default     = "GP_Standard_D2s_v3"
}

variable "db_storage_mb" {
  type    = number
  default = 65536 # 64 GB
}

variable "db_name" {
  type    = string
  default = "cloudtaskdb"
}

variable "db_admin_login" {
  description = "PostgreSQL admin username. Password is auto-generated and stored in Key Vault."
  type        = string
  default     = "pgadmin"
}

# ── Application ───────────────────────────────────────────────────────────────
variable "custom_domain" {
  description = "Custom domain for Front Door (e.g. app.example.com)."
  type        = string
}

variable "alert_email" {
  description = "Email address for Azure Monitor alert notifications."
  type        = string
}
