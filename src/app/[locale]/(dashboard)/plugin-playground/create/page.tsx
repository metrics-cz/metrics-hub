'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Code, 
  Download, 
  Folder, 
  Package,
  Play
} from 'lucide-react';

interface PluginConfig {
  name: string;
  id: string;
  description: string;
  author: string;
  template: string;
  directory: string;
  category: string;
  permissions: string[];
}

const TEMPLATES = [
  {
    id: 'google-ads',
    name: 'Google Ads Analytics',
    description: 'Display Google Ads campaign data with interactive tables and charts',
    category: 'advertising',
    features: ['Google Ads API Integration', 'DataTables for data display', 'Responsive Bootstrap UI', 'Error handling'],
    permissions: ['google-ads'],
    complexity: 'intermediate',
    preview: '/api/plugin-playground/templates/google-ads/preview.png'
  },
  {
    id: 'dashboard',
    name: 'Custom Dashboard',
    description: 'Create beautiful dashboards with metrics cards and interactive charts',
    category: 'dashboard',
    features: ['Chart.js visualizations', 'Metric cards', 'Real-time updates', 'Customizable layout'],
    permissions: [],
    complexity: 'beginner',
    preview: '/api/plugin-playground/templates/dashboard/preview.png'
  },
  {
    id: 'basic',
    name: 'Basic Template',
    description: 'Minimal starter template with essential MetricsHub integration',
    category: 'utility',
    features: ['MetricsHub integration', 'Bootstrap UI', 'Basic structure', 'OAuth token handling'],
    permissions: [],
    complexity: 'beginner',
    preview: '/api/plugin-playground/templates/basic/preview.png'
  },
  {
    id: 'analytics',
    name: 'Analytics Report',
    description: 'Advanced analytics with multiple data sources and export capabilities',
    category: 'analytics',
    features: ['Multiple API integration', 'Data visualization', 'Export to PDF/Excel', 'Caching system'],
    permissions: ['google-analytics', 'google-ads'],
    complexity: 'advanced',
    preview: '/api/plugin-playground/templates/analytics/preview.png'
  }
];

const CATEGORIES = [
  { id: 'advertising', name: 'Advertising', icon: '📊' },
  { id: 'analytics', name: 'Analytics', icon: '📈' },
  { id: 'dashboard', name: 'Dashboard', icon: '🎛️' },
  { id: 'utility', name: 'Utility', icon: '🔧' },
  { id: 'social', name: 'Social Media', icon: '📱' },
  { id: 'ecommerce', name: 'E-commerce', icon: '🛒' }
];

const PERMISSIONS = [
  { id: 'google-ads', name: 'Google Ads API', description: 'Access Google Ads campaign data' },
  { id: 'google-analytics', name: 'Google Analytics', description: 'Access analytics data' },
  { id: 'google-drive', name: 'Google Drive', description: 'Access files and documents' },
  { id: 'gmail', name: 'Gmail API', description: 'Access email data' },
];

export default function CreatePluginPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [config, setConfig] = useState<PluginConfig>({
    name: '',
    id: '',
    description: '',
    author: '',
    template: '',
    directory: '',
    category: 'utility',
    permissions: []
  });

  const selectedTemplate = TEMPLATES.find(t => t.id === config.template);

  const generateId = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  const updateConfig = (updates: Partial<PluginConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      
      // Auto-generate ID from name
      if (updates.name !== undefined) {
        newConfig.id = generateId(updates.name);
        newConfig.directory = `./${generateId(updates.name)}`;
      }
      
      return newConfig;
    });
  };

  const createPlugin = async () => {
    setCreating(true);
    
    try {
      // Call the plugin generator API
      const response = await fetch('/api/plugin-playground/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Redirect to playground with the new plugin
        router.push(`/plugin-playground?dir=${encodeURIComponent(result.path)}`);
      } else {
        const error = await response.json();
        alert(`Failed to create plugin: ${error.message}`);
      }
    } catch (error) {
      alert(`Failed to create plugin: ${error}`);
    } finally {
      setCreating(false);
    }
  };

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < step) return 'completed';
    if (stepNumber === step) return 'current';
    return 'upcoming';
  };

  const canProceed = () => {
    switch (step) {
      case 1: return config.template !== '';
      case 2: return config.name.trim() !== '' && config.description.trim() !== '';
      case 3: return config.directory.trim() !== '';
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-semibold">Create New Plugin</h1>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((stepNum) => (
                <div key={stepNum} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    getStepStatus(stepNum) === 'completed' 
                      ? 'bg-green-600 text-white' 
                      : getStepStatus(stepNum) === 'current'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {getStepStatus(stepNum) === 'completed' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  {stepNum < 4 && (
                    <div className={`w-8 h-0.5 ${
                      getStepStatus(stepNum) === 'completed' ? 'bg-green-600' : 'bg-gray-600'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Step 1: Template Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Choose a Template</h2>
              <p className="text-gray-400">Select a starting point for your plugin</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`relative p-6 bg-gray-800 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-750 ${
                    config.template === template.id 
                      ? 'border-blue-500 bg-blue-900/10' 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => updateConfig({ template: template.id, category: template.category })}
                >
                  {config.template === template.id && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle className="w-6 h-6 text-blue-400" />
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold">{template.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        template.complexity === 'beginner' 
                          ? 'bg-green-900/20 text-green-400'
                          : template.complexity === 'intermediate'
                          ? 'bg-yellow-900/20 text-yellow-400'
                          : 'bg-red-900/20 text-red-400'
                      }`}>
                        {template.complexity}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{template.description}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Features</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.features.map((feature, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {template.permissions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Required Permissions</h4>
                        <div className="flex flex-wrap gap-1">
                          {template.permissions.map((perm, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-blue-900/20 text-blue-400 rounded">
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Plugin Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Plugin Details</h2>
              <p className="text-gray-400">Configure your plugin's basic information</p>
            </div>

            {selectedTemplate && (
              <div className="p-4 bg-blue-900/10 border border-blue-500/30 rounded-lg mb-6">
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="font-medium">Template: {selectedTemplate.name}</h3>
                    <p className="text-sm text-gray-400">{selectedTemplate.description}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Plugin Name *</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => updateConfig({ name: e.target.value })}
                  placeholder="My Awesome Plugin"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Plugin ID</label>
                <input
                  type="text"
                  value={config.id}
                  onChange={(e) => updateConfig({ id: e.target.value })}
                  placeholder="my-awesome-plugin"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Used for package.json name and directory</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  value={config.description}
                  onChange={(e) => updateConfig({ description: e.target.value })}
                  placeholder="A brief description of what your plugin does"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Author</label>
                <input
                  type="text"
                  value={config.author}
                  onChange={(e) => updateConfig({ author: e.target.value })}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => updateConfig({ category: category.id })}
                      className={`p-3 text-left rounded-lg border transition-all ${
                        config.category === category.id
                          ? 'border-blue-500 bg-blue-900/10'
                          : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-2xl mb-1">{category.icon}</div>
                      <div className="text-sm font-medium">{category.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Configuration */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Configuration</h2>
              <p className="text-gray-400">Set up directories and permissions</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Output Directory *</label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-gray-800 border border-r-0 border-gray-600 rounded-l-lg">
                    <Folder className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={config.directory}
                    onChange={(e) => updateConfig({ directory: e.target.value })}
                    placeholder="./my-plugin"
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-r-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Where to create the plugin directory</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">API Permissions</label>
                <div className="space-y-2">
                  {PERMISSIONS.map((permission) => (
                    <label key={permission.id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.permissions.includes(permission.id)}
                        onChange={(e) => {
                          const perms = e.target.checked
                            ? [...config.permissions, permission.id]
                            : config.permissions.filter(p => p !== permission.id);
                          updateConfig({ permissions: perms });
                        }}
                        className="mt-0.5 rounded"
                      />
                      <div>
                        <div className="font-medium">{permission.name}</div>
                        <div className="text-sm text-gray-400">{permission.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Create */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Review & Create</h2>
              <p className="text-gray-400">Review your plugin configuration before creating</p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Plugin Name</label>
                    <p className="font-medium">{config.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Template</label>
                    <p className="font-medium">{selectedTemplate?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Category</label>
                    <p className="font-medium">{CATEGORIES.find(c => c.id === config.category)?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Directory</label>
                    <p className="font-medium">{config.directory}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Description</label>
                  <p className="font-medium">{config.description}</p>
                </div>

                {config.permissions.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-400">Permissions</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.permissions.map(perm => (
                        <span key={perm} className="px-2 py-1 text-xs bg-blue-900/20 text-blue-400 rounded">
                          {PERMISSIONS.find(p => p.id === perm)?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 p-4 bg-green-900/10 border border-green-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-400 mb-1">Ready to Create</h3>
                    <p className="text-sm text-gray-300">
                      Your plugin will be created with all the necessary files and structure. 
                      You can start developing immediately in the playground.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-8 border-t border-gray-700 mt-8">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex gap-3">
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={createPlugin}
                disabled={creating}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Create Plugin
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}