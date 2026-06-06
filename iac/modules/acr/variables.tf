variable "resource_group_name"    { type = string }
variable "location"               { type = string }
variable "prefix"                 { type = string }
variable "tags"                   { type = map(string) }
variable "subnet_endpoints_id"    { type = string }
variable "vnet_id"                { type = string }
variable "acr_private_dns_zone_id" { type = string }
