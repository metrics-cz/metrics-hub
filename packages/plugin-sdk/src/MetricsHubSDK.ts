import { GoogleAdsClient } from "./services/GoogleAdsClient";
import { GoogleAnalyticsClient } from "./services/GoogleAnalyticsClient";
import { GoogleSheetsClient } from "./services/GoogleSheetsClient";
import { GoogleDriveClient } from "./services/GoogleDriveClient";
import { GmailClient } from "./services/GmailClient";
import { GoogleDocsClient } from "./services/GoogleDocsClient";
import { GoogleSearchConsoleClient } from "./services/GoogleSearchConsoleClient";
import { PluginConfig } from "./types";

export class MetricsHubSDK {
    public ads: GoogleAdsClient;
    public analytics: GoogleAnalyticsClient; // Placeholder for future AnalyticsClient
    public sheets: GoogleSheetsClient;
    public drive: GoogleDriveClient; // Placeholder for future DriveClient
    public gmail: GmailClient; // Placeholder for future GmailClient
    public searchConsole: GoogleSearchConsoleClient; // Placeholder for future SearchConsoleClient
    public docs: GoogleDocsClient; // Placeholder for future DocsClient


  constructor(private config: PluginConfig) {
    this.config.apiBaseUrl = config.apiBaseUrl || 'https://api.metrics-hub.com';
    this.ads = new GoogleAdsClient(this.config);
    this.analytics = new GoogleAnalyticsClient(this.config);
    this.sheets = new GoogleSheetsClient(this.config);
    this.drive = new GoogleDriveClient(this.config);
    this.gmail = new GmailClient(this.config);
    this.searchConsole = new GoogleSearchConsoleClient(this.config);
    this.docs = new GoogleDocsClient(this.config);
  }

  public updateConfig(newConfig: Partial<{ apiKey: string; companyId: string; apiBaseUrl?: string }>) {
    this.config = { ...this.config, ...newConfig };
    this.ads.updateConfig(this.config);
    this.analytics.updateConfig(this.config);
    this.sheets.updateConfig(this.config);
    this.drive.updateConfig(this.config);
    this.gmail.updateConfig(this.config);
    this.searchConsole.updateConfig(this.config);
    this.docs.updateConfig(this.config);
  }
  public getConfig() {
    return this.config;
  }
  
}