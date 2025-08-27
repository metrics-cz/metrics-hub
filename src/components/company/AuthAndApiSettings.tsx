'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Unplug,
  Key
} from 'lucide-react';
import { format } from 'date-fns';
import { GoogleOAuthSettings } from './GoogleOAuthSettings';

interface Connection {
  id: string;
  connection_id: string;
  name: string;
  description: string;
  icon_url: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  connected_at: string;
  last_sync_at: string | null;
  connected_by: string;
  config?: Record<string, any>;
  connection?: {
    id: string;
    connection_key: string;
    name: string;
    description: string;
    icon_url: string;
    provider: string;
  };
}

interface AuthAndApiSettingsProps {
  companyId: string;
}

export function AuthAndApiSettings({ companyId }: AuthAndApiSettingsProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/company/${companyId}/connections`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch connections');
      }

      const { data } = await response.json();

      // Filter out Google (handled separately) and transform data
      const transformedConnections: Connection[] = (data || [])
        .filter((item: any) => item.connection?.connection_key !== 'google') // Google handled separately
        .map((item: any) => ({
          id: item.id,
          connection_id: item.connection_id,
          name: item.name || item.connection?.name || 'Unknown Service',
          description: item.connection?.description || '',
          icon_url: item.connection?.icon_url || '',
          provider: item.connection?.provider || 'unknown',
          status: item.status,
          connected_at: item.connected_at,
          last_sync_at: item.last_sync_at,
          connected_by: item.connected_by,
          config: item.config,
          connection: item.connection,
        }));

      setConnections(transformedConnections);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch API connections';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [companyId]);

  const getStatusIcon = (status: Connection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'disconnected':
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: Connection['status']) => {
    const variants = {
      connected: 'default',
      error: 'destructive',
      disconnected: 'secondary',
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/company/${companyId}/connections?connectionId=${connectionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect service');
      }

      // Refresh the list
      await fetchConnections();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect service';
      setError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <GoogleOAuthSettings 
          companyId={companyId} 
          onIntegrationChange={fetchConnections}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Connections
            </CardTitle>
            <CardDescription>
              OAuth and API service connections for your company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <GoogleOAuthSettings 
          companyId={companyId} 
          onIntegrationChange={fetchConnections}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Connections
            </CardTitle>
            <CardDescription>
              OAuth and API service connections for your company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              onClick={fetchConnections}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Google OAuth Integration */}
      <GoogleOAuthSettings 
        companyId={companyId} 
        onIntegrationChange={fetchConnections}
      />

      {/* Other API Connections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Other API Connections
              </CardTitle>
              <CardDescription>
                {connections.length} other API connection{connections.length !== 1 ? 's' : ''} configured for your company
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchConnections}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">No other API connections</h3>
              <p className="text-sm">
                Connect additional services like Slack, Discord, or other APIs to expand your integrations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection, index) => (
                <div key={connection.id}>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={connection.icon_url} alt={connection.name} />
                      <AvatarFallback>
                        {connection.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{connection.name}</h3>
                        {getStatusIcon(connection.status)}
                        {getStatusBadge(connection.status)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {connection.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span>Connected:</span>
                          <span>{format(new Date(connection.connected_at), 'MMM d, yyyy')}</span>
                        </div>
                        
                        {connection.last_sync_at && (
                          <div className="flex items-center gap-1">
                            <span>Last sync:</span>
                            <span>{format(new Date(connection.last_sync_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <span>Provider: {connection.provider}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(connection.connection_id)}
                      >
                        <Unplug className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {index < connections.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}