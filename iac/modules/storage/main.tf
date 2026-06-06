###############################################################################
# Module: storage — Azure Blob Storage
#
# SECURITY MODEL:
#   public_network_access_enabled = true   → data plane נגיש מהאינטרנט
#   allow_nested_items_to_be_public = false → אין anonymous access
#   shared_access_key_enabled = true        → SAS tokens עובדים
#
# כל בקשה ללא SAS token חוקי נדחית ב-403.
# SAS token שלנו: Write-only, 15 דקות, container ספציפי בלבד.
# כלומר: הendpoint ציבורי, אבל בלתי שמיש ללא token — בדיוק כמו S3 presigned URL.
###############################################################################

resource "azurerm_storage_account" "main" {
  name                     = "st${replace(var.prefix, "-", "")}files"
  location                 = var.location
  resource_group_name      = var.resource_group_name
  account_tier             = "Standard"
  account_replication_type = "ZRS"

  # WHY true: הדפדפן צריך לדחוף קבצים ישירות ל-Blob Storage עם SAS token.
  # אם false — הבקשה נחסמת ברמת הרשת לפני שה-SAS token בכלל נבדק.
  # זה בדיוק כמו S3 presigned URL — הbucket "ציבורי" אבל בלתי נגיש ללא signature.
  public_network_access_enabled = true

  # WHY false: חוסם אנונימיות לגמרי. כל בקשה ללא SAS → 403.
  # זה שונה מ-public_network_access — זה שולט על anonymous reads.
  allow_nested_items_to_be_public = false

  # SAS tokens דורשים shared_access_key_enabled = true.
  shared_access_key_enabled = true

  https_traffic_only_enabled = true
  min_tls_version            = "TLS1_2"

  blob_properties {
    delete_retention_policy {
      days = 30
    }
    container_delete_retention_policy {
      days = 30
    }
    versioning_enabled = true

    # WHY CORS: הדפדפן שולח PUT ישירות ל-blob.core.windows.net מdomain שלנו.
    # ללא CORS — הדפדפן חוסם את הבקשה (same-origin policy).
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["PUT", "HEAD"]
      allowed_origins    = [var.allowed_origin] # e.g. "https://app.example.com"
      exposed_headers    = ["ETag"]
      max_age_in_seconds = 300
    }
  }

  tags = var.tags
}

resource "azurerm_storage_container" "uploads" {
  name                  = "uploads"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private" # אין anonymous access לcontainer
}

# Lifecycle management policy
resource "azurerm_storage_management_policy" "lifecycle" {
  storage_account_id = azurerm_storage_account.main.id

  rule {
    name    = "tier-old-uploads"
    enabled = true
    filters {
      prefix_match = ["uploads/"]
      blob_types   = ["blockBlob"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days_since_last_access_time_greater_than    = 30
        tier_to_archive_after_days_since_last_access_time_greater_than = 90
        delete_after_days_since_last_access_time_greater_than          = 365
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 90
      }
    }
  }
}

# Private endpoint — נשמר לגישה מה-API pods (ניהול, listing וכו')
# DATA PLANE (uploads עם SAS) עובר על הרשת הציבורית עם SAS token.
# MANAGEMENT PLANE (terraform, az CLI, portal) נשאר private.
resource "azurerm_private_endpoint" "blob" {
  name                = "pe-blob-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_endpoints_id

  private_service_connection {
    name                           = "psc-blob-${var.prefix}"
    private_connection_resource_id = azurerm_storage_account.main.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "dns-blob"
    private_dns_zone_ids = [var.blob_private_dns_zone_id]
  }

  tags = var.tags
}

###############################################################################
# RBAC — Blob Storage
# API MI: Storage Blob Data Contributor
#   → קריאה + כתיבה + מחיקה (נדרש ליצירת SAS tokens ולניהול קבצים)
#
# WHY Contributor ולא Reader:
# יצירת SAS token דורשת הרשאת כתיבה על ה-container.
# Reader מאפשר רק קריאה — לא מספיק ל-presign flow.
#
# WHY לא לתת ל-Worker גישה ל-Blob:
# ה-Worker מעבד jobs מה-queue — הוא לא כותב/קורא files ישירות.
# אם בעתיד Worker יצטרך גישה, מוסיפים role assignment ייעודי.
###############################################################################

resource "azurerm_role_assignment" "api_blob_contributor" {
  scope                = azurerm_storage_account.main.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.api_mi_principal_id

  depends_on = [azurerm_storage_account.main]
}
