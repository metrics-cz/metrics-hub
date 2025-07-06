'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Filter, Star, Download, ShoppingCart, Info, MessageSquare, FileSpreadsheet, Target, Mail, BarChart3, Trello, X } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<any>;
  rating: number;
  downloads: number;
  isPremium: boolean;
  price: string | null;
  tags: string[];
  longDescription: string;
  features: string[];
  screenshots: string[];
  documentation: string;
  developer: string;
  version: string;
  lastUpdated: string;
}

const categories = [
  { id: 'all', labelKey: 'marketplace.categories.all' },
  { id: 'communication', labelKey: 'marketplace.categories.communication' },
  { id: 'productivity', labelKey: 'marketplace.categories.productivity' },
  { id: 'marketing', labelKey: 'marketplace.categories.marketing' },
  { id: 'analytics', labelKey: 'marketplace.categories.analytics' },
  { id: 'crm', labelKey: 'marketplace.categories.crm' },
  { id: 'finance', labelKey: 'marketplace.categories.finance' },
];

export default function MarketplacePage() {
  const t = useTranslations('marketplace');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Integration | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    const mockIntegrations: Integration[] = [
      {
        id: '1',
        name: 'Slack',
        description: t('apps.slack.description'),
        longDescription: t('apps.slack.longDescription'),
        category: 'communication',
        icon: MessageSquare,
        rating: 4.8,
        downloads: 12500,
        isPremium: false,
        price: null,
        tags: ['communication', 'teamwork', 'notifications'],
        features: [
          'Automatic notifications',
          'Customizable webhooks',
          'Report scheduling',
          'Team collaboration'
        ],
        screenshots: ['/api/placeholder/600/400', '/api/placeholder/600/400'],
        documentation: 'https://docs.slack.com',
        developer: 'Slack Technologies',
        version: '2.4.1',
        lastUpdated: '2025-01-15'
      },
      {
        id: '2',
        name: 'Google Sheets',
        description: t('apps.googleSheets.description'),
        longDescription: t('apps.googleSheets.longDescription'),
        category: 'productivity',
        icon: FileSpreadsheet,
        rating: 4.9,
        downloads: 18750,
        isPremium: false,
        price: null,
        tags: ['spreadsheets', 'export', 'reports'],
        features: [
          'Real-time sync',
          'Automated reports',
          'Custom templates',
          'Data visualization'
        ],
        screenshots: ['/api/placeholder/600/400', '/api/placeholder/600/400'],
        documentation: 'https://developers.google.com/sheets',
        developer: 'Google LLC',
        version: '1.8.3',
        lastUpdated: '2025-01-20'
      },
      {
        id: '3',
        name: 'Trello',
        description: t('apps.trello.description'),
        longDescription: t('apps.trello.longDescription'),
        category: 'productivity',
        icon: Trello,
        rating: 4.6,
        downloads: 8300,
        isPremium: false,
        price: null,
        tags: ['project management', 'tasks', 'organization'],
        features: [
          'Auto card creation',
          'Custom workflows',
          'Team boards',
          'Progress tracking'
        ],
        screenshots: ['/api/placeholder/600/400'],
        documentation: 'https://developer.atlassian.com/cloud/trello',
        developer: 'Atlassian',
        version: '3.1.0',
        lastUpdated: '2025-01-10'
      },
      {
        id: '4',
        name: 'HubSpot CRM',
        description: t('apps.hubspot.description'),
        longDescription: t('apps.hubspot.longDescription'),
        category: 'crm',
        icon: Target,
        rating: 4.7,
        downloads: 15200,
        isPremium: true,
        price: '$29/month',
        tags: ['crm', 'customers', 'sales'],
        features: [
          'Lead management',
          'Contact sync',
          'Deal tracking',
          'Sales automation'
        ],
        screenshots: ['/api/placeholder/600/400', '/api/placeholder/600/400', '/api/placeholder/600/400'],
        documentation: 'https://developers.hubspot.com',
        developer: 'HubSpot Inc.',
        version: '4.2.1',
        lastUpdated: '2025-01-18'
      },
      {
        id: '5',
        name: 'Gmail',
        description: t('apps.gmail.description'),
        longDescription: t('apps.gmail.longDescription'),
        category: 'communication',
        icon: Mail,
        rating: 4.5,
        downloads: 9800,
        isPremium: false,
        price: null,
        tags: ['email', 'marketing', 'automation'],
        features: [
          'Email campaigns',
          'Template management',
          'Delivery tracking',
          'Contact lists'
        ],
        screenshots: ['/api/placeholder/600/400', '/api/placeholder/600/400'],
        documentation: 'https://developers.google.com/gmail',
        developer: 'Google LLC',
        version: '2.1.5',
        lastUpdated: '2025-01-12'
      },
      {
        id: '6',
        name: 'Power BI',
        description: t('apps.powerbi.description'),
        longDescription: t('apps.powerbi.longDescription'),
        category: 'analytics',
        icon: BarChart3,
        rating: 4.4,
        downloads: 6700,
        isPremium: true,
        price: '$45/month',
        tags: ['analytics', 'visualization', 'business intelligence'],
        features: [
          'Custom dashboards',
          'Real-time analytics',
          'Data modeling',
          'Report sharing'
        ],
        screenshots: ['/api/placeholder/600/400', '/api/placeholder/600/400'],
        documentation: 'https://docs.microsoft.com/power-bi',
        developer: 'Microsoft Corporation',
        version: '1.5.2',
        lastUpdated: '2025-01-08'
      },
    ];

    setIntegrations(mockIntegrations);
    setLoading(false);
  }, [t]);

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      integration.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleInstall = async (integrationId: string) => {
    setInstalling(integrationId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Close modal after successful installation
    setSelectedApp(null);
    setInstalling(null);
    
    // TODO: Show success notification
    alert(t('installSuccess'));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">{t('title')}</h1>
        <p className="dark:text-gray-400 text-gray-600 text-sm">
          {t('subtitle')}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 dark:text-gray-400 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 dark:bg-gray-700 bg-white border dark:border-gray-600 border-gray-200 rounded-lg dark:text-white text-gray-900 dark:placeholder-gray-400 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-200"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 dark:bg-gray-700 bg-white border dark:border-gray-600 border-gray-200 rounded-lg dark:text-white text-gray-900 hover:border-primary-500/50 transition-all duration-200"
          >
            <Filter className="w-5 h-5" />
            {t('filters')}
          </button>
        </div>

        {/* Category Filter */}
        {showFilters && (
          <div className="dark:bg-gray-700 bg-white border dark:border-gray-600 border-gray-200 rounded-lg p-4">
            <h3 className="dark:text-white text-gray-900 font-medium mb-3 text-sm">{t('categoriesLabel')}</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium ${
                    selectedCategory === category.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'dark:bg-gray-800 bg-gray-100 dark:text-gray-300 text-gray-700 hover:dark:bg-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {t(category.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIntegrations.map((integration) => {
          const IconComponent = integration.icon;
          return (
            <div
              key={integration.id}
              className="dark:bg-gray-800 bg-white border dark:border-gray-700 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedApp(integration)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 dark:bg-gray-700 bg-gray-100 rounded-lg flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold dark:text-white text-gray-900 text-sm">{integration.name}</h3>
                    {integration.isPremium && (
                      <span className="inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full mt-1 font-medium">
                        Premium
                      </span>
                    )}
                  </div>
                </div>
                {integration.price && (
                  <div className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {integration.price}
                  </div>
                )}
              </div>

              <p className="dark:text-gray-400 text-gray-600 text-sm mb-4 leading-relaxed">
                {integration.description}
              </p>

              <div className="flex items-center gap-4 mb-4 text-sm dark:text-gray-500 text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{integration.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  <span>{integration.downloads.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {integration.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs dark:bg-gray-700 bg-gray-100 dark:text-gray-400 text-gray-600 rounded font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-4 border-t dark:border-gray-700 border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedApp(integration);
                  }}
                  className="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {integration.isPremium ? t('buyNow') : t('install')}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedApp(integration);
                  }}
                  className="px-4 py-2.5 dark:bg-gray-700 bg-gray-100 dark:text-white text-gray-900 rounded-lg hover:dark:bg-gray-800 hover:bg-gray-200 transition-all duration-200"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredIntegrations.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 dark:bg-gray-700 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 dark:text-gray-400 text-gray-500" />
          </div>
          <h3 className="dark:text-white text-gray-900 font-medium mb-2">{t('noResults')}</h3>
          <p className="dark:text-gray-400 text-gray-600 text-sm">
            {t('noResultsSubtitle')}
          </p>
        </div>
      )}

      {/* App Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 dark:bg-gray-700 bg-gray-100 rounded-xl flex items-center justify-center">
                  <selectedApp.icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold dark:text-white text-gray-900">{selectedApp.name}</h2>
                  <p className="dark:text-gray-400 text-gray-600">{t('by')} {selectedApp.developer}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 dark:bg-gray-700 bg-gray-100 rounded-lg dark:text-white text-gray-900 hover:dark:bg-gray-800 hover:bg-gray-200 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* App Info */}
              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{selectedApp.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="w-5 h-5 dark:text-gray-400 text-gray-500" />
                  <span>{selectedApp.downloads.toLocaleString()} {t('downloads')}</span>
                </div>
                <div className="text-sm dark:text-gray-400 text-gray-600">
                  {t('version')} {selectedApp.version}
                </div>
                {selectedApp.price && (
                  <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {selectedApp.price}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-3">{t('description')}</h3>
                <p className="dark:text-gray-300 text-gray-700 leading-relaxed">
                  {selectedApp.longDescription}
                </p>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-3">{t('features')}</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedApp.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 dark:text-gray-300 text-gray-700">
                      <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Screenshots */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-3">{t('screenshots')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedApp.screenshots.map((screenshot, index) => (
                    <div key={index} className="bg-gray-100 dark:bg-gray-700 rounded-lg h-40 flex items-center justify-center">
                      <span className="dark:text-gray-400 text-gray-500 text-sm">{t('screenshotPlaceholder')} {index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Install Button */}
              <div className="flex gap-4 pt-6 border-t dark:border-gray-700 border-gray-200">
                <button
                  onClick={() => handleInstall(selectedApp.id)}
                  disabled={installing === selectedApp.id}
                  className="flex-1 py-3 px-6 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {installing === selectedApp.id 
                    ? t('installing') 
                    : selectedApp.isPremium 
                      ? t('buyAndInstall') 
                      : t('addToCompany')
                  }
                </button>
                <a
                  href={selectedApp.documentation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 dark:bg-gray-700 bg-gray-100 dark:text-white text-gray-900 rounded-lg hover:dark:bg-gray-800 hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  {t('documentation')}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}