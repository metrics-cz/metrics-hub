'use strict';

class BaseClient {
    constructor(config) {
        this.config = config;
    }
    async makeRequest(endpoint, options = {}) {
        const url = this.getFullUrl(endpoint);
        const headers = {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
            ...options.headers
        };
        this.log(`Making request to ${url}`);
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            if (!response.ok) {
                throw {
                    status: response.status,
                    message: `HTTP ${response.status}: ${response.statusText}`
                };
            }
            return await response.json();
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    getFullUrl(endpoint) {
        return `${this.config.apiBaseUrl}${endpoint}`;
    }
    handleError(error) {
        if (error.status) {
            return {
                status: error.status,
                message: error.message,
                details: error.details || undefined
            };
        }
        return {
            status: 500,
            message: "Unknown error occurred",
        };
    }
    log(message) {
        if (this.config.debug) {
            console.log(`[${this.constructor.name}] ${message}`);
        }
    }
    updateConfig(config) {
        this.config = config;
    }
}

class GoogleAdsClient extends BaseClient {
    async getCampaigns(customerId) {
        const params = new URLSearchParams({
            companyId: this.config.companyId,
            customerId
        });
        const endpoint = `/api/plugins/google/ads/campaigns?${params.toString()}`;
        return this.makeRequest(endpoint);
    }
    async getKeywords(customerId, options = {}) {
        const params = new URLSearchParams({
            companyId: this.config.companyId,
            customerId
        });
        if (options.campaignId) {
            params.set('campaignId', options.campaignId);
        }
        if (options.adGroupId) {
            params.set('adGroupId', options.adGroupId);
        }
        const endpoint = `/api/plugins/google/ads/keywords?${params.toString()}`;
        return this.makeRequest(endpoint);
    }
}

class GoogleAnalyticsClient extends BaseClient {
    async getAccounts() {
        const queryParams = new URLSearchParams({
            companyId: this.config.companyId
        });
        const endpoint = `/api/plugins/google/analytics/accounts?${queryParams.toString()}`;
        return this.makeRequest(endpoint);
    }
    async getReports(params) {
        const queryParams = new URLSearchParams({
            companyId: this.config.companyId,
            viewId: params.viewId,
            startDate: params.startDate,
            endDate: params.endDate
        });
        const endpoint = `/api/plugins/google/analytics/reports?${queryParams.toString()}`;
        return this.makeRequest(endpoint);
    }
}

class GoogleSheetsClient extends BaseClient {
    async read(params) {
        const queryParams = new URLSearchParams({
            companyId: this.config.companyId,
            spreadsheetId: params.spreadsheetId,
            range: params.range,
            ...(params.valueRenderOption && { valueRenderOption: params.valueRenderOption })
        });
        const endpoint = `/api/plugins/google/sheets/read?${queryParams.toString()}`;
        return this.makeRequest(endpoint);
    }
    async write(params) {
        const endpoint = `/api/plugins/google/sheets/write`;
        return this.makeRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({
                companyId: this.config.companyId,
                ...params
            })
        });
    }
}

class GoogleDriveClient extends BaseClient {
    async getFiles(params = {}) {
        const queryParams = new URLSearchParams({
            companyId: this.config.companyId,
            ...(params.query && { q: params.query }),
            ...(params.pageSize && { pageSize: params.pageSize.toString() }),
            ...(params.orderBy && { orderBy: params.orderBy })
        });
        const endpoint = `/api/plugins/google/drive/files?${queryParams.toString()}`;
        return this.makeRequest(endpoint);
    }
    async getFile(fileId) {
        const queryParams = new URLSearchParams({
            companyId: this.config.companyId
        });
        const endpoint = `/api/plugins/google/drive/files/${fileId}?${queryParams.toString()}`;
        return this.makeRequest(endpoint);
    }
}

class GmailClient extends BaseClient {
    async getMessages(params = {}) {
        const queryParams = new URLSearchParams({
            companyId: this.config.companyId,
            ...(params.query && { q: params.query }),
            ...(params.maxResults && { maxResults: params.maxResults.toString() }),
            ...(params.labelIds && { labelIds: params.labelIds.join(',') })
        });
        const endpoint = `/api/plugins/google/gmail/messages?${queryParams.toString()}`;
        return this.makeRequest(endpoint);
    }
}

class GoogleDocsClient extends BaseClient {
    async getDocument(documentId) {
        const queryParams = new URLSearchParams({
            companyId: this.config.companyId,
            documentId
        });
        const endpoint = `/api/plugins/google/docs?${queryParams.toString()}`;
        return this.makeRequest(endpoint);
    }
    async createDocument(params) {
        const endpoint = `/api/plugins/google/docs`;
        return this.makeRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({
                companyId: this.config.companyId,
                operation: 'create',
                ...params
            })
        });
    }
    async updateDocument(params) {
        const endpoint = `/api/plugins/google/docs`;
        return this.makeRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({
                companyId: this.config.companyId,
                operation: 'update',
                ...params
            })
        });
    }
}

class GoogleSearchConsoleClient extends BaseClient {
    async getSites(params = {}) {
        const queryParams = new URLSearchParams({
            companyId: this.config.companyId,
            ...(params.siteUrl && { siteUrl: params.siteUrl }),
            ...(params.startDate && { startDate: params.startDate }),
            ...(params.endDate && { endDate: params.endDate }),
            ...(params.dimensions && { dimensions: params.dimensions.join(',') })
        });
        const endpoint = `/api/plugins/google/search-console/sites?${queryParams.toString()}`;
        return this.makeRequest(endpoint);
    }
}

class MetricsHubSDK {
    constructor(config) {
        this.config = config;
        this.config.apiBaseUrl = config.apiBaseUrl || 'https://api.metrics-hub.com';
        this.ads = new GoogleAdsClient(this.config);
        this.analytics = new GoogleAnalyticsClient(this.config);
        this.sheets = new GoogleSheetsClient(this.config);
        this.drive = new GoogleDriveClient(this.config);
        this.gmail = new GmailClient(this.config);
        this.searchConsole = new GoogleSearchConsoleClient(this.config);
        this.docs = new GoogleDocsClient(this.config);
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.ads.updateConfig(this.config);
        this.analytics.updateConfig(this.config);
        this.sheets.updateConfig(this.config);
        this.drive.updateConfig(this.config);
        this.gmail.updateConfig(this.config);
        this.searchConsole.updateConfig(this.config);
        this.docs.updateConfig(this.config);
    }
    getConfig() {
        return this.config;
    }
}

/**
 * Plugin SDK Configuration
 */
let globalConfig = null;
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
function configurePlugin(config) {
    globalConfig = {
        apiBaseUrl: 'http://localhost:3000', // Default to local development
        debug: false,
        ...config
    };
    if (config.debug) {
        console.log('[MetricsHub SDK] Configured with:', { ...config, apiKey: '***' });
    }
}
/**
 * Get the current plugin configuration
 */
function getPluginConfig() {
    if (!globalConfig) {
        throw new Error('Plugin SDK not configured. Call configurePlugin() first.\n\n' +
            'Example:\n' +
            'import { configurePlugin } from "@metrics-hub/plugin-sdk"\n' +
            'configurePlugin({ companyId: "your-company-id" })');
    }
    return globalConfig;
}
/**
 * Check if the plugin SDK is configured
 */
function isPluginConfigured() {
    return globalConfig !== null;
}
/**
 * Reset the plugin configuration (mainly for testing)
 */
function resetPluginConfig() {
    globalConfig = null;
}

exports.GmailClient = GmailClient;
exports.GoogleAdsClient = GoogleAdsClient;
exports.GoogleAnalyticsClient = GoogleAnalyticsClient;
exports.GoogleDocsClient = GoogleDocsClient;
exports.GoogleDriveClient = GoogleDriveClient;
exports.GoogleSearchConsoleClient = GoogleSearchConsoleClient;
exports.GoogleSheetsClient = GoogleSheetsClient;
exports.MetricsHubSDK = MetricsHubSDK;
exports.configurePlugin = configurePlugin;
exports.getPluginConfig = getPluginConfig;
exports.isPluginConfigured = isPluginConfigured;
exports.resetPluginConfig = resetPluginConfig;
//# sourceMappingURL=index.js.map
