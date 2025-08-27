/**
 * Plugin SDK Configuration
 */

import { PluginConfig } from '../types'

let globalConfig: PluginConfig | null = null

/**
 * Configure the plugin SDK with your company settings
 * 
 * @param config - Plugin configuration
 * 
 * @example
 * ```tsx
 * import { configurePlugin } from '@metrics-hub/plugin-sdk'
 * 
 * configurePlugin({
 *   companyId: 'your-company-id',
 *   apiBaseUrl: 'https://your-metrics-hub.vercel.app'
 * })
 * ```
 */
export function configurePlugin(config: PluginConfig): void {
  globalConfig = {
    apiBaseUrl: 'http://localhost:3000', // Default to local development
    debug: false,
    ...config
  }
  
  if (config.debug) {
    console.log('[MetricsHub SDK] Configured with:', { ...config, apiKey: '***' })
  }
}

/**
 * Get the current plugin configuration
 */
export function getPluginConfig(): PluginConfig {
  if (!globalConfig) {
    throw new Error(
      'Plugin SDK not configured. Call configurePlugin() first.\n\n' +
      'Example:\n' +
      'import { configurePlugin } from "@metrics-hub/plugin-sdk"\n' +
      'configurePlugin({ companyId: "your-company-id" })'
    )
  }
  return globalConfig
}

/**
 * Check if the plugin SDK is configured
 */
export function isPluginConfigured(): boolean {
  return globalConfig !== null
}

/**
 * Reset the plugin configuration (mainly for testing)
 */
export function resetPluginConfig(): void {
  globalConfig = null
}