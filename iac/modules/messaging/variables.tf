variable "resource_group_name" { type = string }
variable "location"            { type = string }
variable "prefix"              { type = string }
variable "tags"                { type = map(string) }
variable "subnet_endpoints_id" { type = string }
variable "vnet_id"             { type = string }
variable "api_mi_principal_id"    { type = string }
variable "worker_mi_principal_id" { type = string }
