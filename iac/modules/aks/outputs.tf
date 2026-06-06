output "cluster_name"             { value = azurerm_kubernetes_cluster.main.name }
output "cluster_id"               { value = azurerm_kubernetes_cluster.main.id }
output "kube_config"              { value = azurerm_kubernetes_cluster.main.kube_config[0]  sensitive = true }
output "oidc_issuer_url"          { value = azurerm_kubernetes_cluster.main.oidc_issuer_url }
output "kubelet_identity_object_id" { value = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id }
output "api_mi_client_id"         { value = azurerm_user_assigned_identity.api.client_id }
output "worker_mi_client_id"      { value = azurerm_user_assigned_identity.worker.client_id }
output "api_mi_principal_id"      { value = azurerm_user_assigned_identity.api.principal_id }
output "worker_mi_principal_id"   { value = azurerm_user_assigned_identity.worker.principal_id }
output "nginx_ingress_private_ip" { value = "10.0.1.100" } # Set after NGINX Helm install
