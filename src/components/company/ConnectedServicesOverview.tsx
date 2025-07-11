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
  Clock,
  ExternalLink,
  Unplug
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';

interface ConnectedService {
  id: string;
  integration_id: string;
  name: string;
  description: string;
  icon_url: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  connected_at: string;
  last_sync: string | null;
  connected_by: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  config?: Record<string, any>;
  error_message?: string;
}

interface ConnectedServicesOverviewProps {
  companyId: string;
}

export function ConnectedServicesOverview({ companyId }: ConnectedServicesOverviewProps) {
  const [services, setServices] = useState<ConnectedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnectedServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('company_integrations')
        .select(`
          id,
          integration_id,
          status,
          connected_at,
          last_sync,
          config,
          error_message,
          connected_by_user_id,
          integrations (
            id,
            name,
            description,
            icon_url
          ),
          users (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('company_id', companyId)
        .order('connected_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const transformedServices: ConnectedService[] = (data || []).map((item: any) => ({
        id: item.id,
        integration_id: item.integration_id,
        name: item.integrations?.name || 'Unknown Service',
        description: item.integrations?.description || '',
        icon_url: item.integrations?.icon_url || '',
        status: item.status,
        connected_at: item.connected_at,
        last_sync: item.last_sync,
        connected_by: {
          id: item.users?.id || '',
          name: item.users?.name || 'Unknown User',
          email: item.users?.email || '',
          avatar_url: item.users?.avatar_url,
        },
        config: item.config,
        error_message: item.error_message,
      }));

      setServices(transformedServices);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch connected services';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectedServices();
  }, [companyId]);

  const getStatusIcon = (status: ConnectedService['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ConnectedService['status']) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      error: 'destructive',
      pending: 'outline',
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  const handleDisconnect = async (serviceId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('company_integrations')
        .delete()
        .eq('id', serviceId);

      if (deleteError) {
        throw deleteError;
      }

      // Refresh the list
      await fetchConnectedServices();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect service';
      setError(errorMessage);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Services</CardTitle>
          <CardDescription>
            Services and integrations connected to your company
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Services</CardTitle>
          <CardDescription>
            Services and integrations connected to your company
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={fetchConnectedServices}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Connected Services</CardTitle>
            <CardDescription>
              {services.length} service{services.length !== 1 ? 's' : ''} connected to your company
            </CardDescription>
          </div>
          <Button variant="outline" onClick={fetchConnectedServices}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold mb-2">No connected services</h3>
            <p className="text-sm">
              Connect your first service to get started with integrations.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={service.id}>
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={service.icon_url} alt={service.name} />
                    <AvatarFallback>
                      {service.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{service.name}</h3>
                      {getStatusIcon(service.status)}
                      {getStatusBadge(service.status)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {service.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>Connected:</span>
                        <span>{format(new Date(service.connected_at), 'MMM d, yyyy')}</span>
                      </div>
                      
                      {service.last_sync && (
                        <div className="flex items-center gap-1">
                          <span>Last sync:</span>
                          <span>{format(new Date(service.last_sync), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={service.connected_by.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {service.connected_by.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>by {service.connected_by.name}</span>
                      </div>
                    </div>
                    
                    {service.status === 'error' && service.error_message && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {service.error_message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Navigate to integration settings
                        window.location.href = `/companies/${companyId}/integrations/${service.integration_id}/settings`;
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(service.id)}
                    >
                      <Unplug className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {index < services.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}