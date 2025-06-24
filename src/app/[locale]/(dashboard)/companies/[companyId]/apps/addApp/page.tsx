'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search, Filter, Star, Download, Check, ArrowLeft, Info, MessageSquare, FileSpreadsheet, Target, Mail, BarChart3, Trello } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<any>;
  rating: number;
  downloads: number;
  isInstalled: boolean;
  isPremium: boolean;
  tags: string[];
  longDescription: string;
  features: string[];
}

const categories = [
  { id: 'all', name: 'Všechny aplikace' },
  { id: 'communication', name: 'Komunikace' },
  { id: 'productivity', name: 'Produktivita' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'analytics', name: 'Analytika' },
  { id: 'crm', name: 'CRM' },
  { id: 'finance', name: 'Finance' },
];

export default function AddAppPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Replace with real API calls
    const mockIntegrations: Integration[] = [
      {
        id: '1',
        name: 'Slack',
        description: 'Posílejte automaticky notifikace a reporty do vašich Slack kanálů',
        longDescription: 'Integrujte vaši aplikaci se Slack workspace a automaticky posílejte notifikace, reporty a aktualizace přímo do vašich kanálů.',
        category: 'communication',
        icon: MessageSquare,
        rating: 4.8,
        downloads: 12500,
        isInstalled: true,
        isPremium: false,
        tags: ['komunikace', 'týmová práce', 'notifikace'],
        features: ['Automatické notifikace', 'Customizable webhooks', 'Report scheduling', 'Team collaboration'],
      },
      {
        id: '2',
        name: 'Google Sheets',
        description: 'Exportujte data a vytvárejte automatické reporty v Google Sheets',
        longDescription: 'Synchronizujte vaše data s Google Sheets a vytvářejte automatické reporty, dashboardy a přehledy.',
        category: 'productivity',
        icon: FileSpreadsheet,
        rating: 4.9,
        downloads: 18750,
        isInstalled: true,
        isPremium: false,
        tags: ['tabulky', 'export', 'reporty'],
        features: ['Real-time sync', 'Automated reports', 'Custom templates', 'Data visualization'],
      },
      {
        id: '3',
        name: 'Trello',
        description: 'Synchronizujte úkoly a vytvářejte karty na základě dat',
        longDescription: 'Automaticky vytvářejte Trello karty na základě událostí ve vaší aplikaci a udržujte týmovou produktivitu.',
        category: 'productivity',
        icon: Trello,
        rating: 4.6,
        downloads: 8300,
        isInstalled: false,
        isPremium: false,
        tags: ['projektový management', 'úkoly', 'organizace'],
        features: ['Auto card creation', 'Custom workflows', 'Team boards', 'Progress tracking'],
      },
      {
        id: '4',
        name: 'HubSpot CRM',
        description: 'Integrujte vaše data přímo do HubSpot CRM pro lepší zákaznickou péči',
        longDescription: 'Propojte vaši aplikaci s HubSpot CRM a automaticky aktualizujte zákaznická data, vytvářejte leady a spravujte prodejní pipeline.',
        category: 'crm',
        icon: Target,
        rating: 4.7,
        downloads: 15200,
        isInstalled: true,
        isPremium: true,
        tags: ['crm', 'zákazníci', 'prodej'],
        features: ['Lead management', 'Contact sync', 'Deal tracking', 'Sales automation'],
      },
      {
        id: '5',
        name: 'Gmail',
        description: 'Automaticky posílejte emailové kampaně a notifikace',
        longDescription: 'Nastavte automatické emailové kampaně a notifikace přímo z vaší aplikace pomocí Gmail API.',
        category: 'communication',
        icon: Mail,
        rating: 4.5,
        downloads: 9800,
        isInstalled: false,
        isPremium: false,
        tags: ['email', 'marketing', 'automatizace'],
        features: ['Email campaigns', 'Template management', 'Delivery tracking', 'Contact lists'],
      },
      {
        id: '6',
        name: 'Power BI',
        description: 'Vytvářejte pokročilé dashboardy a vizualizace v Microsoft Power BI',
        longDescription: 'Připojte vaše data k Microsoft Power BI a vytvářejte pokročilé business intelligence dashboardy.',
        category: 'analytics',
        icon: BarChart3,
        rating: 4.4,
        downloads: 6700,
        isInstalled: false,
        isPremium: true,
        tags: ['analytika', 'vizualizace', 'business intelligence'],
        features: ['Custom dashboards', 'Real-time analytics', 'Data modeling', 'Report sharing'],
      },
    ];

    setIntegrations(mockIntegrations);
    setLoading(false);
  }, [companyId]);

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      integration.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleInstall = async (integrationId: string) => {
    setInstalling(integrationId);
    
    // TODO: Implement actual installation logic
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
    
    setIntegrations(prev => 
      prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, isInstalled: true }
          : integration
      )
    );
    setInstalling(null);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 dark:bg-gray-600 bg-gray-100 rounded-lg dark:text-white text-gray-900 hover:dark:bg-gray-700 hover:bg-gray-200 transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-1">Marketplace aplikací</h1>
          <p className="dark:text-gray-400 text-gray-600 text-sm">
            Objevte a nainstalujte aplikace pro rozšíření možností vaší platformy
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 dark:text-gray-400 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Hledat aplikace..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 dark:bg-gray-600 bg-white border dark:border-gray-700 border-gray-200 rounded-lg dark:text-white text-gray-900 dark:placeholder-gray-400 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 dark:bg-gray-600 bg-white border dark:border-gray-700 border-gray-200 rounded-lg dark:text-white text-gray-900 hover:border-green-500/50 transition-all duration-200"
          >
            <Filter className="w-5 h-5" />
            Filtry
          </button>
        </div>

        {/* Category Filter */}
        {showFilters && (
          <div className="dark:bg-gray-600 bg-white border dark:border-gray-700 border-gray-200 rounded-lg p-4">
            <h3 className="dark:text-white text-gray-900 font-medium mb-3 text-sm">Kategorie</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium ${
                    selectedCategory === category.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'dark:bg-gray-500 bg-gray-100 dark:text-gray-300 text-gray-700 hover:dark:bg-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
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
              className="dark:bg-gray-600 bg-white border dark:border-gray-700 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 dark:bg-gray-500 bg-gray-100 rounded-lg flex items-center justify-center">
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
                {integration.isInstalled && (
                  <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                    <Check className="w-4 h-4" />
                    <span className="text-xs font-medium">Nainstalováno</span>
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
                    className="px-2 py-1 text-xs dark:bg-gray-500 bg-gray-100 dark:text-gray-400 text-gray-600 rounded font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-4 border-t dark:border-gray-700 border-gray-200">
                {integration.isInstalled ? (
                  <button className="flex-1 py-2.5 px-4 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm">
                    <Check className="w-4 h-4" />
                    Nainstalováno
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(integration.id)}
                    disabled={installing === integration.id}
                    className="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
                  >
                    {installing === integration.id ? 'Instaluji...' : 'Nainstalovat'}
                  </button>
                )}
                <button className="px-4 py-2.5 dark:bg-gray-500 bg-gray-100 dark:text-white text-gray-900 rounded-lg hover:dark:bg-gray-600 hover:bg-gray-200 transition-all duration-200">
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 dark:bg-gray-600 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 dark:text-gray-400 text-gray-500" />
          </div>
          <h3 className="dark:text-white text-gray-900 font-medium mb-2">Žádné aplikace nenalezeny</h3>
          <p className="dark:text-gray-400 text-gray-600 text-sm">
            Zkuste změnit hledaný výraz nebo filtry
          </p>
        </div>
      )}
    </div>
  );
}