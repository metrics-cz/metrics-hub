import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import {
  createErrorResponse,
  logError,
  CustomApiError,
  NotFoundError,
  withErrorHandler
} from '@/lib/error-handler';

// Create Supabase client at runtime, not build time
// This prevents "supabaseKey is required" error during Next.js build
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// MIME type detection based on file extension
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
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.gz': 'application/gzip',
    '.tar': 'application/x-tar',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

// Cache for extracted and installed apps
const appCache = new Map<string, { 
  path: string, 
  port: number, 
  process: any,
  timestamp: number,
  lastAccess: number,
  installed: boolean,
  accessCount: number
}>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (increased from 5)
const ACTIVITY_THRESHOLD = 2 * 60 * 1000; // 2 minutes since last access
let nextPort = 4000;

// Map to track ongoing extractions to prevent concurrent extractions
const extractionLocks = new Map<string, Promise<any>>();

interface RouteContext {
  params: Promise<{
    appId: string;
    path: string[];
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appId, path: requestPath } = await context.params;
    const filePath = requestPath.join('/') || 'index.html';

    // Security: validate appId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(appId)) {
      const error = new CustomApiError(
        'Invalid application ID format', 
        'INVALID_APP_ID', 
        400, 
        { appId }
      );
      logError(error, 'Plugin app validation');
      return createErrorResponse(error);
    }

    // Security: validate file path (prevent directory traversal)
    if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\\')) {
      const error = new CustomApiError(
        'Invalid file path - directory traversal not allowed', 
        'INVALID_FILE_PATH', 
        400, 
        { filePath }
      );
      logError(error, 'Plugin app file path validation');
      return createErrorResponse(error);
    }

    // Process app storage request

    // Check if app is already running first
    let cached = appCache.get(appId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL && cached.installed) {
      // Update last access time and increment counter
      cached.lastAccess = Date.now();
      cached.accessCount++;
      
      // Proxy request to running app
      const appUrl = `http://localhost:${cached.port}/${filePath}`;
      // Use cached app instance
      
      try {
        const response = await fetch(appUrl);
        const content = await response.arrayBuffer();
        const contentType = getMimeType(filePath);
        
        // Inject token passing script and dependency management for HTML files
        if (contentType.includes('text/html') && (filePath === 'index.html' || filePath === '' || filePath === '/')) {
          let htmlContent = Buffer.from(content).toString();
          htmlContent = injectMetricsHubScripts(htmlContent);
          
          return new NextResponse(htmlContent, {
            status: response.status,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=60',
              'X-Frame-Options': 'SAMEORIGIN',
            },
          });
        }
        
        return new NextResponse(content, {
          status: response.status,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=60',
            'X-Frame-Options': 'SAMEORIGIN',
          },
        });
      } catch (proxyError) {
        console.error('Error proxying to cached app:', proxyError);
        // Remove from cache if it's not working and continue to reinstall
        appCache.delete(appId);
        cached = undefined;
      }
    }

    // Extract and install app (use lock to prevent concurrent extractions)
    let extractionPromise = extractionLocks.get(appId);
    if (!extractionPromise) {
      console.log(`Starting new extraction for app ${appId}`);
      extractionPromise = extractAndInstallApp(appId);
      extractionLocks.set(appId, extractionPromise);
      
      // Clean up lock after completion
      extractionPromise.finally(() => {
        console.log(`Cleaning up extraction lock for app ${appId}`);
        extractionLocks.delete(appId);
      });
    } else {
      console.log(`Waiting for ongoing extraction of app ${appId}`);
    }
    
    const appDir = await extractionPromise;
    if (!appDir) {
      const error = new CustomApiError(
        'Failed to extract and install application', 
        'APP_EXTRACTION_FAILED', 
        500, 
        { appId }
      );
      logError(error, 'Plugin app extraction');
      return createErrorResponse(error);
    }

    // Check if app is now cached (might have been started by another concurrent request)
    cached = appCache.get(appId);
    let port: number | null;
    
    if (cached && cached.installed) {
      console.log(`App ${appId} already running on port ${cached.port}, reusing`);
      port = cached.port;
    } else {
      // Start the app
      port = await startApp(appId, appDir);
      if (!port) {
        const error = new CustomApiError(
          'Failed to start application server', 
          'APP_STARTUP_FAILED', 
          500, 
          { appId }
        );
        logError(error, 'Plugin app startup');
        return createErrorResponse(error);
      }
    }

    // Wait for the app to start and test connectivity (reduced timeout)
    console.log(`Waiting for app to start on port ${port}...`);
    let attempts = 0;
    const maxAttempts = 10; // 10 seconds instead of 30
    let appReady = false;
    
    while (attempts < maxAttempts && !appReady) {
      try {
        // Shorter delay between attempts
        await new Promise(resolve => setTimeout(resolve, 500));
        const testResponse = await fetch(`http://localhost:${port}/`, { 
          signal: AbortSignal.timeout(500) // Shorter timeout per request
        });
        if (testResponse.ok || testResponse.status < 500) {
          appReady = true;
          console.log(`App ready on port ${port} after ${(attempts + 1) * 0.5} seconds`);
        }
      } catch (e) {
        attempts++;
        if (attempts <= maxAttempts) {
          console.log('App not ready yet, attempt ' + attempts + '/' + maxAttempts);
        }
      }
    }
    
    if (!appReady) {
      console.error(`App failed to start after ${maxAttempts * 0.5} seconds`);
      return NextResponse.json(
        { error: 'Application failed to start within timeout period' },
        { status: 502 }
      );
    }

    // Proxy the request
    const appUrl = `http://localhost:${port}/${filePath}`;
    
    try {
      const response = await fetch(appUrl);
      const content = await response.arrayBuffer();
      const contentType = getMimeType(filePath);
      
      // Inject token passing script and dependency management for HTML files
      if (contentType.includes('text/html') && (filePath === 'index.html' || filePath === '' || filePath === '/')) {
        let htmlContent = Buffer.from(content).toString();
        htmlContent = injectMetricsHubScripts(htmlContent);
        
        return new NextResponse(htmlContent, {
          status: response.status,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=60',
            'X-Frame-Options': 'SAMEORIGIN',
          },
        });
      }
      
      return new NextResponse(content, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=60',
          'X-Frame-Options': 'SAMEORIGIN',
        },
      });
    } catch (proxyError) {
      console.error('Error proxying to started app:', proxyError);
      return NextResponse.json(
        { error: 'Application started but not responding' },
        { status: 502 }
      );
    }

  } catch (error) {
    logError(error, 'Plugin app serving');
    return createErrorResponse(error);
  }
}

function injectMetricsHubScripts(htmlContent: string): string {
  // Check if already injected
  if (htmlContent.includes('METRICSHUB TOKEN SYSTEM LOADED')) {
    return htmlContent;
  }

  // Read the UMD SDK bundle from the built plugin-sdk (browser-compatible)
  let sdkContent = '';
  try {
    const sdkPath = path.join(process.cwd(), 'packages/plugin-sdk/dist/index.umd.js');
    sdkContent = require('fs').readFileSync(sdkPath, 'utf8');
    console.log('✅ Successfully loaded MetricsHub SDK UMD bundle for injection', {
      sdkPath,
      sdkContentLength: sdkContent.length,
      sdkContentPreview: sdkContent.substring(0, 200) + '...'
    });
  } catch (error) {
    console.error('❌ Failed to load MetricsHub SDK UMD bundle:', error instanceof Error ? error.message : String(error));
    // Continue without SDK injection - will fall back to legacy methods
  }

  const tokenPassingScript = `
    <script>
      // Console Forwarding System - Forward iframe console to parent
      console.log('=== CONSOLE FORWARDING SYSTEM LOADED ===');

      // Store original console methods
      const originalConsole = {
        log: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        info: console.info.bind(console)
      };

      // Override console methods to forward to parent
      function forwardConsoleToParent(method, args) {
        // Call original method first
        originalConsole[method](...args);

        // Forward to parent window
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'METRICSHUB_CONSOLE_LOG',
              method: method,
              args: Array.from(args).map(arg => {
                // Simple string conversion - avoid complex serialization
                try {
                  return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                } catch (e) {
                  return '[Object]';
                }
              }),
              timestamp: Date.now(),
              source: 'iframe'
            }, '*');
          }
        } catch (e) {
          // Silently fail if parent communication fails
        }
      }

      // Override console methods
      console.log = function(...args) {
        forwardConsoleToParent('log', args);
      };

      console.error = function(...args) {
        forwardConsoleToParent('error', args);
      };

      console.warn = function(...args) {
        forwardConsoleToParent('warn', args);
      };

      console.info = function(...args) {
        forwardConsoleToParent('info', args);
      };

      console.log('Console forwarding initialized - all iframe logs will appear in parent');

      // MetricsHub Token Passing System
      console.log('=== METRICSHUB TOKEN SYSTEM LOADED ===');

      // Global config object
      window.METRICSHUB_CONFIG = {
        companyId: null,
        apiBaseUrl: null,
        oauthTokens: null,
        appId: null,
        ready: false
      };

      // Listen for configuration from parent
      window.addEventListener('message', function(event) {
        console.log('Received postMessage:', event.data);

        if (event.data?.type === 'METRICSHUB_CONFIG') {
          const config = event.data.payload;
          console.log('Updating MetricsHub config:', config);

          // Update global config
          window.METRICSHUB_CONFIG = {
            ...config,
            ready: true
          };

          // Set legacy globals for backward compatibility
          window.COMPANY_ID = config.companyId;
          window.API_BASE_URL = config.apiBaseUrl;
          window.OAUTH_TOKENS = config.oauthTokens;

          // Initialize MetricsHub SDK with received config
          if (window.MetricsHubSDK && window.MetricsHubSDK.MetricsHubSDK) {
            try {
              // Create SDK instance with proper config (UMD exposes as MetricsHubSDK.MetricsHubSDK)
              const sdkInstance = new window.MetricsHubSDK.MetricsHubSDK({
                apiKey: null, // Not needed for OAuth flow
                companyId: config.companyId,
                apiBaseUrl: config.apiBaseUrl,
                oauthTokens: config.oauthTokens
              });

              // Create convenience globals for plugins
              window.metricsHubSDK = sdkInstance;
              window.MetricsHubSDK.instance = sdkInstance;

              console.log('✅ MetricsHub SDK initialized successfully', {
                companyId: config.companyId,
                apiBaseUrl: config.apiBaseUrl,
                hasTokens: !!config.oauthTokens,
                sdkMethods: Object.keys(sdkInstance)
              });
            } catch (sdkError) {
              console.error('❌ Failed to initialize MetricsHub SDK:', sdkError);
            }
          } else {
            console.warn('⚠️ MetricsHub SDK class not available - will use legacy methods', {
              hasMetricsHubSDK: !!window.MetricsHubSDK,
              sdkKeys: window.MetricsHubSDK ? Object.keys(window.MetricsHubSDK) : 'undefined'
            });
          }

          // Dispatch ready event
          window.dispatchEvent(new CustomEvent('metricshub:config:ready', {
            detail: config
          }));

          console.log('MetricsHub config ready, tokens available:', !!config.oauthTokens);
        }
      });

      // Request tokens from parent
      function requestTokenRefresh() {
        console.log('Requesting token refresh from parent');
        window.parent.postMessage({
          type: 'METRICSHUB_TOKEN_REQUEST',
          timestamp: Date.now()
        }, '*');
      }

      // Expose token refresh globally
      window.requestTokenRefresh = requestTokenRefresh;

      console.log('Token passing system initialized');
    </script>

    ${sdkContent ? `<script>
      // MetricsHub SDK Bundle - Injected from packages/plugin-sdk/dist/index.js
      console.log('=== METRICSHUB SDK INJECTION ===');
      ${sdkContent}
      console.log('MetricsHub SDK bundle loaded - window.MetricsHubSDK should be available');
    </script>` : ''}

    <script>
      // Plugin Support System
      console.log('=== PLUGIN SUPPORT LOADED ===');

      // Request parent to send config immediately when iframe loads
      window.parent.postMessage({
        type: 'METRICSHUB_IFRAME_READY',
        timestamp: Date.now()
      }, '*');

      console.log('Plugin support system initialized');
    </script>
  `;
  
  // Inject token system first
  let modifiedHtml = htmlContent;
  if (modifiedHtml.includes('<head>')) {
    modifiedHtml = modifiedHtml.replace('<head>', '<head>' + tokenPassingScript);
  } else if (modifiedHtml.includes('<body>')) {
    modifiedHtml = modifiedHtml.replace('<body>', '<body>' + tokenPassingScript);
  } else {
    modifiedHtml = tokenPassingScript + modifiedHtml;
  }
  
  // Check if DataTables buttons are used and inject extensions AFTER main buttons script
  if (modifiedHtml.includes('dataTables.buttons.min.js')) {
    console.log('Detected DataTables buttons usage, injecting required extensions after main buttons script');

    // Use CDN fallbacks for DataTables extensions since local files may not be available
    const extensionScripts = `
    <script src="https://cdn.datatables.net/buttons/3.1.2/js/buttons.colVis.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/3.1.2/js/buttons.html5.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/3.1.2/js/buttons.print.min.js"></script>`;

    // Inject extension scripts immediately after the main buttons script
    modifiedHtml = modifiedHtml.replace(
      'dataTables.buttons.min.js"></script>',
      'dataTables.buttons.min.js"></script>' + extensionScripts
    );
  }
  
  return modifiedHtml;
}

// Function to automatically detect required packages from HTML script tags
async function detectRequiredPackages(appDir: string): Promise<Array<{from: string, to: string}>> {
  const packagesToSymlink: Array<{from: string, to: string}> = [];
  
  try {
    // Read the main HTML file
    const htmlPath = path.join(appDir, 'public', 'index.html');
    let htmlContent: string;
    
    try {
      htmlContent = await fs.readFile(htmlPath, 'utf8');
    } catch (e) {
      console.log('No index.html found for dependency detection, using default packages');
      return getDefaultPackages();
    }
    
    // Parse HTML to find script tags with node_modules references
    const scriptTagRegex = /<script[^>]+src=["']([^"']*node_modules[^"']*)["'][^>]*>/gi;
    const nodeModulesRefs: string[] = [];
    let match;
    
    while ((match = scriptTagRegex.exec(htmlContent)) !== null) {
      if (match[1]) {
        nodeModulesRefs.push(match[1]);
      }
    }
    
    console.log('Found node_modules references in HTML:', nodeModulesRefs);
    
    // Extract package names from node_modules paths
    const requiredPackages = new Set<string>();
    for (const ref of nodeModulesRefs) {
      // Extract package name from paths like "node_modules/jquery/dist/jquery.min.js"
      const packageMatch = ref.match(/node_modules\/([^\/]+)/);
      if (packageMatch && packageMatch[1]) {
        requiredPackages.add(packageMatch[1]);
      }
    }
    
    console.log('Required packages detected:', Array.from(requiredPackages));
    
    // Find matching packages in pnpm structure
    const nodeModulesDir = path.join(appDir, 'node_modules', '.pnpm');
    
    try {
      const pnpmDirs = await fs.readdir(nodeModulesDir);
      
      for (const packageName of requiredPackages) {
        // Find pnpm directory that matches this package
        const matchingDir = pnpmDirs.find(dir => dir.startsWith(`${packageName}@`));
        
        if (matchingDir) {
          packagesToSymlink.push({
            from: `.pnpm/${matchingDir}/node_modules/${packageName}`,
            to: packageName
          });
          console.log(`Found pnpm package for ${packageName}: ${matchingDir}`);
        } else {
          console.log(`No pnpm package found for ${packageName}`);
        }
      }
    } catch (e) {
      console.log('Error reading pnpm directory, falling back to default packages');
      return getDefaultPackages();
    }
    
    // If no packages detected, use defaults
    if (packagesToSymlink.length === 0) {
      console.log('No packages auto-detected, using default packages');
      return getDefaultPackages();
    }
    
    return packagesToSymlink;
    
  } catch (error) {
    logError(error, 'Dependency detection');
    console.log('Error in dependency detection, using default packages');
    return getDefaultPackages();
  }
}

// Fallback default packages for when auto-detection fails
function getDefaultPackages(): Array<{from: string, to: string}> {
  return [
    { from: '.pnpm/jquery@3.7.1/node_modules/jquery', to: 'jquery' },
    { from: '.pnpm/bootstrap@4.6.2_jquery@3.7.1_popper.js@1.16.1/node_modules/bootstrap', to: 'bootstrap' },
    { from: '.pnpm/datatables.net@2.3.3/node_modules/datatables.net', to: 'datatables.net' },
    { from: '.pnpm/datatables.net-bs4@2.3.3/node_modules/datatables.net-bs4', to: 'datatables.net-bs4' },
    { from: '.pnpm/datatables.net-buttons@3.2.4/node_modules/datatables.net-buttons', to: 'datatables.net-buttons' },
    { from: '.pnpm/datatables.net-buttons-bs4@3.2.4/node_modules/datatables.net-buttons-bs4', to: 'datatables.net-buttons-bs4' }
  ];
}

async function extractAndInstallApp(appId: string): Promise<string | null> {
  try {
    // Create temp directory
    const tempDir = path.join(process.cwd(), '.temp', appId);
    
    // Clean up existing directory if it exists
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Directory doesn't exist, continue
    }
    
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`Created temp directory: ${tempDir}`);

    // List files in the app directory to find the ZIP file
    const supabase = getSupabaseClient();
    const { data: files, error: listError } = await supabase.storage
      .from('app-storage')
      .list(`apps/${appId}`);

    if (listError) {
      console.error('Error listing app files:', listError);
      return null;
    }

    if (!files || files.length === 0) {
      console.error(`No files found in app directory: apps/${appId}`);
      return null;
    }

    // Find ZIP file
    const zipFile = files.find(file => file.name.endsWith('.zip'));
    if (!zipFile) {
      console.error(`No ZIP file found in directory for app: ${appId}`);
      return null;
    }

    console.log(`Found ZIP file: ${zipFile.name}`);

    // Download ZIP
    const { data, error } = await supabase.storage
      .from('app-storage')
      .download(`apps/${appId}/${zipFile.name}`);

    if (error) {
      console.error('Error downloading ZIP:', error);
      return null;
    }

    if (!data) {
      console.error('ZIP data is empty');
      return null;
    }

    console.log(`Downloaded ZIP file, size: ${(await data.arrayBuffer()).byteLength} bytes`);

    // Extract ZIP
    const buffer = Buffer.from(await data.arrayBuffer());
    const zip = new AdmZip(buffer);
    zip.extractAllTo(tempDir, true);
    console.log(`Extracted ZIP to: ${tempDir}`);

    // List extracted files for debugging
    const extractedFiles = await fs.readdir(tempDir, { recursive: true });
    console.log(`Extracted files:`, extractedFiles);

    // No package installation - expect ZIP to contain pre-built node_modules
    console.log(`App extracted successfully for ${appId}, ready to serve`);

    // Create proper dependency structure for pnpm packages
    try {
      const publicDir = path.join(tempDir, 'public');
      const nodeModulesInPublic = path.join(publicDir, 'node_modules');
      const nodeModulesInRoot = path.join(tempDir, 'node_modules');
      
      // Check if both directories exist
      await fs.access(publicDir);
      await fs.access(nodeModulesInRoot);
      
      // Create node_modules directory in public if it doesn't exist
      try {
        await fs.access(nodeModulesInPublic);
        console.log('node_modules directory already exists in public');
      } catch (e) {
        await fs.mkdir(nodeModulesInPublic, { recursive: true });
        console.log('Created node_modules directory in public');
      }
      
      // Automatically detect required packages from HTML script tags
      const packagesToSymlink = await detectRequiredPackages(tempDir);
      
      for (const pkg of packagesToSymlink) {
        const sourcePath = path.join(nodeModulesInRoot, pkg.from);
        const targetPath = path.join(nodeModulesInPublic, pkg.to);
        
        try {
          await fs.access(sourcePath);
          try {
            await fs.access(targetPath);
            console.log(`${pkg.to} symlink already exists`);
          } catch (e) {
            await fs.symlink(path.join('..', '..', 'node_modules', pkg.from), targetPath);
            console.log(`Created ${pkg.to} symlink to pnpm package`);
          }
        } catch (e) {
          console.log(`Package ${pkg.to} not found in pnpm structure, skipping symlink`);
        }
      }
      
      // Create proper dist structures for packages with non-standard layouts
      const packageDistFixups = [
        {
          name: 'jquery',
          createDist: async (pkgPath: string) => {
            const distPath = path.join(pkgPath, 'dist');
            const minPath = path.join(distPath, 'jquery.min.js');
            
            try {
              await fs.access(distPath);
            } catch (e) {
              await fs.mkdir(distPath, { recursive: true });
              console.log('Created jquery/dist directory');
            }
            
            try {
              await fs.access(minPath);
              console.log('jquery.min.js already exists');
            } catch (e) {
              // Download proper jQuery distribution file from CDN instead of using AMD source
              console.log('jQuery dist file missing, downloading from CDN...');
              
              try {
                const jqueryResponse = await fetch('https://code.jquery.com/jquery-3.7.1.min.js');
                if (jqueryResponse.ok) {
                  const jqueryContent = await jqueryResponse.text();
                  await fs.writeFile(minPath, jqueryContent, 'utf8');
                  console.log('Downloaded and saved jQuery 3.7.1 distribution file');
                } else {
                  throw new Error(`Failed to fetch jQuery: ${jqueryResponse.status}`);
                }
              } catch (fetchError) {
                console.error('Failed to download jQuery from CDN:', fetchError);
                // Fallback: create a minimal jQuery stub that logs the error
                const jqueryStub = `
// jQuery loading failed - CDN download error
console.error('jQuery failed to load from CDN. Using minimal stub.');
window.$ = window.jQuery = function() {
  console.error('jQuery is not available. Please check network connectivity.');
  return {};
};
window.$.fn = {};
window.jQuery.fn = {};
`;
                await fs.writeFile(minPath, jqueryStub, 'utf8');
                console.log('Created jQuery fallback stub due to CDN failure');
              }
            }
          }
        },
        {
          name: 'bootstrap',
          createDist: async (pkgPath: string) => {
            const distPath = path.join(pkgPath, 'dist');
            const jsDistPath = path.join(distPath, 'js');
            const bundlePath = path.join(jsDistPath, 'bootstrap.bundle.min.js');
            
            // Bootstrap 4.x doesn't have pre-built files, we need to create them
            try {
              await fs.mkdir(jsDistPath, { recursive: true });
              console.log('Created bootstrap/dist/js directory');
            } catch (e) {
              // Directory might already exist
            }
            
            try {
              await fs.access(bundlePath);
              console.log('bootstrap.bundle.min.js already exists');
            } catch (e) {
              // Create a basic bootstrap bundle (simplified version)
              // In production, you'd want the actual Bootstrap JS file
              const bootstrapStub = `/* Bootstrap JS stub - replace with actual file */\nconsole.log('Bootstrap JS loaded');`;
              await fs.writeFile(bundlePath, bootstrapStub);
              console.log('Created bootstrap.bundle.min.js stub file');
            }
          }
        },
        {
          name: 'datatables.net',
          createDist: async (pkgPath: string) => {
            // DataTables has files in js/ but HTML expects them in js/
            // No changes needed for DataTables structure
            console.log('DataTables structure is compatible');
          }
        },
        {
          name: 'datatables.net-buttons',
          createDist: async (pkgPath: string) => {
            // Ensure DataTables Buttons extensions are properly accessible
            const jsPath = path.join(pkgPath, 'js');
            
            try {
              await fs.access(jsPath);
              console.log('DataTables Buttons extensions are accessible');
              
              // Check if the key extensions exist and are accessible
              const keyExtensions = [
                'buttons.colVis.min.js',
                'buttons.html5.min.js', 
                'buttons.print.min.js',
                'dataTables.buttons.min.js'
              ];
              
              for (const ext of keyExtensions) {
                const extPath = path.join(jsPath, ext);
                try {
                  await fs.access(extPath);
                  console.log(`DataTables Buttons extension ${ext} is accessible`);
                } catch (e) {
                  console.log(`Warning: DataTables Buttons extension ${ext} not found at ${extPath}`);
                }
              }
            } catch (e) {
              console.log('DataTables Buttons js directory not accessible:', e instanceof Error ? e.message : String(e));
            }
          }
        }
      ];
      
      // Apply package-specific fixes
      for (const fixup of packageDistFixups) {
        const pkgPath = path.join(nodeModulesInPublic, fixup.name);
        try {
          await fs.access(pkgPath);
          await fixup.createDist(pkgPath);
        } catch (e) {
          console.log(`Package ${fixup.name} not accessible, skipping dist creation`);
        }
      }
      
    } catch (e) {
      console.log('Skipping dependency structure creation - directories not found or error:', e instanceof Error ? e.message : String(e));
    }

    console.log('Using Python HTTP server - node_modules now accessible via public/node_modules/');

    return tempDir;
  } catch (error) {
    logError(error, `Plugin app extraction for ${appId}`);
    return null;
  }
}

// Helper function to check if a port is available
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  const maxAttempts = 50;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    // Check if port is tracked in our app cache
    if (appCache.has(`port_${port}`)) {
      port++;
      attempts++;
      continue;
    }
    
    // Check if port is actually available on the system
    if (await isPortAvailable(port)) {
      return port;
    }
    
    port++;
    attempts++;
  }
  
  throw new Error(`Could not find available port after ${maxAttempts} attempts`);
}

async function startApp(appId: string, appDir: string): Promise<number | null> {
  try {
    console.log(`Starting app ${appId}, finding available port from ${nextPort}`);
    
    // Find an actually available port
    let port: number;
    try {
      port = await findAvailablePort(nextPort);
      nextPort = port + 1; // Update next port for future requests
      console.log(`Found available port ${port} for app ${appId}`);
    } catch (error) {
      console.error(`Failed to find available port: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
    
    // Smart serving logic - serve from public when node_modules exists (accessible via ../node_modules/)
    let serveDir = '.';
    
    try {
      await fs.access(path.join(appDir, 'node_modules'));
      // If node_modules exists in root, serve from public with node_modules accessible via ../node_modules/
      try {
        await fs.access(path.join(appDir, 'public'));
        serveDir = 'public';
        console.log(`Found node_modules in root and public directory, serving from public with node_modules accessible via ../node_modules/`);
      } catch (e) {
        serveDir = '.';
        console.log(`Found node_modules in root but no public directory, serving from root`);
      }
    } catch (e) {
      // If no node_modules in root, check for public directory
      try {
        await fs.access(path.join(appDir, 'public'));
        serveDir = 'public';
        console.log(`No node_modules in root, found public directory, serving from: ${serveDir}`);
      } catch (e2) {
        console.log(`No node_modules or public directory found, serving from root: ${serveDir}`);
      }
    }
    
    // Use Python HTTP server which doesn't block node_modules access
    // Python server is simpler and doesn't have serve's security restrictions
    const startCommand = ['python3', '-m', 'http.server', port.toString(), '--directory', serveDir];

    // Attempt to start the server with retry logic
    let appProcess;
    let serverStarted = false;
    const maxRetries = 3;
    
    for (let retry = 0; retry < maxRetries && !serverStarted; retry++) {
      if (retry > 0) {
        // If retrying, find a new port
        try {
          port = await findAvailablePort(port + 1);
          startCommand[2] = port.toString(); // Update port in command
          console.log(`Retry ${retry}: Using new port ${port} for app ${appId}`);
        } catch (error) {
          console.error(`Retry ${retry}: Failed to find new port: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }
      }
      
      if (!startCommand[0]) throw new Error('No command to execute');
      appProcess = spawn(startCommand[0], startCommand.slice(1), {
        cwd: appDir,
        stdio: 'pipe',
        env: { 
          ...process.env, 
          PORT: port.toString(),
          NODE_ENV: 'production'
        }
      });
      
      // Wait a moment to see if the process starts successfully
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (appProcess && !appProcess.killed) {
        serverStarted = true;
        console.log(`Successfully started server on port ${port} (attempt ${retry + 1})`);
      } else {
        console.log(`Failed to start server on port ${port} (attempt ${retry + 1})`);
      }
    }
    
    if (!serverStarted || !appProcess) {
      console.error(`Failed to start app ${appId} after ${maxRetries} attempts`);
      return null;
    }

    let processOutput = '';
    let processErrors = '';

    // Capture process output for debugging
    appProcess.stdout?.on('data', (data) => {
      processOutput += data.toString();
      console.log(`[${appId}] stdout:`, data.toString().trim());
    });

    appProcess.stderr?.on('data', (data) => {
      processErrors += data.toString();
      console.log(`[${appId}] stderr:`, data.toString().trim());
    });

    appProcess.on('error', (error) => {
      console.error(`[${appId}] Process error:`, error);
    });

    appProcess.on('close', (code) => {
      console.log(`[${appId}] Process closed with code:`, code);
      // Remove from cache if process dies
      appCache.delete(appId);
      appCache.delete(`port_${port}`);
    });

    // Cache the running app
    appCache.set(appId, {
      path: appDir,
      port,
      process: appProcess,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      installed: true,
      accessCount: 0
    });

    // Reserve the port by storing placeholder entry
    appCache.set(`port_${port}`, {
      path: '',
      port,
      process: null,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      installed: false,
      accessCount: 0
    });

    // Activity-based cleanup - check periodically for inactive apps
    setTimeout(() => {
      const cachedApp = appCache.get(appId);
      if (cachedApp && cachedApp.process) {
        const timeSinceLastAccess = Date.now() - cachedApp.lastAccess;
        const timeSinceCreation = Date.now() - cachedApp.timestamp;
        
        // Kill if no activity for ACTIVITY_THRESHOLD OR if past CACHE_TTL regardless
        if (timeSinceLastAccess > ACTIVITY_THRESHOLD || timeSinceCreation > CACHE_TTL) {
          console.log(`Cleaning up app ${appId} after ${timeSinceLastAccess}ms inactivity (${cachedApp.accessCount} total accesses)`);
          try {
            cachedApp.process.kill('SIGTERM');
            // Force kill if still running after 5 seconds
            setTimeout(() => {
              if (cachedApp.process && !cachedApp.process.killed) {
                console.log(`Force killing app ${appId}`);
                cachedApp.process.kill('SIGKILL');
              }
            }, 5000);
          } catch (e) {
            console.error(`Error killing process for ${appId}:`, e);
          }
          
          appCache.delete(appId);
          appCache.delete(`port_${port}`);
          
          // Clean up temp directory
          fs.rm(appDir, { recursive: true, force: true })
            .then(() => console.log(`Cleaned up temp directory for ${appId}`))
            .catch(e => console.error(`Error cleaning up temp directory for ${appId}:`, e));
        } else {
          // App is still active, check again later
          console.log(`App ${appId} still active (last access ${timeSinceLastAccess}ms ago), keeping alive`);
          setTimeout(() => {
            // Recursive check
            const args = arguments;
            setTimeout(args.callee, ACTIVITY_THRESHOLD);
          }, ACTIVITY_THRESHOLD);
        }
      }
    }, CACHE_TTL);

    console.log(`App ${appId} started successfully on port ${port}`);
    return port;
  } catch (error) {
    logError(error, `Plugin app startup for ${appId}`);
    return null;
  }
}