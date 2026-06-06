output "endpoint_hostname" {
  value = azurerm_cdn_frontdoor_endpoint.main.host_name
}
output "profile_id" {
  value = azurerm_cdn_frontdoor_profile.main.id
}
output "custom_domain_validation_token" {
  description = "Token needed for dns-request.md _dnsauth CNAME record"
  value       = azurerm_cdn_frontdoor_custom_domain.main.validation_token
}
