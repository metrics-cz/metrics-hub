'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Plus, Settings, Trash2, MessageSquare, FileSpreadsheet, Target, Mail, BarChart3, Trello } from 'lucide-react';

interface App {
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
}

export default function AppsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const router = useRouter();
  const path = usePathname();
  const [installedApps, setInstalledApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real API calls to fetch installed apps
    const mockInstalledApps: App[] = [
      {
        id: '1',
        name: 'Slack',
        description: 'Posílejte automaticky notifikace a reporty do vašich Slack kanálů',
        category: 'communication',
        icon: MessageSquare,
        rating: 4.8,
        downloads: 12500,
        isInstalled: true,
        isPremium: false,
        tags: ['komunikace', 'týmová práce', 'notifikace'],
      },
      {
        id: '2',
        name: 'Google Sheets',
        description: 'Exportujte data a vytvárejte automatické reporty v Google Sheets',
        category: 'productivity',
        icon: FileSpreadsheet,
        rating: 4.9,
        downloads: 18750,
        isInstalled: true,
        isPremium: false,
        tags: ['tabulky', 'export', 'reporty'],
      },
      {
        id: '4',
        name: 'HubSpot CRM',
        description: 'Integrujte vaše data přímo do HubSpot CRM pro lepší zákaznickou péči',
        category: 'crm',
        icon: Target,
        rating: 4.7,
        downloads: 15200,
        isInstalled: true,
        isPremium: true,
        tags: ['crm', 'zákazníci', 'prodej'],
      },
    ];

    setInstalledApps(mockInstalledApps);
    setLoading(false);
  }, [companyId]);

  const handleConfigureApp = (appId: string) => {
    // TODO: Navigate to app configuration page
    console.log('Configure app:', appId);
  };

  const handleRemoveApp = async (appId: string) => {
    // TODO: Implement actual removal logic
    setInstalledApps(prev => prev.filter(app => app.id !== appId));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Nainstalované aplikace</h1>
          <p className="dark:text-gray-400 text-gray-600 text-sm">
            Spravujte vaše nainstalované aplikace a integrace
          </p>
        </div>
        <button
          className="bg-primary-600 text-white rounded-lg px-4 py-2.5 hover:bg-primary-700 transition-all duration-200 inline-flex items-center gap-2 shadow-sm font-medium text-sm"
          onClick={() => router.push(`${path}/addApp`)}>
          <Plus className="w-4 h-4" />
          Přidat aplikace
        </button>
      </div>

      {installedApps.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 dark:bg-gray-600 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 dark:text-gray-400 text-gray-500" />
          </div>
          <h3 className="dark:text-white text-gray-900 font-medium mb-2">Žádné aplikace nejsou nainstalovány</h3>
          <p className="dark:text-gray-400 text-gray-600 mb-6 text-sm">
            Začněte přidáním aplikací z marketplace
          </p>
          <button
            className="bg-primary-600 text-white rounded-lg px-6 py-3 hover:bg-primary-700 transition-all duration-200 inline-flex items-center gap-2 shadow-sm font-medium"
            onClick={() => router.push(`${path}/addApp`)}>
            <Plus className="w-4 h-4" />
            Prohlédnout marketplace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {installedApps.map((app) => {
            const IconComponent = app.icon;
            return (
              <div
                key={app.id}
                className="dark:bg-gray-600 bg-white border dark:border-gray-700 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 dark:bg-gray-500 bg-gray-100 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold dark:text-white text-gray-900 text-sm">{app.name}</h3>
                      {app.isPremium && (
                        <span className="inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full mt-1 font-medium">
                          Premium
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                    <span className="text-xs font-medium">Aktivní</span>
                  </div>
                </div>

                <p className="dark:text-gray-400 text-gray-600 text-sm mb-4 leading-relaxed">
                  {app.description}
                </p>

                <div className="flex gap-3 pt-4 border-t dark:border-gray-700 border-gray-200">
                  <button
                    onClick={() => handleConfigureApp(app.id)}
                    className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Settings className="w-4 h-4" />
                    Nastavit
                  </button>
                  <button
                    onClick={() => handleRemoveApp(app.id)}
                    className="px-4 py-2 dark:bg-red-900/20 bg-red-50 dark:text-red-400 text-red-600 rounded-lg hover:dark:bg-red-900/30 hover:bg-red-100 transition-all duration-200"
                    title="Odebrat aplikaci"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}