/**
 * Metrics Hub Plugin SDK Types
 * 
 * All TypeScript types for the plugin system
 */

// Google Services
export * from './google-ads'
export * from './google-analytics'

// Core SDK Types
export interface PluginConfig {
  companyId: string
  apiBaseUrl?: string
  apiKey?: string
  debug?: boolean
}

export interface PluginError {
  message: string
  code?: string
  status?: number
  details?: any
}

export interface BaseApiResponse {
  success: boolean
  error?: string
  details?: any
}

// Common hook options
export interface BaseHookOptions {
  refreshInterval?: number
  enabled?: boolean
  onError?: (error: PluginError) => void
  onSuccess?: (data: any) => void
}

// SWR-like return type
export interface HookReturn<T> {
  data: T | undefined
  error: PluginError | undefined
  loading: boolean
  mutate: () => Promise<void>
}