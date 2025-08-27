import { NextRequest } from 'next/server'
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens'

/**
 * GOOGLE DRIVE FILES API ROUTE
 * 
 * Purpose: Access files and folders in Google Drive (read-only)
 * What Drive API provides:
 * - List files and folders
 * - File metadata (name, size, modified date, permissions)
 * - File content for text files, documents
 * - Shared file information
 * - Folder structure and organization
 * 
 * Use cases for plugins:
 * - Import/export data from Drive documents
 * - Backup and sync functionality
 * - Access shared reports and assets
 * - File organization and management
 */

interface GoogleDriveFilesRequest {
  folderId?: string           // Specific folder to search in
  query?: string             // Search query (like "name contains 'report'")
  mimeType?: string          // Filter by file type
  pageSize?: number          // Max files per request (1-1000, default 100)
  pageToken?: string         // For pagination
  fields?: string            // What metadata to include
}

interface GoogleDriveFilesResponse {
  files: Array<{
    id: string                // File ID
    name: string              // File name
    mimeType: string          // MIME type (e.g., "application/pdf")
    size?: string             // File size in bytes (string format)
    createdTime: string       // ISO timestamp
    modifiedTime: string      // ISO timestamp
    parents?: string[]        // Parent folder IDs
    webViewLink?: string      // Link to view file in Drive
    webContentLink?: string   // Direct download link (if downloadable)
    owners: Array<{
      displayName: string
      emailAddress: string
    }>
    shared: boolean           // Whether file is shared
    permissions?: Array<{
      id: string
      type: string            // "user", "group", "domain", "anyone"
      role: string            // "owner", "writer", "commenter", "reader"
    }>
  }>
  nextPageToken?: string      // For getting next page
  incompleteSearch: boolean   // Whether search was complete
}

interface GoogleDriveFileContentResponse {
  // Content varies by file type - could be text, JSON, etc.
  [key: string]: any
}

/**
 * GET ENDPOINT - List files in Google Drive
 * 
 * URL Examples:
 * - /api/plugins/google/drive/files (all files)
 * - /api/plugins/google/drive/files?query=name contains 'report' (search)
 * - /api/plugins/google/drive/files?mimeType=application/pdf (only PDFs)
 * - /api/plugins/google/drive/files?folderId=1ABC2DEF3GHI (files in specific folder)
 */
export async function GET(request: NextRequest) {
  try {
    // STEP 1: Extract query parameters
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const folderId = searchParams.get('folderId')
    const query = searchParams.get('query')
    const mimeType = searchParams.get('mimeType')
    const pageSize = parseInt(searchParams.get('pageSize') || '100')
    const pageToken = searchParams.get('pageToken')

    // Validate required parameters
    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }

    // Validate pageSize
    if (pageSize > 1000) {
      return Response.json({ 
        error: 'pageSize cannot exceed 1000' 
      }, { status: 400 })
    }

    // STEP 2: Get OAuth access token from database
    console.log(`[DRIVE-FILES] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[DRIVE-FILES] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Drive not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 3: Build Drive API query
    let searchQuery = ''
    
    if (folderId) {
      searchQuery += `'${folderId}' in parents`
    }
    
    if (query) {
      searchQuery += searchQuery ? ` and ${query}` : query
    }
    
    if (mimeType) {
      searchQuery += searchQuery ? ` and mimeType='${mimeType}'` : `mimeType='${mimeType}'`
    }
    
    // Add "not trashed" to exclude deleted files
    searchQuery += searchQuery ? " and trashed=false" : "trashed=false"

    // STEP 3: Build query parameters
    const queryParams = new URLSearchParams({
      pageSize: pageSize.toString(),
      fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink,owners,shared),nextPageToken,incompleteSearch'
    })
    
    if (searchQuery) {
      queryParams.append('q', searchQuery)
    }
    if (pageToken) {
      queryParams.append('pageToken', pageToken)
    }

    // STEP 4: Make API call to Google Drive
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${queryParams}`,
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
        error: 'Google Drive API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 5: Parse Drive response
    const data: GoogleDriveFilesResponse = await response.json()

    // STEP 6: Transform to plugin-friendly format
    const files = data.files?.map(file => ({
      id: file.id,
      name: file.name,
      type: file.mimeType,
      size: file.size ? parseInt(file.size) : null,
      sizeFormatted: file.size ? formatFileSize(parseInt(file.size)) : null,
      created: file.createdTime,
      modified: file.modifiedTime,
      parentFolders: file.parents || [],
      viewLink: file.webViewLink,
      downloadLink: file.webContentLink,
      owner: file.owners?.[0]?.displayName || 'Unknown',
      ownerEmail: file.owners?.[0]?.emailAddress,
      isShared: file.shared,
      // Classify file types for easier handling
      category: categorizeFile(file.mimeType),
      isGoogleDoc: file.mimeType.startsWith('application/vnd.google-apps.'),
      canDownload: !!file.webContentLink
    })) || []

    return Response.json({
      success: true,
      files,
      nextPageToken: data.nextPageToken,
      hasMore: !!data.nextPageToken,
      totalFiles: files.length,
      searchWasComplete: !data.incompleteSearch,
      filters: {
        folderId,
        query,
        mimeType,
        pageSize
      }
    })

  } catch (error) {
    console.error('Google Drive Files API Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST ENDPOINT - Get file content or detailed metadata
 * 
 * Usage: Download file content or get detailed file information
 * Body: { fileIds: ["1ABC2DEF", "3GHI4JKL"], includeContent: true }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, fileIds, includeContent = false, exportFormat } = body

    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return Response.json({ 
        error: 'fileIds array is required' 
      }, { status: 400 })
    }

    // Limit batch size
    if (fileIds.length > 10) {
      return Response.json({ 
        error: 'Cannot process more than 10 files at once' 
      }, { status: 400 })
    }

    // STEP 1: Get OAuth access token from database
    console.log(`[DRIVE-FILES-POST] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[DRIVE-FILES-POST] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Drive not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 1: Fetch detailed metadata for each file
    const filePromises = fileIds.map(async (fileId: string) => {
      try {
        // Get file metadata
        const metadataResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?fields=*`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        )

        if (!metadataResponse.ok) {
          return { id: fileId, error: 'Failed to fetch metadata' }
        }

        const metadata = await metadataResponse.json()
        const result: any = {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size ? parseInt(metadata.size) : null,
          created: metadata.createdTime,
          modified: metadata.modifiedTime,
          description: metadata.description,
          parents: metadata.parents,
          owners: metadata.owners,
          permissions: metadata.permissions,
          shared: metadata.shared,
          viewLink: metadata.webViewLink,
          downloadLink: metadata.webContentLink
        }

        // STEP 2: Get file content if requested
        if (includeContent) {
          try {
            let contentUrl = ''
            
            if (metadata.mimeType.startsWith('application/vnd.google-apps.')) {
              // Google Workspace files need export
              const exportMimeType = exportFormat || getExportMimeType(metadata.mimeType)
              contentUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`
            } else {
              // Regular files can be downloaded directly
              contentUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
            }

            const contentResponse = await fetch(contentUrl, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            })

            if (contentResponse.ok) {
              const contentType = contentResponse.headers.get('content-type') || ''
              
              if (contentType.includes('text/') || contentType.includes('application/json')) {
                // Text content - include as string
                result.content = await contentResponse.text()
                result.contentType = contentType
              } else {
                // Binary content - provide download info only
                result.contentType = contentType
                result.contentSize = contentResponse.headers.get('content-length')
                result.contentNote = 'Binary content available via downloadLink'
              }
            }
          } catch (contentError) {
            result.contentError = 'Failed to fetch content'
          }
        }

        return result
      } catch (error) {
        return { id: fileId, error: 'Request failed' }
      }
    })

    // STEP 3: Wait for all file requests to complete
    const files = await Promise.all(filePromises)

    return Response.json({
      success: true,
      files,
      total: files.length,
      errors: files.filter(f => 'error' in f).length
    })

  } catch (error) {
    console.error('Google Drive File Content Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Helper function to categorize files
function categorizeFile(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet'
  if (mimeType.includes('document') || mimeType.includes('word')) return 'document'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation'
  if (mimeType.startsWith('text/')) return 'text'
  if (mimeType === 'application/vnd.google-apps.folder') return 'folder'
  return 'other'
}

// Helper function to get appropriate export MIME type for Google Workspace files
function getExportMimeType(googleMimeType: string): string {
  switch (googleMimeType) {
    case 'application/vnd.google-apps.document':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    case 'application/vnd.google-apps.spreadsheet':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
    case 'application/vnd.google-apps.presentation':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    default:
      return 'text/plain' // Fallback
  }
}