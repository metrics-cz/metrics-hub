'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Play, 
  Square, 
  RefreshCw, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  Monitor,
  Code,
  Settings,
  Eye,
  Package,
  Terminal,
  FileText,
  Activity,
  Network,
  Target,
  TestTube,
  Zap,
  Clock,
  MemoryStick,
  Gauge
} from 'lucide-react';

interface ValidationResult {
  valid: boolean;
  issues: string[];
  suggestions: string[];
  files: Record<string, boolean>;
  structure: {
    hasPublicDir: boolean;
    hasIndexHtml: boolean;
    hasScript: boolean;
    hasStyles: boolean;
    hasPackageJson: boolean;
  };
  zipPreview: string[];
}

interface DependencyStatus {
  name: string;
  found: boolean;
  path?: string;
  size?: number;
  version?: string;
}

interface PerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  renderTime: number;
  apiCalls: Array<{
    url: string;
    method: string;
    duration: number;
    status: number;
    timestamp: number;
  }>;
  domNodes: number;
  jsErrors: number;
}

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: number;
  headers: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  size: number;
}

interface StateChange {
  timestamp: number;
  type: string;
  data: any;
  source: string;
}

interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'running';
  duration?: number;
  error?: string;
  timestamp: number;
}

export default function PluginPlaygroundPage() {
  const searchParams = useSearchParams();
  const [pluginDir, setPluginDir] = useState(searchParams.get('dir') || '');
  const [isRunning, setIsRunning] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [dependencies, setDependencies] = useState<DependencyStatus[]>([]);
  const [logs, setLogs] = useState<Array<{ timestamp: number; level: string; message: string; source?: string }>>([]);
  const [activeTab, setActiveTab] = useState<'preview' | 'logs' | 'validation' | 'dependencies' | 'performance' | 'network' | 'state' | 'tests'>('preview');
  const [autoValidate, setAutoValidate] = useState(true);
  const [performance, setPerformance] = useState<PerformanceMetrics>({
    loadTime: 0,
    memoryUsage: 0,
    renderTime: 0,
    apiCalls: [],
    domNodes: 0,
    jsErrors: 0
  });
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [stateChanges, setStateChanges] = useState<StateChange[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadedPlugin, setIsUploadedPlugin] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<{
    uploadId: string;
    extractedPath: string;
    files: string[];
  } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.pluginDir !== pluginDir) return;

      switch (event.data.type) {
        case 'PLUGIN_PLAYGROUND_LOG':
          const { method, args, timestamp, source } = event.data;
          setLogs(prev => [...prev, {
            timestamp,
            level: method,
            message: args.join(' '),
            source: source || 'plugin'
          }]);
          break;

        case 'PLUGIN_PERFORMANCE_METRICS':
          setPerformance(prev => ({
            ...prev,
            ...event.data.metrics
          }));
          break;

        case 'PLUGIN_NETWORK_REQUEST':
          const networkRequest: NetworkRequest = {
            id: Math.random().toString(36),
            ...event.data.request,
            timestamp: Date.now()
          };
          setNetworkRequests(prev => [...prev, networkRequest].slice(-100)); // Keep last 100
          break;

        case 'PLUGIN_STATE_CHANGE':
          const stateChange: StateChange = {
            timestamp: Date.now(),
            ...event.data.stateChange
          };
          setStateChanges(prev => [...prev, stateChange].slice(-50)); // Keep last 50
          break;

        case 'PLUGIN_TEST_RESULT':
          const testResult: TestResult = {
            id: Math.random().toString(36),
            ...event.data.testResult,
            timestamp: Date.now()
          };
          setTestResults(prev => {
            const existing = prev.find(t => t.name === testResult.name);
            if (existing) {
              return prev.map(t => t.name === testResult.name ? testResult : t);
            }
            return [...prev, testResult];
          });
          break;

        case 'PLUGIN_ERROR':
          setLogs(prev => [...prev, {
            timestamp: Date.now(),
            level: 'error',
            message: `Plugin Error: ${event.data.error}`,
            source: 'plugin-error'
          }]);
          setPerformance(prev => ({
            ...prev,
            jsErrors: prev.jsErrors + 1
          }));
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pluginDir]);

  // Auto-validate when directory changes
  useEffect(() => {
    if (pluginDir && autoValidate) {
      validatePlugin();
    }
  }, [pluginDir, autoValidate]);

  // Validate plugin structure
  const validatePlugin = async () => {
    if (!pluginDir) return;

    try {
      // Both uploaded ZIPs and local directories use the same validation API
      addLog('info', `Validating plugin at: ${pluginDir}`, 'playground');
      const response = await fetch(
        `/api/plugin-playground/validate?dir=${encodeURIComponent(pluginDir)}`
      );
      const result = await response.json();
      setValidation(result);
      
      // Also load dependencies
      loadDependencies();
      
      addLog('info', `Validation complete: ${result.valid ? 'VALID' : 'INVALID'}`, 'playground');
      
      if (result.issues.length > 0) {
        result.issues.forEach((issue: string) => {
          addLog('warn', `Issue: ${issue}`, 'validation');
        });
      }
    } catch (error) {
      addLog('error', `Validation failed: ${error}`, 'playground');
      setValidation({
        valid: false,
        issues: [`Validation request failed: ${error}`],
        suggestions: [],
        files: {},
        structure: {
          hasPublicDir: false,
          hasIndexHtml: false,
          hasScript: false,
          hasStyles: false,
          hasPackageJson: false
        },
        zipPreview: []
      });
    }
  };

  // Load dependency information
  const loadDependencies = async () => {
    if (isUploadedPlugin) {
      // For uploaded ZIPs, show placeholder dependencies from your Central Overview plugin
      setDependencies([
        { name: 'jquery', found: true, version: '3.7.1', size: 89542 },
        { name: 'bootstrap', found: true, version: '4.6.2', size: 234567 },
        { name: 'datatables.net', found: false }
      ]);
      addLog('info', 'Showing placeholder dependencies for uploaded ZIP', 'dependencies');
    } else {
      // For local directories, we would call the dependencies API
      // This would be implemented to check package.json dependencies
      // and verify they're available in node_modules
      setDependencies([
        { name: 'jquery', found: true, version: '3.7.1', size: 89542 },
        { name: 'bootstrap', found: true, version: '4.6.2', size: 234567 },
        { name: 'datatables.net', found: false }
      ]);
    }
  };

  // Add log message
  const addLog = (level: string, message: string, source: string = 'playground') => {
    setLogs(prev => [...prev, {
      timestamp: Date.now(),
      level,
      message,
      source
    }]);
  };

  // Start performance monitoring
  const startPerformanceMonitoring = () => {
    setIsMonitoring(true);
    setPerformance({
      loadTime: 0,
      memoryUsage: 0,
      renderTime: 0,
      apiCalls: [],
      domNodes: 0,
      jsErrors: 0
    });
    setNetworkRequests([]);
    setStateChanges([]);
    addLog('info', 'Performance monitoring started', 'performance');
  };

  // Stop performance monitoring
  const stopPerformanceMonitoring = () => {
    setIsMonitoring(false);
    addLog('info', 'Performance monitoring stopped', 'performance');
  };

  // Clear monitoring data
  const clearMonitoringData = () => {
    setNetworkRequests([]);
    setStateChanges([]);
    setTestResults([]);
    setPerformance({
      loadTime: 0,
      memoryUsage: 0,
      renderTime: 0,
      apiCalls: [],
      domNodes: 0,
      jsErrors: 0
    });
    addLog('info', 'Monitoring data cleared', 'performance');
  };

  // Run tests
  const runTests = async () => {
    addLog('info', 'Starting test execution...', 'tests');
    setTestResults(prev => prev.map(test => ({ ...test, status: 'running' as const })));

    // Mock test execution - in real implementation this would trigger tests in the iframe
    const testSuites = [
      { name: 'Plugin Loading', duration: 150 },
      { name: 'API Integration', duration: 300 },
      { name: 'UI Responsiveness', duration: 200 },
      { name: 'Error Handling', duration: 100 }
    ];

    for (const test of testSuites) {
      await new Promise(resolve => setTimeout(resolve, test.duration));
      const passed = Math.random() > 0.3; // 70% pass rate for demo
      
      setTestResults(prev => {
        const existing = prev.find(t => t.name === test.name);
        const newTest: TestResult = {
          id: Math.random().toString(36),
          name: test.name,
          status: passed ? 'passed' : 'failed',
          duration: test.duration,
          error: passed ? undefined : 'Test assertion failed',
          timestamp: Date.now()
        };
        
        if (existing) {
          return prev.map(t => t.name === test.name ? newTest : t);
        }
        return [...prev, newTest];
      });
      
      addLog(passed ? 'info' : 'error', `Test "${test.name}": ${passed ? 'PASSED' : 'FAILED'}`, 'tests');
    }
    
    addLog('info', 'Test execution completed', 'tests');
  };

  // Handle ZIP file upload
  const handleZipUpload = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      addLog('error', 'Please select a .zip file', 'playground');
      return;
    }

    setIsUploading(true);
    setUploadedFile(file);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      addLog('info', `Uploading ${file.name} (${(file.size / 1024).toFixed(1)}KB)...`, 'playground');

      const response = await fetch('/api/plugin-playground/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.details || errorData.error || response.statusText;
        addLog('error', `Upload failed (${response.status}): ${errorMessage}`, 'playground');
        throw new Error(`Upload failed: ${errorMessage}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Set the plugin directory to the extracted location
        setPluginDir(result.extractedPath);
        setIsUploadedPlugin(true);
        setUploadInfo({
          uploadId: result.uploadId,
          extractedPath: result.extractedPath,
          files: result.files
        });
        
        if (result.placeholder) {
          addLog('info', `ZIP uploaded: ${result.message}`, 'playground');
          addLog('warn', 'ZIP extraction feature coming soon! Validation shows placeholder data.', 'playground');
        } else {
          addLog('info', `ZIP uploaded and extracted to: ${result.extractedPath}`, 'playground');
        }
        
        // Auto-validate the uploaded plugin (will use upload-aware validation)
        if (autoValidate) {
          setTimeout(() => validatePlugin(), 500);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      addLog('error', `Upload failed: ${error}`, 'playground');
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Start playground
  const startPlayground = () => {
    if (!pluginDir) {
      addLog('error', 'Please upload a plugin ZIP file or specify a plugin directory', 'playground');
      return;
    }

    if (!validation?.valid) {
      addLog('warn', 'Starting playground with validation issues', 'playground');
    }

    setIsRunning(true);
    startPerformanceMonitoring();
    
    if (isUploadedPlugin) {
      addLog('info', `Starting playground for uploaded plugin: ${uploadedFile?.name}`, 'playground');
      addLog('info', `Using extracted content from: ${pluginDir}`, 'playground');
    } else {
      addLog('info', `Starting playground for: ${pluginDir}`, 'playground');
    }
    
    // Reload iframe
    if (iframeRef.current) {
      // Both uploaded ZIPs and local directories use the same serving mechanism
      addLog('info', `Loading plugin from: ${pluginDir}`, 'playground');
      const url = `/api/plugin-playground/index.html?dir=${encodeURIComponent(pluginDir)}`;
      iframeRef.current.src = url;
      addLog('info', 'Loading from URL: ' + url, 'playground');
    }
  };

  // Stop playground
  const stopPlayground = () => {
    setIsRunning(false);
    stopPerformanceMonitoring();
    addLog('info', 'Playground stopped', 'playground');
    
    if (iframeRef.current) {
      iframeRef.current.src = 'about:blank';
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs cleared', 'playground');
  };

  // Reset upload state
  const resetUploadState = () => {
    setUploadedFile(null);
    setIsUploadedPlugin(false);
    setUploadInfo(null);
    setPluginDir('');
    setValidation(null);
    addLog('info', 'Upload state reset - ready for new plugin', 'playground');
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get log color class
  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-semibold">Plugin Playground</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-white ${
                isUploading 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}>
                {isUploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Package className="w-4 h-4" />
                )}
                {isUploading ? 'Uploading...' : 'Upload Plugin ZIP'}
                <input
                  type="file"
                  accept=".zip"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleZipUpload(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
              
              {pluginDir && (
                <button
                  onClick={validatePlugin}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Validate Plugin"
                >
                  <FileCheck className="w-4 h-4" />
                </button>
              )}
              
              {uploadedFile && (
                <button
                  onClick={resetUploadState}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  title="Reset and upload new plugin"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="text-sm text-gray-400">
              {uploadedFile ? (
                <span className="text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {uploadedFile.name} uploaded successfully
                </span>
              ) : (
                <span>
                  Upload a .zip file containing your plugin with public/ directory structure
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoValidate}
              onChange={(e) => setAutoValidate(e.target.checked)}
              className="rounded"
            />
            Auto-validate
          </label>
          
          {isRunning ? (
            <button
              onClick={stopPlayground}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={startPlayground}
              disabled={!pluginDir}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm transition-colors"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Main Preview Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'preview'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Logs ({logs.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('validation')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'validation'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Validation
                {validation && (
                  <span className={`w-2 h-2 rounded-full ${validation.valid ? 'bg-green-500' : 'bg-red-500'}`} />
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('dependencies')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'dependencies'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Dependencies
              </div>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Performance
                {isMonitoring && (
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'network'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                Network ({networkRequests.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('state')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'state'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                State ({stateChanges.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tests'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                Tests ({testResults.length})
                {testResults.some(t => t.status === 'running') && (
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                )}
              </div>
            </button>
          </div>

          <div className="flex-1">
            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div className="h-full">
                {isRunning ? (
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full border-none"
                    title="Plugin Preview"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-downloads allow-storage-access-by-user-activation"
                    onLoad={() => {
                      addLog('info', 'Preview iframe loaded successfully', 'playground');
                    }}
                    onError={(e) => {
                      addLog('error', 'Preview iframe failed to load', 'playground');
                      console.error('Iframe error:', e);
                    }}
                    style={{ backgroundColor: '#1f2937' }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                      <h3 className="text-lg font-medium mb-2">Plugin Preview</h3>
                      <p>Click "Start" to preview your plugin</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div className="h-full flex flex-col">
                <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                  <h3 className="font-medium">Console Logs</h3>
                  <button
                    onClick={clearLogs}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Clear Logs
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-black font-mono text-sm">
                  {logs.map((log, index) => (
                    <div key={index} className="flex gap-3 mb-1">
                      <span className="text-gray-500 text-xs shrink-0 w-20">
                        {formatTime(log.timestamp)}
                      </span>
                      <span className={`text-xs shrink-0 w-12 ${getLogColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0 w-16">
                        [{log.source}]
                      </span>
                      <span className="text-gray-200 break-all">
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}

            {/* Validation Tab */}
            {activeTab === 'validation' && (
              <div className="h-full overflow-auto p-4">
                {validation ? (
                  <div className="space-y-4">
                    {/* Overall Status */}
                    <div className={`p-4 rounded-lg border ${
                      validation.valid 
                        ? 'bg-green-900/20 border-green-500/30' 
                        : 'bg-red-900/20 border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(validation.valid)}
                        <h3 className="font-semibold">
                          {validation.valid ? 'Plugin Valid' : 'Validation Issues Found'}
                        </h3>
                      </div>
                    </div>

                    {/* Structure Check */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-300">File Structure</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          {getStatusIcon(validation.structure.hasPublicDir)}
                          <span>public/ directory</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {getStatusIcon(validation.structure.hasIndexHtml)}
                          <span>index.html</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {getStatusIcon(validation.structure.hasScript)}
                          <span>script.js</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {getStatusIcon(validation.structure.hasStyles)}
                          <span>styles.css</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {getStatusIcon(validation.structure.hasPackageJson)}
                          <span>package.json</span>
                        </div>
                      </div>
                    </div>

                    {/* Issues */}
                    {validation.issues.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-red-400">Issues</h4>
                        <ul className="space-y-1">
                          {validation.issues.map((issue, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggestions */}
                    {validation.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-blue-400">Suggestions</h4>
                        <ul className="space-y-1">
                          {validation.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* File List */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-300">ZIP Preview</h4>
                      <div className="bg-gray-800 rounded-lg p-3 font-mono text-sm">
                        {validation.zipPreview.map((file, index) => (
                          <div key={index} className="text-gray-300">
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <FileCheck className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                      <h3 className="text-lg font-medium mb-2">Validation Results</h3>
                      <p>Run validation to see plugin structure analysis</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dependencies Tab */}
            {activeTab === 'dependencies' && (
              <div className="h-full overflow-auto p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Package Dependencies</h3>
                    <button
                      onClick={loadDependencies}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {dependencies.map((dep, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(dep.found)}
                          <div>
                            <div className="font-medium">{dep.name}</div>
                            {dep.version && (
                              <div className="text-xs text-gray-400">v{dep.version}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-400">
                          {dep.size && (
                            <div>{(dep.size / 1024).toFixed(1)}KB</div>
                          )}
                          {dep.found ? (
                            <div className="text-green-400">Available</div>
                          ) : (
                            <div className="text-red-400">Missing</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && (
              <div className="h-full overflow-auto p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Performance Monitoring</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={clearMonitoringData}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        Clear Data
                      </button>
                      <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                        isMonitoring ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                        {isMonitoring ? 'Monitoring' : 'Stopped'}
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium">Load Time</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {performance.loadTime}ms
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MemoryStick className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">Memory</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {(performance.memoryUsage / 1024 / 1024).toFixed(1)}MB
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium">Render</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {performance.renderTime}ms
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium">JS Errors</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {performance.jsErrors}
                      </div>
                    </div>
                  </div>

                  {/* API Calls List */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-300">Recent API Calls</h4>
                    <div className="bg-gray-800 rounded-lg max-h-64 overflow-auto">
                      {performance.apiCalls.length > 0 ? (
                        performance.apiCalls.map((call, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border-b border-gray-700 last:border-b-0">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 text-xs rounded font-mono ${
                                call.status >= 200 && call.status < 300 ? 'bg-green-900/30 text-green-400' :
                                call.status >= 400 ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'
                              }`}>
                                {call.method}
                              </span>
                              <span className="text-sm font-mono text-gray-300 truncate max-w-xs">
                                {call.url}
                              </span>
                            </div>
                            <div className="text-right text-xs text-gray-400">
                              <div className={call.status >= 400 ? 'text-red-400' : 'text-green-400'}>
                                {call.status}
                              </div>
                              <div>{call.duration}ms</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <Gauge className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                          <p>No API calls tracked yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Network Tab */}
            {activeTab === 'network' && (
              <div className="h-full overflow-auto p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Network Inspector</h3>
                    <button
                      onClick={() => setNetworkRequests([])}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Clear Requests
                    </button>
                  </div>

                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    {networkRequests.length > 0 ? (
                      <div className="divide-y divide-gray-700">
                        {networkRequests.map((request) => (
                          <div key={request.id} className="p-4 hover:bg-gray-750">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 text-xs rounded font-mono ${
                                  request.status >= 200 && request.status < 300 ? 'bg-green-900/30 text-green-400' :
                                  request.status >= 400 ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'
                                }`}>
                                  {request.method}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded ${
                                  request.status >= 200 && request.status < 300 ? 'bg-green-900/20 text-green-300' :
                                  request.status >= 400 ? 'bg-red-900/20 text-red-300' : 'bg-yellow-900/20 text-yellow-300'
                                }`}>
                                  {request.status}
                                </span>
                                <span className="text-sm text-gray-400">
                                  {request.duration}ms
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(request.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="text-sm font-mono text-gray-300 mb-2">
                              {request.url}
                            </div>
                            {request.size > 0 && (
                              <div className="text-xs text-gray-400">
                                Response Size: {(request.size / 1024).toFixed(1)}KB
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <Network className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                        <p>No network requests captured yet</p>
                        <p className="text-xs mt-1">Start the plugin to begin monitoring</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* State Tab */}
            {activeTab === 'state' && (
              <div className="h-full overflow-auto p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Plugin State Tracking</h3>
                    <button
                      onClick={() => setStateChanges([])}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Clear State
                    </button>
                  </div>

                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    {stateChanges.length > 0 ? (
                      <div className="divide-y divide-gray-700">
                        {stateChanges.map((change, index) => (
                          <div key={index} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-blue-400" />
                                <span className="font-medium text-white">{change.type}</span>
                                <span className="text-xs text-gray-400 px-2 py-1 bg-gray-700 rounded">
                                  {change.source}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(change.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="bg-gray-900 rounded p-3 font-mono text-sm text-gray-300 overflow-x-auto">
                              <pre>{JSON.stringify(change.data, null, 2)}</pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <Target className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                        <p>No state changes tracked yet</p>
                        <p className="text-xs mt-1">Plugin state changes will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tests Tab */}
            {activeTab === 'tests' && (
              <div className="h-full overflow-auto p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Plugin Tests</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTestResults([])}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        Clear Results
                      </button>
                      <button
                        onClick={runTests}
                        disabled={testResults.some(t => t.status === 'running')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm transition-colors"
                      >
                        <TestTube className="w-4 h-4" />
                        Run Tests
                      </button>
                    </div>
                  </div>

                  {/* Test Results Summary */}
                  {testResults.length > 0 && (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                        <div className="text-green-400 text-sm font-medium">Passed</div>
                        <div className="text-2xl font-bold text-white">
                          {testResults.filter(t => t.status === 'passed').length}
                        </div>
                      </div>
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                        <div className="text-red-400 text-sm font-medium">Failed</div>
                        <div className="text-2xl font-bold text-white">
                          {testResults.filter(t => t.status === 'failed').length}
                        </div>
                      </div>
                      <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                        <div className="text-yellow-400 text-sm font-medium">Running</div>
                        <div className="text-2xl font-bold text-white">
                          {testResults.filter(t => t.status === 'running').length}
                        </div>
                      </div>
                      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                        <div className="text-gray-400 text-sm font-medium">Total</div>
                        <div className="text-2xl font-bold text-white">
                          {testResults.length}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test Results List */}
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    {testResults.length > 0 ? (
                      <div className="divide-y divide-gray-700">
                        {testResults.map((test) => (
                          <div key={test.id} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                {test.status === 'passed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                {test.status === 'failed' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                                {test.status === 'running' && <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />}
                                {test.status === 'pending' && <Clock className="w-5 h-5 text-gray-500" />}
                                <span className="font-medium text-white">{test.name}</span>
                              </div>
                              <div className="text-right text-sm">
                                {test.duration && (
                                  <div className="text-gray-400">{test.duration}ms</div>
                                )}
                                <div className="text-xs text-gray-500">
                                  {new Date(test.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                            {test.error && (
                              <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mt-2">
                                <div className="text-red-400 text-sm font-mono">
                                  {test.error}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <TestTube className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                        <p>No tests have been run yet</p>
                        <p className="text-xs mt-1">Click "Run Tests" to execute plugin tests</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}