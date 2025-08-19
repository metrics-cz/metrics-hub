# Supabase Database Webhooks Configuration

## ✅ All Old Implementations Removed
- Deleted all custom Edge Functions
- Removed custom database triggers and functions  
- Functions directory is empty: `/supabase/functions/`
- Ready for clean Supabase Dashboard webhook setup

## 🎯 Table to Webhook URL Mapping

Based on the executor server endpoints (`/home/krxg/Desktop/metrics-hub-executor-server/src/routes/webhook.ts`):

### Required Webhooks:

#### 1. Company Applications Integration Webhook
- **Table**: `company_applications`
- **URL**: `http://host.docker.internal:3001/webhook/integration`
- **Events**: INSERT, UPDATE, DELETE
- **Purpose**: Manages integration lifecycle (scheduling, config changes, removal)

#### 2. Storage Integration Packages Webhook  
- **Table**: `storage.objects` (Supabase Storage)
- **URL**: `http://host.docker.internal:3001/webhook/storage`
- **Events**: INSERT, UPDATE, DELETE
- **Purpose**: Handles integration package uploads/updates in `plugins` bucket
- **Filter**: Only files ending with `.zip` in `plugins` bucket

### Optional Webhooks (for future enhancement):

#### 3. Applications Metadata Webhook
- **Table**: `applications`
- **URL**: `http://host.docker.internal:3001/webhook/application`
- **Events**: UPDATE
- **Purpose**: React to application metadata changes

## 🔧 Supabase Dashboard Setup

### Access Dashboard:
1. Open: `http://127.0.0.1:54323` (Supabase Studio)
2. Navigate: `Database` → `Webhooks`

### Webhook 1: Company Applications
```
Name: company-applications-webhook
Table: company_applications  
Events: ☑️ Insert ☑️ Update ☑️ Delete
HTTP Method: POST
URL: http://host.docker.internal:3001/webhook/integration
Headers: 
  Content-Type: application/json
  X-Webhook-Signature: your-secret-key
```

### Webhook 2: Storage Objects
```
Name: storage-webhook
Table: storage.objects
Events: ☑️ Insert ☑️ Update ☑️ Delete  
HTTP Method: POST
URL: http://host.docker.internal:3001/webhook/storage
Headers:
  Content-Type: application/json
  X-Webhook-Signature: your-secret-key
```

## 🔑 Important Notes

### Local Development URL:
- ✅ Use: `http://host.docker.internal:3001`
- ❌ Don't use: `http://localhost:3001` or `http://127.0.0.1:3001`
- **Reason**: Supabase runs in Docker container, needs to reach host machine

### Authentication:
- Set webhook secret in executor server config
- Add same secret to `X-Webhook-Signature` header
- Executor server validates signatures for security

### Payload Format:
Both webhooks receive standardized payload:
```json
{
  "type": "INSERT|UPDATE|DELETE",
  "table": "table_name", 
  "record": { /* new/current record */ },
  "old_record": { /* previous record for UPDATE/DELETE */ },
  "schema": "public"
}
```

## 🧪 Testing

After setup, test by:

1. **Company Applications**: Insert/update/delete in `company_applications` table
2. **Storage**: Upload/delete `.zip` files in `plugins` storage bucket
3. **Check**: Executor server logs for webhook receipt and processing

## 📋 Summary

**Tables needing webhooks:**
1. `company_applications` → `/webhook/integration`
2. `storage.objects` → `/webhook/storage`

**Setup method:** Supabase Dashboard Database Webhooks (not custom code)

**Key URL:** `http://host.docker.internal:3001` for local Docker networking