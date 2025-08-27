/**
 * Metrics Hub Plugin SDK Types
 *
 * All TypeScript types for the plugin system
 */
export * from './google-ads';
export * from './google-analytics';
export interface PluginConfig {
    companyId: string;
    apiBaseUrl?: string;
    apiKey?: string;
    debug?: boolean;
}
export interface PluginError {
    message: string;
    code?: string;
    status?: number;
    details?: any;
}
export interface BaseApiResponse {
    success: boolean;
    error?: string;
    details?: any;
}
export interface BaseHookOptions {
    refreshInterval?: number;
    enabled?: boolean;
    onError?: (error: PluginError) => void;
    onSuccess?: (data: any) => void;
}
export interface HookReturn<T> {
    data: T | undefined;
    error: PluginError | undefined;
    loading: boolean;
    mutate: () => Promise<void>;
}
//# sourceMappingURL=index.d.ts.map