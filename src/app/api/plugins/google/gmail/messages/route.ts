import { NextRequest } from 'next/server'
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens'

/**
 * GMAIL MESSAGES API ROUTE
 * 
 * Purpose: Read Gmail messages for email marketing insights and analysis
 * Scope: gmail.readonly - read-only access to Gmail
 * 
 * What you can access:
 * - List messages with filters (from/to/subject/date)
 * - Get message content and metadata
 * - Message labels and categories
 * - Thread conversations
 * - Attachment information (not content for security)
 * 
 * Note: This is READ-ONLY. We're not sending emails, just analyzing received ones
 */

interface GmailMessageRequest {
  companyId: string           // Company ID to get OAuth tokens for
  query?: string              // Gmail search query (like in Gmail search box)
  labelIds?: string[]         // Filter by labels (INBOX, SENT, SPAM, etc.)
  maxResults?: number         // Max messages to return (1-500, default 100)
  pageToken?: string          // For pagination
  includeSpamTrash?: boolean  // Include spam/trash messages
}

interface GmailMessagesResponse {
  messages: Array<{
    id: string          // Message ID
    threadId: string    // Thread ID (for conversations)
  }>
  nextPageToken?: string     // For getting next page of results
  resultSizeEstimate: number // Approximate total results
}

interface GmailMessageDetailResponse {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string           // First ~150 characters of message
  payload: {
    partId: string
    mimeType: string
    filename: string
    headers: Array<{
      name: string          // Header name like "From", "Subject", "Date"
      value: string         // Header value
    }>
    body: {
      attachmentId?: string
      size: number
      data?: string         // Base64 encoded message content
    }
    parts?: any[]          // For multipart messages (HTML + text)
  }
  sizeEstimate: number     // Message size in bytes
  historyId: string        // For tracking changes
  internalDate: string     // When Gmail received the message
}

/**
 * GET ENDPOINT - List messages with optional filters
 * 
 * URL Examples:
 * - /api/plugins/google/gmail/messages (all messages)
 * - /api/plugins/google/gmail/messages?query=from:newsletter@company.com (from specific sender)
 * - /api/plugins/google/gmail/messages?query=subject:receipt (messages with "receipt" in subject)
 * - /api/plugins/google/gmail/messages?labelIds=INBOX&maxResults=50 (50 inbox messages)
 */
export async function GET(request: NextRequest) {
  try {
    // STEP 1: Extract query parameters
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const query = searchParams.get('query')
    const labelIds = searchParams.get('labelIds')?.split(',') || undefined
    const maxResults = parseInt(searchParams.get('maxResults') || '100')
    const pageToken = searchParams.get('pageToken')
    const includeSpamTrash = searchParams.get('includeSpamTrash') === 'true'

    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }

    // Validate maxResults
    if (maxResults > 500) {
      return Response.json({ 
        error: 'maxResults cannot exceed 500' 
      }, { status: 400 })
    }

    // STEP 2: Get OAuth access token from database
    console.log(`[GMAIL-MESSAGES] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[GMAIL-MESSAGES] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Gmail not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 2: Build query parameters for Gmail API
    const queryParams = new URLSearchParams()
    if (query) queryParams.append('q', query)
    if (labelIds) labelIds.forEach(id => queryParams.append('labelIds', id))
    if (maxResults) queryParams.append('maxResults', maxResults.toString())
    if (pageToken) queryParams.append('pageToken', pageToken)
    if (includeSpamTrash) queryParams.append('includeSpamTrash', 'true')

    // STEP 3: Make API call to Gmail
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Gmail API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 4: Parse Gmail response
    const data: GmailMessagesResponse = await response.json()

    return Response.json({
      success: true,
      messages: data.messages || [],
      nextPageToken: data.nextPageToken,
      totalEstimate: data.resultSizeEstimate,
      currentPage: data.messages?.length || 0,
      filters: {
        query,
        labelIds,
        maxResults,
        includeSpamTrash
      }
    })

  } catch (error) {
    console.error('Gmail Messages API Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST ENDPOINT - Get detailed message content
 * 
 * Usage: Get full message details including content, headers, attachments
 * Body: { messageIds: ["msg123", "msg456"], format: "full" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, messageIds, format = 'full' } = body

    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return Response.json({ 
        error: 'messageIds array is required' 
      }, { status: 400 })
    }

    // Limit batch size to prevent timeouts
    if (messageIds.length > 50) {
      return Response.json({ 
        error: 'Cannot fetch more than 50 messages at once' 
      }, { status: 400 })
    }

    // STEP 1: Get OAuth access token from database
    console.log(`[GMAIL-MESSAGES-POST] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[GMAIL-MESSAGES-POST] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Gmail not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 1: Fetch detailed message data for each message ID
    // Note: Gmail API doesn't have batch get, so we need multiple requests
    const messagePromises = messageIds.map(async (messageId: string) => {
      try {
        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=${format}`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        )
        
        if (response.ok) {
          return await response.json()
        } else {
          return { id: messageId, error: 'Failed to fetch' }
        }
      } catch (error) {
        return { id: messageId, error: 'Request failed' }
      }
    })

    // STEP 2: Wait for all message fetches to complete
    const messages = await Promise.all(messagePromises)

    // STEP 3: Transform to plugin-friendly format
    const processedMessages = messages.map((message: GmailMessageDetailResponse) => {
      if ('error' in message) {
        return message // Return error as-is
      }

      // Extract useful header information
      const headers = message.payload?.headers || []
      const fromHeader = headers.find(h => h.name === 'From')
      const toHeader = headers.find(h => h.name === 'To')
      const subjectHeader = headers.find(h => h.name === 'Subject')
      const dateHeader = headers.find(h => h.name === 'Date')

      // Extract message content (basic text)
      let textContent = ''
      let htmlContent = ''
      
      if (message.payload?.body?.data) {
        // Simple message with body in main payload
        textContent = Buffer.from(message.payload.body.data, 'base64').toString()
      } else if (message.payload?.parts) {
        // Multipart message - find text and HTML parts
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            textContent = Buffer.from(part.body.data, 'base64').toString()
          } else if (part.mimeType === 'text/html' && part.body?.data) {
            htmlContent = Buffer.from(part.body.data, 'base64').toString()
          }
        }
      }

      return {
        id: message.id,
        threadId: message.threadId,
        snippet: message.snippet,
        labels: message.labelIds,
        size: message.sizeEstimate,
        date: dateHeader?.value,
        from: fromHeader?.value,
        to: toHeader?.value,
        subject: subjectHeader?.value,
        textContent: textContent.substring(0, 5000), // Limit content size
        hasHtml: !!htmlContent,
        internalDate: new Date(parseInt(message.internalDate)).toISOString()
      }
    })

    return Response.json({
      success: true,
      messages: processedMessages,
      total: processedMessages.length,
      errors: processedMessages.filter(m => 'error' in m).length
    })

  } catch (error) {
    console.error('Gmail Message Details Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}