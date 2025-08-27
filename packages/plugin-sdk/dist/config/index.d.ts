/**
 * Plugin SDK Configuration
 */
import { PluginConfig } from '../types';
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
export declare function configurePlugin(config: PluginConfig): void;
/**
 * Get the current plugin configuration
 */
export declare function getPluginConfig(): PluginConfig;
/**
 * Check if the plugin SDK is configured
 */
export declare function isPluginConfigured(): boolean;
/**
 * Reset the plugin configuration (mainly for testing)
 */
export declare function resetPluginConfig(): void;
//# sourceMappingURL=index.d.ts.map