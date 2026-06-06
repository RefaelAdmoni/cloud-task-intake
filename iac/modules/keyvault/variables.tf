variable "resource_group_name"          { type = string }
variable "location"                     { type = string }
variable "prefix"                       { type = string }
variable "tags"                         { type = map(string) }
variable "subnet_endpoints_id"          { type = string }
variable "vnet_id"                      { type = string }
variable "keyvault_private_dns_zone_id" { type = string }
variable "aks_kubelet_identity_id"      { type = string }
variable "api_mi_principal_id"          { type = string }
variable "db_connection_string"         { type = string  sensitive = true }
variable "servicebus_connection_string" { type = string  sensitive = true }
variable "storage_connection_string"    { type = string  sensitive = true }
variable "worker_mi_principal_id" { type = string }
variable "terraform_principal_id" { type = string }
