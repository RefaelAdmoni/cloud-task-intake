variable "resource_group_name" { type = string }
variable "prefix"              { type = string }
variable "tags"                { type = map(string) }
variable "swa_hostname"        { type = string }
variable "aks_ingress_hostname" { type = string }
variable "custom_domain"       { type = string }
