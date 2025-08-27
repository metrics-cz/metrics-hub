import { NextRequest } from 'next/server'
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens'

/**
 * GOOGLE DOCS API ROUTE
 * 
 * Purpose: Access Google Docs documents for content management and automation
 * What Google Docs API provides:
 * - Document content and structure
 * - Text formatting, styles, and layout
 * - Comments, suggestions, and revisions
 * - Document creation and editing
 * - Template management
 * 
 * Use cases for plugins:
 * - Content generation and automation
 * - Document templates and standardization
 * - Report generation from data
 * - Collaborative content workflows
 * - Document analysis and extraction
 */

interface GoogleDocsRequest {
  companyId: string           // Company ID to get OAuth tokens for
  documentId: string          // Google Docs document ID
  includeContent?: boolean    // Whether to include full document content
  suggestionsViewMode?: 'PREVIEW_SUGGESTIONS_ACCEPTED' | 'PREVIEW_WITHOUT_SUGGESTIONS'
}

interface GoogleDocsCreateRequest {
  companyId: string          // Company ID to get OAuth tokens for
  title: string              // Document title
  content?: string           // Initial content (plain text)
  folderId?: string         // Parent folder ID in Drive
}

interface GoogleDocsResponse {
  documentId: string
  title: string
  body: {
    content: Array<{
      paragraph?: {
        elements: Array<{
          textRun?: {
            content: string
            textStyle?: {
              bold?: boolean
              italic?: boolean
              underline?: boolean
              fontSize?: { magnitude: number, unit: string }
              foregroundColor?: { color: { rgbColor: any } }
            }
          }
        }>
        paragraphStyle?: {
          headingId?: string
          namedStyleType?: string  // NORMAL_TEXT, HEADING_1, HEADING_2, etc.
        }
      }
      table?: {
        rows: number
        columns: number
        tableRows: Array<{
          tableCells: Array<{
            content: any[]
          }>
        }>
      }
    }>
  }
  revisionId: string
  suggestionsViewMode: string
}

/**
 * GET ENDPOINT - Fetch Google Docs document
 * 
 * URL: /api/plugins/google/docs?documentId=1ABC2DEF3GHI&includeContent=true
 * Returns: Document metadata and content
 */
export async function GET(request: NextRequest) {
  try {
    // STEP 1: Extract query parameters
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const documentId = searchParams.get('documentId')
    const includeContent = searchParams.get('includeContent') === 'true'
    const suggestionsViewMode = searchParams.get('suggestionsViewMode') || 'PREVIEW_SUGGESTIONS_ACCEPTED'
    
    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }
    if (!documentId) {
      return Response.json({ 
        error: 'documentId is required' 
      }, { status: 400 })
    }

    // STEP 2: Get OAuth access token from database
    console.log(`[DOCS] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[DOCS] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Docs not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 2: Build API request URL
    const queryParams = new URLSearchParams()
    if (suggestionsViewMode) {
      queryParams.append('suggestionsViewMode', suggestionsViewMode)
    }

    // STEP 3: Make API call to Google Docs
    const response = await fetch(
      `https://docs.googleapis.com/v1/documents/${documentId}?${queryParams}`,
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
        error: 'Google Docs API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 4: Parse Google Docs response
    const data: GoogleDocsResponse = await response.json()

    // STEP 5: Transform to plugin-friendly format
    let plainText = ''
    let formattedContent: any[] = []

    if (includeContent && data.body?.content) {
      // Extract plain text and formatted content
      for (const element of data.body.content) {
        if (element.paragraph) {
          let paragraphText = ''
          const paragraphElements: any[] = []

          for (const textElement of element.paragraph.elements || []) {
            if (textElement.textRun) {
              const text = textElement.textRun.content
              paragraphText += text
              
              paragraphElements.push({
                text,
                formatting: {
                  bold: textElement.textRun.textStyle?.bold || false,
                  italic: textElement.textRun.textStyle?.italic || false,
                  underline: textElement.textRun.textStyle?.underline || false,
                  fontSize: textElement.textRun.textStyle?.fontSize?.magnitude || null,
                  color: textElement.textRun.textStyle?.foregroundColor?.color?.rgbColor || null
                }
              })
            }
          }

          plainText += paragraphText
          formattedContent.push({
            type: 'paragraph',
            style: element.paragraph.paragraphStyle?.namedStyleType || 'NORMAL_TEXT',
            headingId: element.paragraph.paragraphStyle?.headingId,
            text: paragraphText.trim(),
            elements: paragraphElements
          })
        } else if (element.table) {
          // Handle table content
          const tableData: any[] = []
          for (const row of element.table.tableRows || []) {
            const rowData: string[] = []
            for (const cell of row.tableCells || []) {
              // Extract text from table cell (simplified)
              let cellText = ''
              if (cell.content) {
                // This would need more complex parsing similar to paragraphs
                cellText = 'Table cell content' // Simplified for now
              }
              rowData.push(cellText)
            }
            tableData.push(rowData)
          }

          formattedContent.push({
            type: 'table',
            rows: element.table.rows,
            columns: element.table.columns,
            data: tableData
          })
        }
      }
    }

    return Response.json({
      success: true,
      document: {
        id: data.documentId,
        title: data.title,
        revisionId: data.revisionId,
        suggestionsViewMode: data.suggestionsViewMode,
        plainText: plainText.trim(),
        formattedContent: includeContent ? formattedContent : null,
        wordCount: plainText.trim().split(/\s+/).length,
        characterCount: plainText.length
      }
    })

  } catch (error) {
    console.error('Google Docs API Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST ENDPOINT - Create new Google Docs document
 * 
 * Usage: Create new documents from templates or with initial content
 * Body: { title: "My Document", content: "Initial text content", folderId: "folder123" }
 */
export async function POST(request: NextRequest) {
  try {
    const body: GoogleDocsCreateRequest = await request.json()
    const { companyId, title, content, folderId } = body

    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }
    if (!title) {
      return Response.json({ 
        error: 'title is required' 
      }, { status: 400 })
    }

    // STEP 1: Get OAuth access token from database
    console.log(`[DOCS-CREATE] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[DOCS-CREATE] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Docs not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 1: Create the document
    const createResponse = await fetch(
      'https://docs.googleapis.com/v1/documents',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title
        })
      }
    )

    if (!createResponse.ok) {
      const error = await createResponse.json()
      return Response.json({ 
        error: 'Failed to create document', 
        details: error 
      }, { status: createResponse.status })
    }

    const newDoc = await createResponse.json()

    // STEP 2: Add initial content if provided
    if (content) {
      try {
        await fetch(
          `https://docs.googleapis.com/v1/documents/${newDoc.documentId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [{
                insertText: {
                  location: { index: 1 }, // Insert at beginning of document
                  text: content
                }
              }]
            })
          }
        )
      } catch (contentError) {
        console.error('Failed to add initial content:', contentError)
        // Document was created but content addition failed
      }
    }

    // STEP 3: Move to specific folder if requested
    if (folderId) {
      try {
        // Use Drive API to move the document to the specified folder
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${newDoc.documentId}?addParents=${folderId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
      } catch (moveError) {
        console.error('Failed to move document to folder:', moveError)
        // Document was created but move failed
      }
    }

    return Response.json({
      success: true,
      document: {
        id: newDoc.documentId,
        title: newDoc.title,
        revisionId: newDoc.revisionId,
        webViewLink: `https://docs.google.com/document/d/${newDoc.documentId}/edit`,
        folderId: folderId || null
      }
    })

  } catch (error) {
    console.error('Google Docs Create Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * PUT ENDPOINT - Update existing Google Docs document
 * 
 * Usage: Update document content, formatting, or structure
 * Body: { documentId: "doc123", operations: [...] }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, documentId, operations } = body

    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }
    if (!documentId || !operations || !Array.isArray(operations)) {
      return Response.json({ 
        error: 'documentId and operations array are required' 
      }, { status: 400 })
    }

    // STEP 1: Get OAuth access token from database
    console.log(`[DOCS-UPDATE] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[DOCS-UPDATE] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Docs not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 1: Execute batch update operations
    const response = await fetch(
      `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: operations
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Google Docs batch update error', 
        details: error 
      }, { status: response.status })
    }

    const result = await response.json()

    return Response.json({
      success: true,
      documentId,
      result,
      operationsExecuted: operations.length
    })

  } catch (error) {
    console.error('Google Docs Update Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}