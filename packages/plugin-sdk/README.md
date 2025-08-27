# @metrics-hub/plugin-sdk

Official JavaScript SDK for building plugins that integrate with Metrics Hub's Google services.

## Features

- 🚀 **Zero dependencies** - Pure JavaScript/TypeScript
- 🔗 **All Google services** - Ads, Analytics, Sheets, Drive, Gmail, Docs, Search Console  
- 🎯 **Type-safe** - Full TypeScript support
- 🌐 **Framework-agnostic** - Works with React, Vue, Angular, vanilla JS
- 🔒 **Secure** - OAuth handled server-side through your Metrics Hub instance

## Installation

```bash
npm install @metrics-hub/plugin-sdk
```

## Quick Start

```typescript
import { MetricsHubSDK } from '@metrics-hub/plugin-sdk'

// Initialize SDK
const sdk = new MetricsHubSDK({
  companyId: 'your-company-id',
  apiBaseUrl: 'https://your-metrics-hub-app.vercel.app'
})

// Use Google services
const campaigns = await sdk.ads.getCampaigns('google-ads-customer-id')
const analytics = await sdk.analytics.getReports({
  viewId: '12345678',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
})

console.log('Ad campaigns:', campaigns.campaigns)
console.log('Website sessions:', analytics.summary.totalSessions)
```

## Available Services

### Google Ads
```typescript
// Get campaigns
const campaigns = await sdk.ads.getCampaigns('customer-id')

// Get keywords
const keywords = await sdk.ads.getKeywords('customer-id', {
  campaignId: 'optional-campaign-id'
})
```

### Google Analytics
```typescript
// Get accounts/properties
const accounts = await sdk.analytics.getAccounts()

// Get reports data
const reports = await sdk.analytics.getReports({
  viewId: '187654321',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
})
```

### Google Sheets
```typescript
// Read spreadsheet data
const data = await sdk.sheets.read({
  spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  range: 'A1:D10'
})

// Write data to spreadsheet
await sdk.sheets.write({
  spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  range: 'A1:B2',
  values: [['Name', 'Value'], ['John', 100]],
  operation: 'update'
})
```

### Google Drive
```typescript
// List files
const files = await sdk.drive.getFiles({
  query: 'name contains "report"',
  pageSize: 20
})

// Get single file details
const file = await sdk.drive.getFile('file-id-here')
```

### Gmail
```typescript
// Get messages
const emails = await sdk.gmail.getMessages({
  query: 'from:support@company.com',
  maxResults: 50
})
```

### Google Docs
```typescript
// Read document
const doc = await sdk.docs.getDocument('document-id')

// Create new document
const newDoc = await sdk.docs.createDocument({
  title: 'My Report',
  content: 'Initial content...'
})

// Update document
await sdk.docs.updateDocument({
  documentId: 'document-id',
  content: 'Updated content...'
})
```

### Google Search Console
```typescript
// Get sites and performance data
const sites = await sdk.searchConsole.getSites({
  siteUrl: 'https://example.com',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
})
```

## Framework Examples

### React Hook Example
```tsx
import { useState, useEffect } from 'react'
import { MetricsHubSDK } from '@metrics-hub/plugin-sdk'

const sdk = new MetricsHubSDK({ companyId: 'abc123' })

function useGoogleAds(customerId: string) {
  const [campaigns, setCampaigns] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    if (!customerId) return
    
    setLoading(true)
    sdk.ads.getCampaigns(customerId)
      .then(setCampaigns)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [customerId])
  
  return { campaigns, loading, error }
}

// Usage in component
function AdsDashboard() {
  const { campaigns, loading, error } = useGoogleAds('123456789')
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <div>
      {campaigns?.campaigns.map(campaign => (
        <div key={campaign.id}>
          {campaign.name} - {campaign.status}
        </div>
      ))}
    </div>
  )
}
```

### Vue Composition API Example
```vue
<script setup>
import { ref, onMounted } from 'vue'
import { MetricsHubSDK } from '@metrics-hub/plugin-sdk'

const sdk = new MetricsHubSDK({ companyId: 'abc123' })

const analytics = ref(null)
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    analytics.value = await sdk.analytics.getReports({
      viewId: '12345678',
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else>
    <h2>Website Analytics</h2>
    <p>Total Sessions: {{ analytics?.summary.totalSessions }}</p>
    <p>Total Users: {{ analytics?.summary.totalUsers }}</p>
  </div>
</template>
```

### Vanilla JavaScript Example
```javascript
import { MetricsHubSDK } from '@metrics-hub/plugin-sdk'

const sdk = new MetricsHubSDK({
  companyId: 'your-company-id',
  apiBaseUrl: 'https://your-app.com'
})

// Simple dashboard
async function createDashboard() {
  try {
    // Get data from multiple services
    const [campaigns, analytics, files] = await Promise.all([
      sdk.ads.getCampaigns('customer-id'),
      sdk.analytics.getReports({
        viewId: '12345678',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }),
      sdk.drive.getFiles({ pageSize: 10 })
    ])
    
    // Update HTML
    document.getElementById('campaigns').textContent = campaigns.total
    document.getElementById('sessions').textContent = analytics.summary.totalSessions
    document.getElementById('files').textContent = files.files.length
    
  } catch (error) {
    console.error('Dashboard error:', error)
  }
}

createDashboard()
```

## Configuration

### Basic Configuration
```typescript
const sdk = new MetricsHubSDK({
  companyId: 'required-company-id',
  apiBaseUrl: 'https://your-metrics-hub-app.com', // Optional, defaults to your production URL
  apiKey: 'optional-api-key', // If you implement API key authentication
  debug: true // Optional, enables console logging
})
```

### Update Configuration
```typescript
// Update config after initialization
sdk.updateConfig({
  apiKey: 'new-api-key',
  debug: false
})

// Get current config
const config = sdk.getConfig()
console.log('Current company ID:', config.companyId)
```

## Error Handling

All SDK methods return Promises and throw errors consistently:

```typescript
try {
  const campaigns = await sdk.ads.getCampaigns('customer-id')
} catch (error) {
  console.error('Error details:', {
    message: error.message,
    status: error.status,     // HTTP status code
    details: error.details    // Additional error info
  })
}
```

## TypeScript Support

The SDK includes full TypeScript definitions:

```typescript
import { 
  MetricsHubSDK, 
  PluginConfig,
  GoogleAdsCampaignsResponse,
  GoogleAnalyticsReportsResponse 
} from '@metrics-hub/plugin-sdk'

const config: PluginConfig = {
  companyId: 'abc123',
  apiBaseUrl: 'https://my-app.com'
}

const sdk = new MetricsHubSDK(config)

// Fully typed responses
const campaigns: GoogleAdsCampaignsResponse = await sdk.ads.getCampaigns('customer-id')
```

## Authentication

The SDK uses your Metrics Hub instance for authentication:

1. **Users connect their Google accounts** through your Metrics Hub app
2. **OAuth tokens are stored securely** in your database  
3. **SDK makes requests to your API routes** which use the stored tokens
4. **Your API routes proxy requests** to Google APIs

**No tokens or credentials are stored in the browser** - everything goes through your secure server.

## Requirements

- **Node.js 16+** or modern browser with fetch support
- **Active Metrics Hub instance** with Google services connected
- **Company ID** from your Metrics Hub database

## License

MIT

## Support

- 📖 [Documentation](https://github.com/metrics-cz/metrics-hub)  
- 🐛 [Report Issues](https://github.com/metrics-cz/metrics-hub/issues)
- 💬 [Discussions](https://github.com/metrics-cz/metrics-hub/discussions)