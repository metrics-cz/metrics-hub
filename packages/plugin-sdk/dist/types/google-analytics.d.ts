/**
 * Google Analytics API Types
 */
export interface GoogleAnalyticsAccount {
    id: string;
    name: string;
    properties: GoogleAnalyticsProperty[];
}
export interface GoogleAnalyticsProperty {
    id: string;
    name: string;
    websiteUrl: string;
    views: GoogleAnalyticsView[];
}
export interface GoogleAnalyticsView {
    id: string;
    name: string;
    type: string;
}
export interface GoogleAnalyticsDailyData {
    date: string;
    metrics: {
        sessions: number;
        users: number;
        pageviews: number;
        bounceRate: number;
        avgSessionDuration: number;
        conversions: number;
    };
}
export interface GoogleAnalyticsReportsResponse {
    success: boolean;
    dateRange: {
        startDate: string;
        endDate: string;
    };
    dailyData: GoogleAnalyticsDailyData[];
    summary: {
        totalSessions: number;
        totalUsers: number;
        totalPageviews: number;
        avgBounceRate: number;
        avgSessionDuration: number;
        totalConversions: number;
    };
    total: number;
}
export interface GoogleAnalyticsAccountsResponse {
    success: boolean;
    accounts: GoogleAnalyticsAccount[];
    total: number;
    allViewIds: Array<{
        viewId: string;
        accountName: string;
        propertyName: string;
        viewName: string;
        websiteUrl: string;
    }>;
}
export interface UseGoogleAnalyticsOptions {
    viewId: string;
    startDate: string;
    endDate: string;
    refreshInterval?: number;
    enabled?: boolean;
}
//# sourceMappingURL=google-analytics.d.ts.map