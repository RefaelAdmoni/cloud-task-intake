variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "prefix" { type = string }
variable "tags" { type = map(string) }
variable "subnet_data_id" { type = string }
variable "private_dns_zone_id" { type = string }
variable "db_sku" { type = string }
variable "db_storage_mb" { type = number }
variable "db_name" { type = string }
variable "db_admin_login" { type = string }
variable "high_availability_enabled" {
  type    = bool
  default = false
}
variable "enable_geo_redundant_backup" {
  type    = bool
  default = false
}
variable "backup_retention_days" {
  type    = number
  default = 7
}
