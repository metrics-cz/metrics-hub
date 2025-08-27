import { PluginConfig, PluginError } from "../types";
export declare class BaseClient {
    protected config: PluginConfig;
    constructor(config: PluginConfig);
    protected makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T>;
    protected getFullUrl(endpoint: string): string;
    protected handleError(error: any): PluginError;
    protected log(message: string): void;
    updateConfig(config: PluginConfig): void;
}
//# sourceMappingURL=BaseClient.d.ts.map