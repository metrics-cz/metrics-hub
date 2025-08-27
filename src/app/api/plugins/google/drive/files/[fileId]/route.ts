import { NextRequest } from 'next/server'
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens'

/**
 * GOOGLE DRIVE SINGLE FILE API ROUTE
 * 
 * Purpose: Get metadata for a specific Google Drive file by ID
 * Why needed: Allows plugins to get detailed information about a specific file
 * 
 * What this route does:
 * 1. Gets OAuth tokens for the company
 * 2. Calls Google Drive API to get file metadata
 * 3. Returns formatted file information
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const { fileId } = await params

    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 })
    }

    if (!fileId) {
      return Response.json({ error: 'fileId is required' }, { status: 400 })
    }

    // Get OAuth tokens for this company
    const tokens = await getGoogleOAuthTokens(companyId)
    if (!tokens) {
      return Response.json({ error: 'Google Drive not connected' }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // Call Google Drive API to get file metadata
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Google Drive API Error:', errorData)
      return Response.json({ 
        error: 'Failed to fetch file from Google Drive',
        details: errorData
      }, { status: response.status })
    }

    const file = await response.json()

    return Response.json({
      success: true,
      file: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink
      }
    })

  } catch (error) {
    console.error('Google Drive single file API error:', error)
    return Response.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}