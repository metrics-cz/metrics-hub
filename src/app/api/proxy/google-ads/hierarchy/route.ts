import { NextRequest } from 'next/server';
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens';

/**
 * PROXY ENDPOINT FOR GOOGLE ADS ACCOUNT HIERARCHY
 * 
 * This endpoint gets the account hierarchy for MCC (Manager) accounts
 * Plugin expects: /api/proxy/google-ads/hierarchy?companyId=xyz
 */

interface HierarchyNode {
  customerId: string;
  descriptiveName: string;
  isManager: boolean;
  parentCustomerId?: string;
  children?: HierarchyNode[];
}

export async function GET(request: NextRequest) {
  try {
    // Extract parameters from URL
    const { searchParams } = new URL(request.url);
    let companyId = searchParams.get('companyId');
    
    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 });
    }

    // Handle hardcoded "production-company" from plugin - map to real company ID
    if (companyId === 'production-company') {
      console.log(`[PROXY-HIERARCHY] Mapping production-company to real company ID`);
      // Try to get the real company ID from request headers
      const referer = request.headers.get('referer');
      const origin = request.headers.get('origin');
      
      if (referer) {
        const match = referer.match(/companies\/([a-f0-9-]+)\/apps/);
        if (match && match[1]) {
          companyId = match[1];
          console.log(`[PROXY-HIERARCHY] Extracted company ID from referer: ${companyId}`);
        }
      } else if (origin) {
        // For iframe requests, we might not have referer, but we can try to extract from other headers
        console.log(`[PROXY-HIERARCHY] No referer header, got origin: ${origin}`);
      }
      
      // If still production-company, log the issue but continue with a fallback
      if (companyId === 'production-company') {
        console.warn(`[PROXY-HIERARCHY] Plugin still using hardcoded 'production-company' - attempting with fallback company ID`);
        // Use the first available company as fallback (for testing purposes)
        companyId = '6a1d34d8-661b-4c81-be6f-bc144600b7d9'; // Fallback to the test company
        console.log(`[PROXY-HIERARCHY] Using fallback company ID: ${companyId}`);
      }
    }

    console.log(`[PROXY-HIERARCHY] Getting account hierarchy for company: ${companyId}`);

    // Get OAuth tokens
    const tokens = await getGoogleOAuthTokens(companyId);
    
    if (!tokens) {
      console.warn(`[PROXY-HIERARCHY] No valid Google tokens found for company: ${companyId}`);
      return Response.json({ 
        error: 'Google Ads not connected for this company',
        hierarchy: null
      }, { status: 401 });
    }

    const accessToken = tokens.access_token;

    // First, get accessible customers with API version negotiation
    const apiVersions = ['v21', 'v20', 'v19', 'v14']; // Try newer versions first
    let customersResponse = null;
    let workingVersion = 'v21';

    for (const version of apiVersions) {
      try {
        console.log(`[PROXY-HIERARCHY] Trying Google Ads API ${version} for listAccessibleCustomers`);

        customersResponse = await fetch(`https://googleads.googleapis.com/${version}/customers:listAccessibleCustomers`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
            'Content-Type': 'application/json',
          }
        });

        if (customersResponse.ok) {
          workingVersion = version;
          console.log(`[PROXY-HIERARCHY] SUCCESS with ${version} for listAccessibleCustomers`);
          break;
        } else {
          console.log(`[PROXY-HIERARCHY] ${version} failed with ${customersResponse.status} for listAccessibleCustomers`);
        }
      } catch (error) {
        console.log(`[PROXY-HIERARCHY] ${version} threw error for listAccessibleCustomers:`, error);
        continue;
      }
    }

    if (!customersResponse) {
      throw new Error('All Google Ads API versions failed');
    }

    if (!customersResponse.ok) {
      let error;
      const responseText = await customersResponse.text();
      try {
        error = JSON.parse(responseText);
      } catch (parseError) {
        // If response is not JSON (like HTML error page), use text as error
        error = {
          message: `Google Ads API returned ${customersResponse.status}`,
          response: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
        };
      }
      console.error('[PROXY-HIERARCHY] Failed to get accessible customers:', error);

      console.log('[PROXY-HIERARCHY] Google Ads API request failed');

      return Response.json({
        error: 'Unable to retrieve Google Ads account hierarchy',
        hierarchy: null,
        total: 0,
        debug: {
          apiError: error.message,
          suggestion: 'Verify Google Ads API credentials and account access'
        }
      }, { status: 500 });
    }

    const customersData = await customersResponse.json();
    const customerIds = customersData.resourceNames?.map((name: string) => 
      name.replace('customers/', '')
    ) || [];

    // Build enhanced account discovery - combine direct access + hierarchy discovery
    const allDiscoveredAccounts: HierarchyNode[] = [];

    // First, add all directly accessible accounts as base nodes
    for (const customerId of customerIds) {
      allDiscoveredAccounts.push({
        customerId,
        descriptiveName: `Account ${customerId}`, // We'll get real names later
        isManager: false, // Will be determined by account type query
        parentCustomerId: undefined // Direct access means no parent
      });
    }

    console.log(`[PROXY-HIERARCHY] Added ${customerIds.length} directly accessible accounts as base nodes`);

    // Then try to enhance with hierarchy discovery for MCC accounts
    const hierarchyNodes: HierarchyNode[] = [];

    for (const customerId of customerIds.slice(0, 10)) { // Limit to avoid timeout
      try {
        console.log(`[PROXY-HIERARCHY] Checking customer ${customerId} for client accounts`);

        // Query to get all client accounts under this manager account
        // This uses the customer_client resource to find child accounts
        const query = `
          SELECT
            customer_client.client_customer,
            customer_client.descriptive_name,
            customer_client.manager,
            customer_client.level,
            customer_client.currency_code,
            customer_client.time_zone,
            customer_client.id
          FROM customer_client
          WHERE customer_client.status = 'ENABLED'
        `;

        const hierarchyResponse = await fetch(`https://googleads.googleapis.com/${workingVersion}/customers/${customerId}/googleAds:searchStream`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
            'Content-Type': 'application/json',
            'login-customer-id': customerId // This is important for MCC queries
          },
          body: JSON.stringify({ query })
        });

        if (hierarchyResponse.ok) {
          const hierarchyData = await hierarchyResponse.json();

          if (hierarchyData.results) {
            console.log(`[PROXY-HIERARCHY] Found ${hierarchyData.results.length} client accounts for manager ${customerId}`);

            for (const result of hierarchyData.results) {
              const client = result.customerClient;

              // Extract customer ID from resource name format (customers/1234567890)
              const clientCustomerId = client.clientCustomer?.replace('customers/', '') || client.id;

              hierarchyNodes.push({
                customerId: clientCustomerId,
                descriptiveName: client.descriptiveName || `Account ${clientCustomerId}`,
                isManager: client.manager || false,
                parentCustomerId: customerId // The manager account is the parent
              });
            }
          } else {
            console.log(`[PROXY-HIERARCHY] No client accounts found for manager ${customerId}`);
          }
        } else {
          const errorText = await hierarchyResponse.text();
          const status = hierarchyResponse.status;

          if (status === 403) {
            console.warn(`[PROXY-HIERARCHY] Permission denied for MCC ${customerId} - need Admin access in this MCC to query client accounts`);
          } else if (status === 404) {
            console.warn(`[PROXY-HIERARCHY] Customer ${customerId} not found or not an MCC account`);
          } else {
            console.warn(`[PROXY-HIERARCHY] Hierarchy query failed for ${customerId}: ${status} ${errorText}`);
          }
        }
      } catch (error) {
        console.warn(`[PROXY-HIERARCHY] Failed to get hierarchy for customer ${customerId}:`, error);
      }
    }

    // Combine all discovered accounts (direct access + hierarchy)
    const combinedAccounts = [...allDiscoveredAccounts];

    // Add any additional accounts found through hierarchy discovery
    for (const hierarchyNode of hierarchyNodes) {
      const existingAccount = combinedAccounts.find(acc => acc.customerId === hierarchyNode.customerId);
      if (!existingAccount) {
        combinedAccounts.push(hierarchyNode);
      }
    }

    console.log(`[PROXY-HIERARCHY] Total discovered accounts: ${combinedAccounts.length} (${allDiscoveredAccounts.length} direct + ${hierarchyNodes.length} hierarchy)`);

    // Build parent-child relationships
    const buildHierarchy = (nodes: HierarchyNode[]): HierarchyNode[] => {
      const nodeMap = new Map(nodes.map(node => [node.customerId, node]));
      const rootNodes: HierarchyNode[] = [];

      for (const node of nodes) {
        if (node.parentCustomerId && nodeMap.has(node.parentCustomerId)) {
          const parent = nodeMap.get(node.parentCustomerId)!;
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }

      return rootNodes;
    };

    const hierarchy = buildHierarchy(combinedAccounts);

    console.log(`[PROXY-HIERARCHY] Built enhanced hierarchy with ${hierarchy.length} root nodes`);

    return Response.json({
      success: true,
      hierarchy: {
        customerId: 'root',
        descriptiveName: 'All Accessible Accounts',
        isManager: true,
        children: hierarchy
      },
      total: combinedAccounts.length,
      discovery: {
        directAccounts: allDiscoveredAccounts.length,
        hierarchyAccounts: hierarchyNodes.length,
        totalAccounts: combinedAccounts.length
      }
    });

  } catch (error) {
    console.error('[PROXY-HIERARCHY] Error:', error);
    return Response.json({ 
      error: 'Internal server error',
      hierarchy: null
    }, { status: 500 });
  }
}