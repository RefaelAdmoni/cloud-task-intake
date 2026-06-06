variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "prefix" { type = string }
variable "tags" { type = map(string) }
variable "subnet_endpoints_id" { type = string }
variable "vnet_id" { type = string }
variable "blob_private_dns_zone_id" { type = string }
variable "allowed_origin" {
  description = "CORS allowed origin for browser uploads. e.g. https://app.example.com"
  type        = string
}
variable "api_mi_principal_id" { type = string }
