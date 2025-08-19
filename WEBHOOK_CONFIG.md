# Supabase Database Webhooks Configuration

## 🎯 Webhook 1: Company Applications Integration

Click **"Create a new hook"** and configure:

### Basic Settings:
- **Name**: `company-applications-webhook`
- **Table**: `company_applications`
- **Events**: ☑️ Insert ☑️ Update ☑️ Delete

### HTTP Settings:
- **Type**: HTTP Request
- **Method**: `POST`
- **URL**: `https://your-executor-server.com/webhook/integration`
  - 🔄 **For local development**: Use `ngrok` or similar to expose `localhost:3001`
  - 🏠 **For local testing**: `http://your-local-ip:3001/webhook/integration`

### Headers:
```json
{
  "Content-Type": "application/json",
  "X-Webhook-Signature": "your-secret-key-here"
}
```

### Optional Settings:
- **Timeout**: 5000ms
- **Retry Policy**: 3 retries
- **Enable SSL Verification**: ☑️ (if using HTTPS)

---

## 🗂️ Webhook 2: Storage Objects (Optional)

If you need storage webhook for integration packages:

### Basic Settings:
- **Name**: `storage-objects-webhook`
- **Table**: `storage.objects`
- **Events**: ☑️ Insert ☑️ Update ☑️ Delete

### HTTP Settings:
- **Method**: `POST`
- **URL**: `https://your-executor-server.com/webhook/storage`

### Filters (if available):
- **Bucket**: `plugins`
- **File Extension**: `.zip`

---

## 🔧 Local Development Setup

### Option 1: Using ngrok (Recommended)
```bash
# Install ngrok: https://ngrok.com/
ngrok http 3001

# Use the ngrok HTTPS URL in webhook configuration:
# https://abc123.ngrok.io/webhook/integration
```

### Option 2: Direct Local IP
```bash
# Find your local IP
ip route get 1 | awk '{print $7}' | head -1

# Use: http://YOUR-IP:3001/webhook/integration
```

### Option 3: Docker Bridge (if executor runs in Docker)
```
# Use: http://host.docker.internal:3001/webhook/integration
```

---

## 📋 Expected Payload Format

Supabase will send this JSON structure:

```json
{
  "type": "INSERT|UPDATE|DELETE",
  "table": "company_applications",
  "record": {
    "id": "uuid",
    "company_id": "uuid", 
    "application_id": "uuid",
    "is_active": true,
    "is_enabled": true,
    "config": {},
    "frequency": "daily",
    "timezone": "UTC",
    "created_at": "2025-08-15T...",
    "updated_at": "2025-08-15T..."
  },
  "old_record": {
    /* Previous record data for UPDATE/DELETE operations */
  },
  "schema": "public"
}
```

---

## 🧪 Testing Instructions

### 1. Test Company Applications Webhook:
```sql
-- Insert test record
INSERT INTO company_applications (
  company_id, 
  application_id, 
  is_active, 
  is_enabled, 
  config, 
  frequency
) VALUES (
  'your-company-uuid',
  'your-app-uuid', 
  true, 
  true, 
  '{"test": true}', 
  '24h'
);

-- Update test record  
UPDATE company_applications 
SET frequency = '12h' 
WHERE id = 'your-record-uuid';

-- Delete test record
DELETE FROM company_applications 
WHERE id = 'your-record-uuid';
```

### 2. Check Executor Server Logs:
- Verify webhook payloads are received
- Confirm proper JSON structure
- Test INSERT, UPDATE, DELETE events

### 3. Monitor Webhook Status:
- Check webhook delivery status in Supabase Dashboard
- Review any failed deliveries
- Adjust retry settings if needed

---

## ⚡ Quick Setup Checklist

- [ ] Supabase Dashboard → Database → Webhooks
- [ ] Create `company-applications-webhook`
- [ ] Set table: `company_applications`  
- [ ] Enable all events (Insert, Update, Delete)
- [ ] Set URL: `https://your-server.com/webhook/integration`
- [ ] Add headers with Content-Type and webhook signature
- [ ] Test with sample data
- [ ] Verify executor server receives webhooks
- [ ] Monitor webhook delivery status

🎯 **Result**: Clean, native Supabase Database Webhooks with no custom code!