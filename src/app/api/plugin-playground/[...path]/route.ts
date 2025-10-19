import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { watch } from 'fs';
import { 
  createErrorResponse, 
  logError, 
  CustomApiError 
} from '@/lib/error-handler';

// MIME type detection
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.jsx': 'application/javascript',
    '.ts': 'application/javascript',
    '.tsx': 'application/javascript',
    '.css': 'text/css',
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

interface RouteContext {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { path: requestPath } = await context.params;
    const { searchParams } = new URL(request.url);
    
    // Get the plugin directory from query params
    const pluginDir = searchParams.get('dir');
    if (!pluginDir) {
      return createErrorResponse(new CustomApiError(
        'Plugin directory parameter is required (?dir=/path/to/plugin)', 
        'MISSING_DIR_PARAM', 
        400
      ));
    }

    // Security: validate directory path
    const resolvedDir = path.resolve(pluginDir);
    // Allow local development directories and uploaded plugin extraction directories
    const isValidPath = resolvedDir.includes('/home/') || 
                       resolvedDir.includes('/tmp/plugin-playground-uploads/');
    
    if (!isValidPath) {
      return createErrorResponse(new CustomApiError(
        'Invalid directory path - must be in allowed locations', 
        'INVALID_DIR_PATH', 
        400
      ));
    }

    const filePath = requestPath.length > 0 ? requestPath.join('/') : 'index.html';
    
    // Security: prevent directory traversal
    if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\\')) {
      return createErrorResponse(new CustomApiError(
        'Invalid file path - directory traversal not allowed', 
        'INVALID_FILE_PATH', 
        400
      ));
    }

    console.log(`[PLUGIN-PLAYGROUND] Serving: ${filePath} from ${pluginDir}`);

    let fullPath: string;
    
    // Try to serve from public directory first, then root
    const publicPath = path.join(resolvedDir, 'public', filePath);
    const rootPath = path.join(resolvedDir, filePath);
    
    try {
      await fs.access(publicPath);
      fullPath = publicPath;
      console.log(`[PLUGIN-PLAYGROUND] Serving from public: ${fullPath}`);
    } catch {
      try {
        await fs.access(rootPath);
        fullPath = rootPath;
        console.log(`[PLUGIN-PLAYGROUND] Serving from root: ${fullPath}`);
      } catch {
        // File not found - provide helpful error
        return createErrorResponse(new CustomApiError(
          `File not found: ${filePath}. Checked both public/ and root directories.`, 
          'FILE_NOT_FOUND', 
          404,
          { 
            checkedPaths: [publicPath, rootPath],
            suggestedStructure: {
              'public/index.html': 'Main plugin HTML file',
              'public/script.js': 'Plugin JavaScript code',
              'public/styles.css': 'Plugin CSS styles',
              'package.json': 'Plugin metadata'
            }
          }
        ));
      }
    }

    const content = await fs.readFile(fullPath, 'utf8');
    const contentType = getMimeType(filePath);

    // Inject development enhancements for HTML files
    if (contentType.includes('text/html') && (filePath === 'index.html' || filePath === '' || filePath === '/')) {
      const enhancedContent = injectPlaygroundScripts(content, pluginDir);
      
      return new NextResponse(enhancedContent, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate', // Disable caching for development
          'X-Plugin-Playground': 'true',
          'X-Plugin-Directory': pluginDir,
        },
      });
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate', // Disable caching for development
        'X-Plugin-Playground': 'true',
      },
    });

  } catch (error) {
    console.error('[PLUGIN-PLAYGROUND] Error:', error);
    return createErrorResponse(error);
  }
}

function injectPlaygroundScripts(htmlContent: string, pluginDir: string): string {
  // Check if already injected
  if (htmlContent.includes('PLUGIN PLAYGROUND LOADED')) {
    return htmlContent;
  }
  
  const playgroundScript = `
    <script>
      // === ENHANCED PLUGIN PLAYGROUND TESTING SYSTEM ===
      console.log('=== PLUGIN PLAYGROUND LOADED ===');
      console.log('Development mode active - changes will reload automatically');
      console.log('Plugin directory: ${pluginDir}');
      
      // Performance Monitoring
      const performanceMonitor = {
        startTime: Date.now(),
        memoryBaselineSet: false,
        memoryBaseline: 0,
        
        getMemoryUsage() {
          if (window.performance && window.performance.memory) {
            return window.performance.memory.usedJSHeapSize;
          }
          return 0;
        },
        
        reportMetrics() {
          const now = Date.now();
          const loadTime = now - this.startTime;
          const memoryUsage = this.getMemoryUsage();
          
          if (!this.memoryBaselineSet) {
            this.memoryBaseline = memoryUsage;
            this.memoryBaselineSet = true;
          }
          
          const metrics = {
            loadTime: loadTime,
            memoryUsage: memoryUsage - this.memoryBaseline,
            renderTime: window.performance?.timing ? 
              window.performance.timing.loadEventEnd - window.performance.timing.navigationStart : 0,
            domNodes: document.querySelectorAll('*').length,
            apiCalls: [], // Will be populated by network interceptor
            jsErrors: 0    // Will be incremented by error handler
          };
          
          this.sendToParent('PLUGIN_PERFORMANCE_METRICS', { metrics });
        }
      };
      
      // Network Request Interceptor
      const networkMonitor = {
        originalFetch: window.fetch,
        originalXMLHttpRequest: window.XMLHttpRequest,
        
        init() {
          // Intercept fetch requests
          window.fetch = async (...args) => {
            const startTime = Date.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            const method = args[1]?.method || 'GET';
            
            try {
              const response = await this.originalFetch.apply(window, args);
              const endTime = Date.now();
              
              // Report network request
              this.reportNetworkRequest({
                url,
                method,
                status: response.status,
                duration: endTime - startTime,
                headers: Object.fromEntries(response.headers.entries()),
                size: response.headers.get('content-length') || 0
              });
              
              return response;
            } catch (error) {
              const endTime = Date.now();
              
              this.reportNetworkRequest({
                url,
                method,
                status: 0,
                duration: endTime - startTime,
                headers: {},
                size: 0
              });
              
              throw error;
            }
          };
          
          // Intercept XMLHttpRequest
          const XHRConstructor = this.originalXMLHttpRequest;
          window.XMLHttpRequest = function() {
            const xhr = new XHRConstructor();
            const startTime = Date.now();
            let url = '';
            let method = 'GET';
            
            const originalOpen = xhr.open;
            xhr.open = function(m, u) {
              method = m;
              url = u;
              return originalOpen.apply(this, arguments);
            };
            
            xhr.addEventListener('loadend', () => {
              const endTime = Date.now();
              networkMonitor.reportNetworkRequest({
                url,
                method,
                status: xhr.status,
                duration: endTime - startTime,
                headers: xhr.getAllResponseHeaders().split('\\r\\n').reduce((acc, header) => {
                  const [key, value] = header.split(': ');
                  if (key) acc[key] = value;
                  return acc;
                }, {}),
                size: xhr.responseText?.length || 0
              });
            });
            
            return xhr;
          };
        },
        
        reportNetworkRequest(request) {
          performanceMonitor.sendToParent('PLUGIN_NETWORK_REQUEST', { request });
        }
      };
      
      // State Change Tracker
      const stateTracker = {
        trackStateChange(type, data, source = 'plugin') {
          performanceMonitor.sendToParent('PLUGIN_STATE_CHANGE', {
            stateChange: { type, data, source }
          });
        }
      };
      
      // Test Framework
      const testFramework = {
        reportTestResult(name, status, duration = null, error = null) {
          performanceMonitor.sendToParent('PLUGIN_TEST_RESULT', {
            testResult: { name, status, duration, error }
          });
        }
      };
      
      // Enhanced Console Forwarding
      const originalConsole = {
        log: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        info: console.info.bind(console)
      };
      
      function forwardConsoleToParent(method, args) {
        originalConsole[method](...args);
        
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'PLUGIN_PLAYGROUND_LOG',
              method: method,
              args: Array.from(args).map(arg => {
                try {
                  return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
                } catch (e) {
                  return '[Unserializable Object]';
                }
              }),
              timestamp: Date.now(),
              source: 'plugin-playground',
              pluginDir: '${pluginDir}'
            }, '*');
          }
        } catch (e) {
          originalConsole.warn('Failed to forward console message to parent:', e);
        }
      }
      
      // Override console methods
      ['log', 'error', 'warn', 'info'].forEach(method => {
        console[method] = function(...args) {
          forwardConsoleToParent(method, args);
        };
      });
      
      // Error Handling
      window.addEventListener('error', function(event) {
        performanceMonitor.sendToParent('PLUGIN_ERROR', {
          error: event.error?.message || 'Unknown error',
          stack: event.error?.stack,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });
      
      // Mock MetricsHub Environment with Enhanced Mock Data
      window.METRICSHUB_CONFIG = {
        companyId: 'playground-company-123',
        apiBaseUrl: 'http://localhost:3000',
        oauthTokens: {
          access_token: 'playground_mock_token_12345',
          refresh_token: 'playground_mock_refresh_token',
          scope: 'https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/analytics.readonly',
          expires_at: new Date(Date.now() + 3600000).toISOString()
        },
        appId: 'playground-app-${Date.now()}',
        ready: true,
        playground: true
      };
      
      // Set legacy globals
      window.COMPANY_ID = window.METRICSHUB_CONFIG.companyId;
      window.API_BASE_URL = window.METRICSHUB_CONFIG.apiBaseUrl;
      window.OAUTH_TOKENS = window.METRICSHUB_CONFIG.oauthTokens;
      
      // Enhanced Plugin Development Helper Functions
      window.PLUGIN_PLAYGROUND = {
        reloadPlugin: function() {
          console.log('🔄 Reloading plugin...');
          window.location.reload();
        },
        
        validateStructure: async function() {
          console.log('📁 Validating plugin structure...');
          try {
            const response = await fetch(\`/api/plugin-playground/validate?dir=\${encodeURIComponent('${pluginDir}')}\`);
            const result = await response.json();
            console.log('Structure validation result:', result);
            return result;
          } catch (error) {
            console.error('Failed to validate structure:', error);
            return { valid: false, error: error.message };
          }
        },
        
        trackState: stateTracker.trackStateChange,
        
        reportTest: testFramework.reportTestResult,
        
        mockApiCall: function(endpoint, data = {}) {
          console.log(\`🎭 Mock API call to: \${endpoint}\`, data);
          
          // Enhanced mock data generator
          const mockData = {
            '/api/proxy/google-ads/accounts': {
              success: true,
              accounts: Array.from({length: 5}, (_, i) => ({
                customerId: \`123-456-\${7890 + i}\`,
                descriptiveName: \`Test Account \${i + 1}\`,
                currencyCode: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'][i],
                timeZone: 'America/New_York',
                accountType: i === 0 ? 'MCC' : 'CLIENT',
                canManageClients: i === 0,
                testAccount: true
              })),
              total: 5
            },
            '/api/proxy/google-ads/campaigns': {
              success: true,
              campaigns: Array.from({length: 10}, (_, i) => ({
                id: \`campaign_\${i + 1}\`,
                name: \`Test Campaign \${i + 1}\`,
                status: ['ENABLED', 'PAUSED', 'REMOVED'][i % 3],
                budget: (1000 + i * 500) * 100, // in micros
                clicks: Math.floor(Math.random() * 1000),
                impressions: Math.floor(Math.random() * 10000),
                cost: Math.floor(Math.random() * 50000), // in micros
                ctr: (Math.random() * 5).toFixed(2),
                averageCpc: Math.floor(Math.random() * 200) // in micros
              })),
              total: 10
            }
          };
          
          const result = mockData[endpoint] || { success: true, message: 'Mock response', data: data };
          
          // Simulate API call timing
          return new Promise(resolve => {
            setTimeout(() => resolve(result), 100 + Math.random() * 200);
          });
        },
        
        getDebugInfo: function() {
          return {
            pluginDir: '${pluginDir}',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            config: window.METRICSHUB_CONFIG,
            performance: {
              memory: performanceMonitor.getMemoryUsage(),
              loadTime: Date.now() - performanceMonitor.startTime,
              domNodes: document.querySelectorAll('*').length
            },
            playground: true
          };
        },
        
        // Testing utilities
        runTests: async function(testSuite) {
          console.log('🧪 Running test suite:', testSuite);
          
          // Store reference to mockApiCall for use in tests
          const mockApiCall = this.mockApiCall;
          
          const tests = {
            'basic': [
              { name: 'Plugin Loading', test: () => !!window.METRICSHUB_CONFIG },
              { name: 'DOM Ready', test: () => document.readyState === 'complete' },
              { name: 'Console Available', test: () => typeof console.log === 'function' }
            ],
            'api': [
              { name: 'API Integration', test: async () => {
                try {
                  const result = await mockApiCall('/api/proxy/google-ads/accounts');
                  return result && result.success === true;
                } catch (error) {
                  console.error('API Integration test error:', error);
                  return false;
                }
              }},
              { name: 'Network Monitoring', test: () => typeof window.fetch === 'function' },
              { name: 'Mock Data Available', test: async () => {
                try {
                  const result = await mockApiCall('/api/proxy/google-ads/campaigns');
                  return result && result.campaigns && result.campaigns.length > 0;
                } catch (error) {
                  return false;
                }
              }}
            ]
          };
          
          const selectedTests = tests[testSuite] || tests.basic;
          
          for (const testDef of selectedTests) {
            const startTime = Date.now();
            try {
              const result = await testDef.test();
              const duration = Date.now() - startTime;
              
              if (result) {
                testFramework.reportTestResult(testDef.name, 'passed', duration);
                console.log(\`✅ \${testDef.name}: PASSED (\${duration}ms)\`);
              } else {
                testFramework.reportTestResult(testDef.name, 'failed', duration, 'Test assertion failed');
                console.log(\`❌ \${testDef.name}: FAILED (\${duration}ms)\`);
              }
            } catch (error) {
              const duration = Date.now() - startTime;
              testFramework.reportTestResult(testDef.name, 'failed', duration, error.message);
              console.log(\`❌ \${testDef.name}: ERROR (\${duration}ms) - \${error.message}\`);
            }
          }
        }
      };
      
      // Add sendToParent helper to performance monitor
      performanceMonitor.sendToParent = function(type, data) {
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: type,
              ...data,
              pluginDir: '${pluginDir}',
              timestamp: Date.now()
            }, '*');
          }
        } catch (e) {
          console.warn('Failed to send message to parent:', e);
        }
      };
      
      // Initialize monitoring systems
      networkMonitor.init();
      
      // Start performance monitoring
      performanceMonitor.reportMetrics();
      const perfInterval = setInterval(() => {
        performanceMonitor.reportMetrics();
      }, 1000);
      
      // Auto-reload on file changes (development only)
      let lastReloadTime = Date.now();
      const checkForChanges = setInterval(async () => {
        try {
          const response = await fetch(window.location.href, { 
            method: 'HEAD',
            cache: 'no-cache'
          });
          const lastModified = response.headers.get('last-modified');
          if (lastModified && new Date(lastModified).getTime() > lastReloadTime) {
            console.log('📝 File changes detected, reloading...');
            window.location.reload();
          }
        } catch (error) {
          // Silent fail for auto-reload
        }
      }, 2000);
      
      // Dispatch ready events
      window.dispatchEvent(new CustomEvent('metricshub:config:ready', { 
        detail: window.METRICSHUB_CONFIG 
      }));
      
      window.dispatchEvent(new CustomEvent('plugin:playground:ready', { 
        detail: window.PLUGIN_PLAYGROUND 
      }));
      
      // Enhanced logging
      console.log('🎮 Enhanced Plugin Playground ready! Available functions:');
      console.log('  - PLUGIN_PLAYGROUND.reloadPlugin() - Manually reload');
      console.log('  - PLUGIN_PLAYGROUND.validateStructure() - Check file structure');
      console.log('  - PLUGIN_PLAYGROUND.mockApiCall(endpoint, data) - Test API calls');
      console.log('  - PLUGIN_PLAYGROUND.trackState(type, data, source) - Track state changes');
      console.log('  - PLUGIN_PLAYGROUND.reportTest(name, status, duration, error) - Report test results');
      console.log('  - PLUGIN_PLAYGROUND.runTests(suite) - Run test suite');
      console.log('  - PLUGIN_PLAYGROUND.getDebugInfo() - Get debug information');
      
      // Clean up on unload
      window.addEventListener('beforeunload', () => {
        clearInterval(perfInterval);
        clearInterval(checkForChanges);
      });
      
      // Enhanced playground notification
      setTimeout(() => {
        console.log('%c🎮 ENHANCED PLUGIN PLAYGROUND MODE ACTIVE', 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        console.log('%c🔍 Performance monitoring, network inspection, and testing enabled', 'color: #2196F3; font-style: italic;');
        console.log('%c📊 Check the Performance, Network, State, and Tests tabs for detailed insights', 'color: #FF9800; font-style: italic;');
      }, 500);
    </script>
  `;
  
  // Inject playground system first
  let modifiedHtml = htmlContent;
  if (modifiedHtml.includes('<head>')) {
    modifiedHtml = modifiedHtml.replace('<head>', '<head>' + playgroundScript);
  } else if (modifiedHtml.includes('<body>')) {
    modifiedHtml = modifiedHtml.replace('<body>', '<body>' + playgroundScript);
  } else {
    modifiedHtml = playgroundScript + modifiedHtml;
  }
  
  return modifiedHtml;
}

// Validation endpoint
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const body = await request.json();
    const { directory } = body;
    
    if (!directory) {
      return NextResponse.json(
        { error: 'Directory path is required' }, 
        { status: 400 }
      );
    }

    const validationResult = await validatePluginStructure(directory);
    return NextResponse.json(validationResult);

  } catch (error) {
    console.error('[PLUGIN-PLAYGROUND] Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate plugin structure' }, 
      { status: 500 }
    );
  }
}

async function validatePluginStructure(directory: string) {
  const result = {
    valid: true,
    issues: [] as string[],
    suggestions: [] as string[],
    files: {} as Record<string, boolean>
  };

  const resolvedDir = path.resolve(directory);
  
  try {
    // Check if directory exists
    await fs.access(resolvedDir);
  } catch {
    result.valid = false;
    result.issues.push('Directory does not exist');
    return result;
  }

  // Required files to check
  const requiredFiles = [
    'public/index.html',
    'public/script.js',
    'public/styles.css',
    'package.json'
  ];

  const optionalFiles = [
    'metadata.json',
    'README.md',
    'public/dist/bundle.js'
  ];

  // Check required files
  for (const file of requiredFiles) {
    const filePath = path.join(resolvedDir, file);
    try {
      await fs.access(filePath);
      result.files[file] = true;
    } catch {
      result.files[file] = false;
      result.valid = false;
      result.issues.push(`Missing required file: ${file}`);
    }
  }

  // Check optional files
  for (const file of optionalFiles) {
    const filePath = path.join(resolvedDir, file);
    try {
      await fs.access(filePath);
      result.files[file] = true;
    } catch {
      result.files[file] = false;
    }
  }

  // Structure suggestions
  if (!result.files['public/index.html']) {
    result.suggestions.push('Create public/index.html as your main plugin file');
  }
  
  if (!result.files['public/script.js']) {
    result.suggestions.push('Create public/script.js for your plugin logic');
  }
  
  if (!result.files['package.json']) {
    result.suggestions.push('Create package.json with plugin metadata');
  }

  if (result.valid) {
    result.suggestions.push('Plugin structure looks good! Ready for development.');
  }

  return result;
}