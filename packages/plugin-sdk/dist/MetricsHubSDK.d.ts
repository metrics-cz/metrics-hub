import { GoogleAdsClient } from "./services/GoogleAdsClient";
import { GoogleAnalyticsClient } from "./services/GoogleAnalyticsClient";
import { GoogleSheetsClient } from "./services/GoogleSheetsClient";
import { GoogleDriveClient } from "./services/GoogleDriveClient";
import { GmailClient } from "./services/GmailClient";
import { GoogleDocsClient } from "./services/GoogleDocsClient";
import { GoogleSearchConsoleClient } from "./services/GoogleSearchConsoleClient";
import { PluginConfig } from "./types";
export declare class MetricsHubSDK {
    private config;
    ads: GoogleAdsClient;
    analytics: GoogleAnalyticsClient;
    sheets: GoogleSheetsClient;
    drive: GoogleDriveClient;
    gmail: GmailClient;
    searchConsole: GoogleSearchConsoleClient;
    docs: GoogleDocsClient;
    constructor(config: PluginConfig);
    updateConfig(newConfig: Partial<{
        apiKey: string;
        companyId: string;
        apiBaseUrl?: string;
    }>): void;
    getConfig(): PluginConfig;
}
//# sourceMappingURL=MetricsHubSDK.d.ts.map