variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "prefix" { type = string }
variable "tags" { type = map(string) }
variable "vnet_address_space" { type = list(string) }
variable "subnet_aks_cidr" { type = string }
variable "subnet_data_cidr" { type = string }
variable "subnet_endpoints_cidr" { type = string }
