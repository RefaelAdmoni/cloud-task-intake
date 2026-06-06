# DNS Request — Cloudflare Configuration
## Project: Cloud Task Intake
## Cloud: Azure (West Europe)
## Prepared by: DevOps

---

## Prerequisites — Values to obtain after `terraform apply`

Before configuring DNS, run the following and note the outputs:

```bash
cd iac/
terraform output frontdoor_endpoint_hostname
# → e.g. cloudtask-prod-XXXXXXXX.z01.azurefd.net

terraform output frontend_default_hostname
# → e.g. victorious-stone-0a1b2c3d4.5.azurestaticapps.net
```

Replace the placeholder values below with the actual Terraform outputs.

---

## DNS Records

### 1. Main application (API + Frontend routing via Front Door)

| Field | Value |
|---|---|
| **Type** | `CNAME` |
| **Name** | `app` |
| **Target** | `<frontdoor_endpoint_hostname>` (from terraform output) |
| **Cloudflare Proxy** | ✅ **ENABLED (orange cloud)** |
| **TTL** | Auto |

**Why proxy ENABLED:**
Cloudflare proxy hides the Azure Front Door origin IP, activates WAF, DDoS protection (L7),
and caches static assets at Cloudflare edge nodes.
Result: `app.example.com` → Cloudflare edge → Azure Front Door → AKS / Static Web Apps.

---

### 2. Staging environment

| Field | Value |
|---|---|
| **Type** | `CNAME` |
| **Name** | `staging` |
| **Target** | `<staging_frontdoor_endpoint_hostname>` (from terraform output) |
| **Cloudflare Proxy** | ✅ **ENABLED (orange cloud)** |
| **TTL** | Auto |

---

### 3. Azure Front Door custom domain TLS validation (CNAME method)

Azure Front Door validates domain ownership before issuing a managed TLS certificate.
This record must be added **before** or **immediately after** adding the app CNAME above.

| Field | Value |
|---|---|
| **Type** | `CNAME` |
| **Name** | `_dnsauth.app` |
| **Target** | `<azure_fd_validation_token>.c.azurefd.net` |
| **Cloudflare Proxy** | ❌ **DISABLED (grey cloud)** |
| **TTL** | 300 (5 min) |

**Why proxy DISABLED:**
Azure's domain validation makes an authoritative DNS lookup for this record.
Cloudflare proxy intercepts and rewrites DNS responses — the validation query
would hit Cloudflare's IP, not the Azure validation target, causing cert issuance to fail.

**How to get the validation token:**
```bash
az afd custom-domain show \
  --resource-group rg-cloudtask-prod-we \
  --profile-name afd-cloudtask-prod \
  --custom-domain-name app-example-com \
  --query "validationProperties.validationToken" \
  -o tsv
```

**Remove this record** once Azure confirms the certificate is issued (status: Approved).
Keeping it after validation is harmless but unnecessary.

---

### 4. Staging Front Door TLS validation

| Field | Value |
|---|---|
| **Type** | `CNAME` |
| **Name** | `_dnsauth.staging` |
| **Target** | `<azure_fd_staging_validation_token>.c.azurefd.net` |
| **Cloudflare Proxy** | ❌ **DISABLED (grey cloud)** |
| **TTL** | 300 |

---

### 5. Azure Static Web Apps custom domain validation (TXT method)

Static Web Apps uses a separate TXT-based validation independent of Front Door.

| Field | Value |
|---|---|
| **Type** | `TXT` |
| **Name** | `app` |
| **Value** | `<swa_validation_token>` |
| **Cloudflare Proxy** | ❌ **DISABLED (grey cloud — N/A for TXT)** |
| **TTL** | 300 |

**How to get the SWA validation token:**
```bash
az staticwebapp hostname show \
  --name swa-cloudtask-prod \
  --hostname app.example.com \
  --query "validationToken" -o tsv
```

**Remove this record** once SWA confirms the custom domain (status: Validated).

---

### 6. Email SPF (if transactional email is added later)

| Field | Value |
|---|---|
| **Type** | `TXT` |
| **Name** | `@` (root domain) |
| **Value** | `v=spf1 -all` |
| **Cloudflare Proxy** | ❌ **DISABLED (N/A for TXT)** |
| **TTL** | 3600 |

**Note:** This sets a restrictive SPF policy that rejects all email from this domain.
Update if transactional email (SendGrid, SES, etc.) is added in the future.

---

## Cloudflare Settings (beyond DNS records)

These settings must be configured in the Cloudflare dashboard under the domain zone,
not just in DNS records:

### SSL/TLS Mode
**Set to: Full (Strict)**

Cloudflare → SSL/TLS → Overview → Full (Strict)

**Why Full (Strict) and not Flexible:**
- Flexible = Cloudflare encrypts client→CF, but CF→origin is plain HTTP. Origin TLS cert is ignored.
- Full = Cloudflare encrypts both legs, but accepts self-signed certs at origin.
- Full (Strict) = Cloudflare encrypts both legs AND validates the origin cert (Azure Front Door's managed cert).
  This is the only mode that provides end-to-end TLS with genuine certificate validation.

### Always Use HTTPS
**Enable:** Cloudflare → SSL/TLS → Edge Certificates → Always Use HTTPS → ON

Redirects all `http://` requests to `https://` at Cloudflare edge before they reach Azure.

### HTTP Strict Transport Security (HSTS)
**Enable with:**
- Max Age: 6 months (15768000 seconds)
- Include subdomains: ✅
- Preload: ✅ (after confirming all subdomains support HTTPS)

Cloudflare → SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS)

**Warning:** HSTS preload is irreversible on short timescales. Only enable once
you are certain all subdomains (`app.`, `staging.`, `www.` etc.) serve HTTPS correctly.

### Minimum TLS Version
**Set to: TLS 1.2**

Cloudflare → SSL/TLS → Edge Certificates → Minimum TLS Version → TLS 1.2

### WAF (Web Application Firewall)
**Enable:** Cloudflare → Security → WAF → Managed Rules

Recommended rulesets to enable:
- Cloudflare Managed Ruleset
- Cloudflare OWASP Core Ruleset (set to Medium sensitivity)

**Note:** Front Door also has a WAF policy configured via Terraform. Having two WAF
layers (Cloudflare + Front Door) is intentional — Cloudflare blocks at edge before
traffic reaches Azure at all, Front Door WAF provides Azure-native rule enforcement.

### Bot Fight Mode
**Enable:** Cloudflare → Security → Bots → Bot Fight Mode → ON

### Security Level
**Set to: Medium** (for production)

---

## Full DNS Record Summary Table

| Type | Name | Target / Value | CF Proxy | TTL | Purpose |
|---|---|---|---|---|---|
| `CNAME` | `app` | `<afd_prod_hostname>.azurefd.net` | ✅ ON | Auto | Production app |
| `CNAME` | `staging` | `<afd_staging_hostname>.azurefd.net` | ✅ ON | Auto | Staging app |
| `CNAME` | `_dnsauth.app` | `<afd_prod_validation>.c.azurefd.net` | ❌ OFF | 300 | Prod TLS cert (temp) |
| `CNAME` | `_dnsauth.staging` | `<afd_staging_validation>.c.azurefd.net` | ❌ OFF | 300 | Staging TLS cert (temp) |
| `TXT` | `app` | `<swa_validation_token>` | ❌ OFF | 300 | SWA domain (temp) |
| `TXT` | `@` | `v=spf1 -all` | ❌ OFF | 3600 | Email SPF |

---

## Configuration Order (important)

DNS propagation and certificate issuance are order-dependent.
Follow this sequence to avoid validation failures:

```
Step 1  → terraform apply (get output values)
Step 2  → Add ALL DNS records from the table above
Step 3  → Wait 2–5 min for DNS propagation
Step 4  → Trigger Front Door custom domain verification (Azure Portal or CLI)
Step 5  → Wait for cert issuance: ~5–10 min (Azure managed cert via DigiCert)
Step 6  → Verify: curl -I https://app.example.com/health → HTTP 200
Step 7  → Remove temp validation records (_dnsauth.app, _dnsauth.staging, TXT on app)
Step 8  → Enable HSTS in Cloudflare (after confirming HTTPS works end-to-end)
```

---

## Verification Commands

After all records are applied and cert is issued:

```bash
# 1. Confirm DNS resolves through Cloudflare
dig app.example.com +short
# Expected: Cloudflare anycast IP (e.g. 104.21.x.x or 172.67.x.x)

# 2. Confirm TLS works end-to-end
curl -I https://app.example.com/health
# Expected: HTTP/2 200, server: cloudflare

# 3. Confirm the origin cert is Azure Front Door (not Cloudflare self-signed)
openssl s_client -connect app.example.com:443 -servername app.example.com \
  2>/dev/null | openssl x509 -noout -issuer
# Expected with Full(Strict): issuer=DigiCert (Azure Front Door managed cert)

# 4. Confirm staging
curl -I https://staging.example.com/health
# Expected: HTTP/2 200
```

---

## Notes for Reviewer

- Replace `example.com` throughout with the actual domain.
- All `<placeholder>` values are obtained from `terraform output` after `terraform apply`.
- The two temporary validation records (`_dnsauth.*` and the `TXT` on `app`) can be
  deleted once certificate issuance is confirmed — keeping them causes no harm.
- If Front Door cert validation fails after 24h, check that `_dnsauth.app` is NOT proxied
  through Cloudflare (must be grey cloud / DNS only).
