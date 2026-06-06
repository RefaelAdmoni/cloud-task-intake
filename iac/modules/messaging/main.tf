###############################################################################
# Module: messaging — Azure Service Bus
###############################################################################

resource "azurerm_servicebus_namespace" "main" {
  name                = "sb-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Standard"
  # WHY Standard not Premium:
  # Premium supports VNet integration + private endpoints, but costs ~10x more.
  # Standard with network rules (IP filter) is sufficient here because the
  # connection string is stored in Key Vault and only pods with Workload Identity
  # can retrieve it. For stricter environments, upgrade to Premium.
  # NOTE: To add private endpoint, upgrade to Premium first.

  tags = var.tags
}

resource "azurerm_servicebus_queue" "tasks" {
  name         = "tasks"
  namespace_id = azurerm_servicebus_namespace.main.id

  # WHY these settings:
  # - lock_duration: 5 min — worker has 5 min to process before message re-appears
  # - max_delivery_count: 5 — after 5 failed attempts, move to dead-letter queue
  # - dead_lettering_on_message_expiration: automatic DLQ on TTL expiry
  lock_duration                        = "PT5M"
  max_size_in_megabytes                = 5120
  default_message_ttl                  = "P14D" # 14 days max TTL
  dead_lettering_on_message_expiration = true
  max_delivery_count                   = 5
  requires_duplicate_detection         = false
  requires_session                     = false
}

# Dead-letter monitoring queue (separate from the built-in DLQ, for alerting)
resource "azurerm_servicebus_queue" "tasks_dlq_monitor" {
  name               = "tasks-dlq-monitor"
  namespace_id       = azurerm_servicebus_namespace.main.id
  max_delivery_count = 1
}

# Auth rule — send-only (for API pods)
resource "azurerm_servicebus_queue_authorization_rule" "send" {
  name     = "send-only"
  queue_id = azurerm_servicebus_queue.tasks.id
  listen   = false
  send     = true
  manage   = false
}

# Auth rule — listen-only (for worker pods)
resource "azurerm_servicebus_queue_authorization_rule" "listen" {
  name     = "listen-only"
  queue_id = azurerm_servicebus_queue.tasks.id
  listen   = true
  send     = false
  manage   = false
}

###############################################################################
# RBAC — Service Bus
# API MI: Azure Service Bus Data Sender  (שליחת הודעות ל-queue)
# Worker MI: Azure Service Bus Data Receiver (קריאה ועיבוד הודעות)
#
# WHY נפרד ולא Manage role לשניהם:
# Least-privilege — ה-API לא צריך לקרוא הודעות, ה-Worker לא צריך לשלוח.
# Manage role נותן גם ניהול namespace — מסוכן לתת לפודים.
###############################################################################

resource "azurerm_role_assignment" "api_sb_sender" {
  scope                = azurerm_servicebus_namespace.main.id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = var.api_mi_principal_id

  # WHY depends_on: Terraform עלול לנסות ליצור את ה-role assignment
  # לפני שה-namespace קיים ב-Azure (propagation delay).
  # depends_on מבטיח סדר יצירה מפורש.
  depends_on = [azurerm_servicebus_namespace.main]
}

resource "azurerm_role_assignment" "worker_sb_receiver" {
  scope                = azurerm_servicebus_namespace.main.id
  role_definition_name = "Azure Service Bus Data Receiver"
  principal_id         = var.worker_mi_principal_id

  depends_on = [azurerm_servicebus_namespace.main]
}
