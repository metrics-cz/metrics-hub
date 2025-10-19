'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Monitor, 
  FileCheck, 
  Package, 
  Play, 
  Settings,
  ExternalLink,
  Folder,
  Code,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download
} from 'lucide-react';

interface RecentProject {
  path: string;
  name: string;
  lastOpened: number;
  valid: boolean;
  template: string;
}

interface PluginTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

const TEMPLATES: PluginTemplate[] = [
  {
    id: 'google-ads',
    name: 'Google Ads Analytics',
    description: 'Display Google Ads campaign data with interactive tables',
    category: 'advertising',
    features: ['Google Ads API', 'DataTables', 'Responsive Design', 'Error Handling'],
    complexity: 'intermediate'
  },
  {
    id: 'dashboard',
    name: 'Custom Dashboard',
    description: 'Create customizable dashboards with charts and metrics',
    category: 'dashboard',
    features: ['Chart.js', 'Bootstrap Cards', 'Real-time Updates', 'Responsive'],
    complexity: 'beginner'
  },
  {
    id: 'basic',
    name: 'Basic Template',
    description: 'Minimal template to get started quickly',
    category: 'utility',
    features: ['jQuery', 'Bootstrap', 'MetricsHub Integration'],
    complexity: 'beginner'
  },
  {
    id: 'analytics',
    name: 'Analytics Report',
    description: 'Advanced analytics reporting with multiple data sources',
    category: 'analytics',
    features: ['Multiple APIs', 'Data Visualization', 'Export Functions', 'Caching'],
    complexity: 'advanced'
  }
];

export default function PluginDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PluginTemplate | null>(null);

  useEffect(() => {
    // Load recent projects from localStorage
    const saved = localStorage.getItem('plugin-playground-recent');
    if (saved) {
      try {
        setRecentProjects(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading recent projects:', e);
      }
    }
  }, []);

  const openPlayground = (pluginPath?: string) => {
    const url = pluginPath 
      ? `/plugin-playground?dir=${encodeURIComponent(pluginPath)}`
      : '/plugin-playground';
    router.push(url);
  };

  const createNewPlugin = () => {
    router.push('/plugin-playground/create');
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'text-green-400 bg-green-900/20';
      case 'intermediate': return 'text-yellow-400 bg-yellow-900/20';
      case 'advanced': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const formatLastOpened = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Monitor className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Plugin Playground</h1>
                <p className="text-gray-400">Develop and test MetricsHub plugins with ease</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/docs/plugin-development')}
                className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Documentation
              </button>
              
              <button
                onClick={createNewPlugin}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Plugin
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={createNewPlugin}
                className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <Plus className="w-8 h-8 text-blue-100" />
                  <div className="w-3 h-3 bg-blue-300 rounded-full opacity-75 group-hover:opacity-100"></div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Create New Plugin</h3>
                <p className="text-blue-100 text-sm">Start with a template and build your custom plugin</p>
              </button>

              <button
                onClick={() => openPlayground()}
                className="p-6 bg-gradient-to-br from-green-600 to-green-700 rounded-xl hover:from-green-500 hover:to-green-600 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <Play className="w-8 h-8 text-green-100" />
                  <div className="w-3 h-3 bg-green-300 rounded-full opacity-75 group-hover:opacity-100"></div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Open Playground</h3>
                <p className="text-green-100 text-sm">Test and develop plugins in live environment</p>
              </button>
            </div>

            {/* Recent Projects */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Recent Projects</h2>
                <button className="text-blue-400 hover:text-blue-300 text-sm">
                  Clear All
                </button>
              </div>

              {recentProjects.length > 0 ? (
                <div className="space-y-3">
                  {recentProjects.slice(0, 5).map((project, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors group cursor-pointer"
                      onClick={() => openPlayground(project.path)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-700 rounded-lg group-hover:bg-gray-600 transition-colors">
                          <Folder className="w-5 h-5 text-gray-300" />
                        </div>
                        <div>
                          <h3 className="font-medium">{project.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span>{project.path}</span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatLastOpened(project.lastOpened)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          project.valid ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'
                        }`}>
                          {project.valid ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {project.valid ? 'Valid' : 'Issues'}
                        </div>
                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-700 rounded">
                          {project.template}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600">
                  <Folder className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No recent projects</h3>
                  <p className="text-gray-500 mb-4">Create your first plugin to get started</p>
                  <button
                    onClick={createNewPlugin}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Plugin
                  </button>
                </div>
              )}
            </div>

            {/* Plugin Templates */}
            <div>
              <h2 className="text-2xl font-semibold mb-6">Plugin Templates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEMPLATES.map((template) => (
                  <div key={template.id} className="p-6 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{template.name}</h3>
                        <p className="text-gray-400 text-sm mb-3">{template.description}</p>
                        
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getComplexityColor(template.complexity)}`}>
                          {template.complexity}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Features</h4>
                        <div className="flex flex-wrap gap-1">
                          {template.features.map((feature, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setSelectedTemplate(template)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Use Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Getting Started */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <h3 className="font-semibold">Getting Started</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-medium shrink-0">1</div>
                  <div>
                    <p className="font-medium">Choose a template</p>
                    <p className="text-gray-400 text-xs">Select from pre-built templates or start from scratch</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-medium shrink-0">2</div>
                  <div>
                    <p className="font-medium">Develop & Test</p>
                    <p className="text-gray-400 text-xs">Use the playground for real-time development</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-medium shrink-0">3</div>
                  <div>
                    <p className="font-medium">Deploy</p>
                    <p className="text-gray-400 text-xs">Package and upload to MetricsHub</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tools */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Quick Tools</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700 rounded-lg transition-colors">
                  <FileCheck className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Validate Plugin Structure</span>
                </button>
                
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700 rounded-lg transition-colors">
                  <Package className="w-4 h-4 text-green-400" />
                  <span className="text-sm">Check Dependencies</span>
                </button>
                
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700 rounded-lg transition-colors">
                  <Code className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">Generate Code</span>
                </button>
                
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700 rounded-lg transition-colors">
                  <Download className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">Package for Deploy</span>
                </button>
              </div>
            </div>

            {/* Resources */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Resources</h3>
              <div className="space-y-2 text-sm">
                <a href="#" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  Plugin Development Guide
                </a>
                <a href="#" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  API Reference
                </a>
                <a href="#" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  Example Plugins
                </a>
                <a href="#" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  Community Forum
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create {selectedTemplate.name}</h3>
            <p className="text-gray-400 mb-6">{selectedTemplate.description}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Plugin Name</label>
                <input
                  type="text"
                  placeholder={selectedTemplate.name}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Directory</label>
                <input
                  type="text"
                  placeholder="./my-plugin"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Create plugin logic here
                  setSelectedTemplate(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Create Plugin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}