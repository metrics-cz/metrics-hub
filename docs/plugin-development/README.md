# MetricsHub Plugin Development Guide

Welcome to the comprehensive guide for developing MetricsHub plugins! This guide will walk you through everything you need to know to create powerful, integrated plugins.

## 🚀 Quick Start

### 1. Plugin Structure
Your plugin must follow this directory structure:

```
my-plugin/
├── public/                 # 📁 Main plugin files
│   ├── index.html         # 🔴 REQUIRED - Main plugin interface
│   ├── script.js          # 🔴 REQUIRED - Plugin logic
│   ├── styles.css         # 🔴 REQUIRED - Plugin styles
│   └── dist/              # 📁 Optional - Built assets
├── package.json           # 🔴 REQUIRED - Plugin metadata
├── metadata.json          # 📄 Optional - MetricsHub metadata
└── README.md              # 📄 Optional - Documentation
```

### 2. Development Playground

Use the **Plugin Playground** for rapid development and testing:

**🎮 Playground Dashboard:**
```
http://localhost:3000/plugin-playground/dashboard
```

**🛠️ Direct Playground:**
```
http://localhost:3000/plugin-playground?dir=/path/to/your/plugin
```

**🚀 Plugin Generator:**
```bash
npm run create-plugin
# or
node scripts/create-plugin.js
```

**Features:**
- ✅ **Plugin Generator** - Create plugins from templates
- ✅ **Hot Reload** - Changes appear instantly
- ✅ **Mock Environment** - Realistic MetricsHub context  
- ✅ **Debug Console** - Enhanced logging with forwarding
- ✅ **Structure Validation** - Real-time feedback
- ✅ **Dependency Inspector** - Check package availability
- ✅ **API Mocking** - Test without real APIs
- ✅ **Multi-tab Interface** - Preview, logs, validation, dependencies

## 📁 Directory Structure Details

### Required Files

#### `public/index.html` - Main Interface
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Plugin | Metrics HUB</title>
    <link rel="stylesheet" href="styles.css">
    <!-- MetricsHub integration scripts will be injected automatically -->
</head>
<body>
    <div class="plugin-container">
        <h1>My Awesome Plugin</h1>
        <!-- Your plugin content here -->
    </div>
    <script src="script.js"></script>
</body>
</html>
```

#### `public/script.js` - Plugin Logic
```javascript
console.log('=== My Plugin Loading ===');

// Wait for MetricsHub config to be ready
window.addEventListener('metricshub:config:ready', function(event) {
    const config = event.detail;
    console.log('MetricsHub config ready:', config);
    
    // Access company info
    const companyId = config.companyId;
    const apiBaseUrl = config.apiBaseUrl;
    const oauthTokens = config.oauthTokens;
    
    // Initialize your plugin
    initializePlugin(config);
});

function initializePlugin(config) {
    console.log('Initializing plugin for company:', config.companyId);
    
    // Your plugin initialization code here
    loadData();
}

async function loadData() {
    try {
        // Use MetricsHub proxy endpoints (no CORS issues!)
        const response = await fetch('/api/proxy/google-ads/accounts?companyId=current');
        const data = await response.json();
        
        console.log('Data loaded:', data);
        displayData(data);
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

function displayData(data) {
    // Display your data in the UI
    document.querySelector('.plugin-container').innerHTML += `
        <div class="data-display">
            <h2>Data loaded successfully!</h2>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
    `;
}
```

#### `public/styles.css` - Plugin Styles
```css
/* Plugin Styles */
.plugin-container {
    font-family: Arial, sans-serif;
    margin: 20px;
    padding: 20px;
    background-color: #f9f9f9;
    border-radius: 8px;
}

.plugin-container h1 {
    color: #333;
    border-bottom: 2px solid #007bff;
    padding-bottom: 10px;
}

.data-display {
    background: white;
    padding: 15px;
    border-radius: 4px;
    margin-top: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.data-display pre {
    background: #f8f9fa;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 12px;
}

/* Responsive design for iframe */
@media (max-width: 768px) {
    .plugin-container {
        margin: 10px;
        padding: 15px;
    }
}
```

#### `package.json` - Plugin Metadata
```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "An awesome plugin for MetricsHub",
  "main": "public/index.html",
  "author": "Your Name",
  "license": "MIT",
  "keywords": ["metricshub", "plugin", "analytics"],
  "metricshub": {
    "displayName": "My Awesome Plugin",
    "category": "analytics",
    "icon": "chart-bar",
    "permissions": ["google-ads", "google-analytics"]
  }
}
```

## 🔌 MetricsHub Integration

### PostMessage Communication

MetricsHub communicates with plugins via `postMessage`:

```javascript
// Listen for MetricsHub configuration
window.addEventListener('message', function(event) {
    if (event.data?.type === 'METRICSHUB_CONFIG') {
        const config = event.data.payload;
        
        // Store configuration globally
        window.METRICSHUB_CONFIG = config;
        
        // Trigger ready event
        window.dispatchEvent(new CustomEvent('metricshub:config:ready', { 
            detail: config 
        }));
    }
});

// Request configuration from parent
window.parent.postMessage({
    type: 'METRICSHUB_IFRAME_READY',
    timestamp: Date.now()
}, '*');
```

### Available Configuration

```javascript
window.METRICSHUB_CONFIG = {
    companyId: 'uuid-of-company',
    apiBaseUrl: 'https://your-metricshub.com',
    oauthTokens: {
        access_token: 'oauth-token',
        refresh_token: 'refresh-token',
        scope: 'api-scopes',
        expires_at: 'iso-date'
    },
    appId: 'your-app-id',
    ready: true
};
```

## 🌐 API Integration

### Using MetricsHub Proxy Endpoints

**❌ Don't do this (CORS issues):**
```javascript
// This will fail due to CORS
const response = await fetch('https://googleads.googleapis.com/v21/customers');
```

**✅ Do this instead:**
```javascript
// Use MetricsHub proxy endpoints
const response = await fetch('/api/proxy/google-ads/accounts?companyId=current');
```

### Available Proxy Endpoints

| Service | Endpoint | Description |
|---------|----------|-------------|
| Google Ads | `/api/proxy/google-ads/accounts` | List Google Ads accounts |
| Google Ads | `/api/proxy/google-ads/campaigns` | Get campaigns data |
| Google Analytics | `/api/proxy/google-analytics/reports` | Get analytics reports |
| Google Drive | `/api/proxy/google-drive/files` | Access Drive files |
| Gmail | `/api/proxy/gmail/messages` | Get Gmail messages |

## 🧪 Development & Testing

### Using the Enhanced Plugin Playground

#### 🚀 Quick Start with Plugin Generator

1. **Generate a new plugin:**
   ```bash
   npm run create-plugin
   ```
   Follow the interactive prompts to create your plugin from a template.

2. **Open in playground:**
   ```bash
   # The generator will give you a direct playground URL
   # Or navigate to the dashboard first
   http://localhost:3000/plugin-playground/dashboard
   ```

#### 🛠️ Manual Development

1. **Create your plugin directory:**
   ```bash
   mkdir my-plugin
   cd my-plugin
   mkdir public
   ```

2. **Create required files** (or use the generator for boilerplate)

3. **Start development in playground:**
   ```
   http://localhost:3000/plugin-playground?dir=/absolute/path/to/my-plugin
   ```

#### 🎮 Playground Features

**Multi-Tab Interface:**
- **Preview Tab:** Live plugin preview with iframe
- **Logs Tab:** Console logs forwarded from plugin  
- **Validation Tab:** Real-time structure validation
- **Dependencies Tab:** Package availability checking

**Development Tools:**
```javascript
// Available in playground environment
PLUGIN_PLAYGROUND.reloadPlugin()              // Manual reload
PLUGIN_PLAYGROUND.validateStructure()        // Check structure
PLUGIN_PLAYGROUND.mockApiCall(endpoint)      // Test APIs
PLUGIN_PLAYGROUND.getDebugInfo()             // Debug info
```

**Auto-validation:** Enable auto-validation to check plugin structure as you make changes.

### Structure Validation

Check your plugin structure:
```
GET /api/plugin-playground/validate?dir=/path/to/plugin
```

Returns:
```json
{
  "valid": true,
  "issues": [],
  "suggestions": ["✅ Plugin structure is valid!"],
  "files": {
    "public/index.html": true,
    "public/script.js": true,
    "public/styles.css": true,
    "package.json": true
  }
}
```

## 📦 Deployment

### Creating Production ZIP

Your ZIP must have this structure:
```
plugin.zip
├── public/
│   ├── index.html
│   ├── script.js
│   └── styles.css
└── package.json
```

**Important:** Files must be in `public/` directory within the ZIP!

### Upload to MetricsHub

```bash
# Upload via Supabase CLI
supabase storage cp plugin.zip ss:///app-storage/apps/YOUR-APP-ID/plugin.zip
```

## 🎨 UI Patterns

### DataTables Integration

```javascript
// Initialize DataTable
const table = $('#dataTable').DataTable({
    responsive: true,
    scrollX: true,
    pageLength: 25,
    dom: 'Bfrtip',
    buttons: ['copy', 'csv', 'excel', 'pdf', 'print']
});

// Add data
data.forEach(row => {
    table.row.add([
        row.name,
        row.value,
        row.status
    ]);
});

table.draw();
```

### Loading States

```javascript
function showLoading() {
    document.querySelector('.content').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading data...</p>
        </div>
    `;
}

function hideLoading() {
    document.querySelector('.loading').remove();
}
```

## 🚫 Common Issues & Solutions

### Issue: 404 - File Not Found
```
❌ Problem: Plugin files not loading
✅ Solution: Check ZIP structure - files must be in public/ directory
```

### Issue: CORS Errors
```
❌ Problem: Direct API calls blocked
✅ Solution: Use MetricsHub proxy endpoints (/api/proxy/...)
```

### Issue: OAuth Tokens Not Available
```
❌ Problem: window.METRICSHUB_CONFIG is undefined
✅ Solution: Wait for 'metricshub:config:ready' event
```

### Issue: Hot Reload Not Working
```
❌ Problem: Changes not appearing
✅ Solution: Disable browser cache or use playground
```

## 📊 Example: Complete Google Ads Plugin

See the working Google Ads plugin example:
- **Directory:** `/home/krxg/Desktop/metrics-hub-google-ads-plugin/`
- **Structure:** Follows all best practices
- **Features:** DataTables, responsive design, proper API integration

## 🔧 Advanced Features

### Error Handling
```javascript
window.addEventListener('error', function(event) {
    console.error('Plugin error:', event.error);
    // Send error to MetricsHub for debugging
    window.parent.postMessage({
        type: 'PLUGIN_ERROR',
        error: event.error.message,
        stack: event.error.stack
    }, '*');
});
```

### Plugin-to-Plugin Communication
```javascript
// Send data to other plugins
window.parent.postMessage({
    type: 'PLUGIN_DATA_SHARE',
    pluginId: 'my-plugin',
    data: { key: 'value' }
}, '*');
```

## 🆘 Getting Help

1. **Check structure:** Use validation endpoint
2. **Use playground:** Rapid testing and development
3. **Check console:** Look for error messages
4. **Example plugins:** Study working examples

---

## 📚 Additional Resources

- [MetricsHub API Documentation](../api/)
- [Plugin Examples](../examples/)
- [Troubleshooting Guide](./troubleshooting.md)
- [Best Practices](./best-practices.md)

Happy plugin development! 🚀