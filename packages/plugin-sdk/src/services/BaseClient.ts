import { PluginConfig, PluginError } from "../types";

export class BaseClient {
    protected config: PluginConfig;

    constructor(config: PluginConfig) {
        this.config = config;
    }

    protected async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
        } catch (error) {
            throw this.handleError(error);
        }
    }

    protected getFullUrl(endpoint: string): string {
        return `${this.config.apiBaseUrl}${endpoint}`;
    }

    protected handleError(error: any): PluginError {
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

    protected log(message: string): void {
        if (this.config.debug) {
            console.log(`[${this.constructor.name}] ${message}`);
        }
    }

    updateConfig(config: PluginConfig): void {
        this.config = config;
    }
}