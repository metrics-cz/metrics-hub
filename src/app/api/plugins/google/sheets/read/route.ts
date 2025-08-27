import { NextRequest } from 'next/server'
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens'

/**
 * GOOGLE SHEETS READ API ROUTE
 * 
 * Purpose: Read data from Google Sheets spreadsheets
 * Why needed: Plugins often need to import data from spreadsheets (customer lists, product catalogs, etc.)
 * 
 * What you can read:
 * - Individual cell values
 * - Ranges of cells (like "A1:Z100") 
 * - Entire sheets or specific tabs
 * - Multiple ranges in one request
 * 
 * Google Sheets API returns data as 2D arrays (rows and columns)
 */

interface GoogleSheetsReadRequest {
  companyId: string        // Company ID to get OAuth tokens for
  spreadsheetId: string    // ID from the sheets URL (long string like "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")
  ranges: string[]         // Array of ranges like ["Sheet1!A1:Z100", "Sheet2!A:A"]
  majorDimension?: 'ROWS' | 'COLUMNS'  // How to interpret data (default: ROWS)
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA'  // How to return values
}

interface GoogleSheetsResponse {
  spreadsheetId: string
  valueRanges: Array<{
    range: string           // The actual range that was read (may differ from requested)
    majorDimension: string  // ROWS or COLUMNS  
    values: string[][]      // 2D array: [row][column] = cell value
  }>
}

/**
 * GET ENDPOINT - Read single range from spreadsheet
 * 
 * URL: /api/plugins/google/sheets/read?spreadsheetId=ABC123&range=Sheet1!A1:C10
 * Returns: Data from the specified range as a 2D array
 */
export async function GET(request: NextRequest) {
  try {
    // STEP 1: Extract parameters from URL
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const spreadsheetId = searchParams.get('spreadsheetId')
    const range = searchParams.get('range')
    const valueRenderOption = searchParams.get('valueRenderOption') || 'FORMATTED_VALUE'
    
    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }

    if (!spreadsheetId || !range) {
      return Response.json({ 
        error: 'spreadsheetId and range are required' 
      }, { status: 400 })
    }

    // STEP 2: Get OAuth access token from database
    console.log(`[SHEETS-READ] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[SHEETS-READ] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Sheets not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token
    
    // STEP 3: Make API call to Google Sheets
    // Note: This is a simple GET request (unlike Ads API which uses POST)
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=${valueRenderOption}`,
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
        error: 'Google Sheets API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 4: Parse Google Sheets response
    const data = await response.json()
    
    // STEP 5: Transform to plugin-friendly format
    // Google returns: { values: [["A1", "B1", "C1"], ["A2", "B2", "C2"]] }
    const rows = data.values || []
    
    // Helper: Convert 2D array to objects with headers
    const headers = rows[0] || []  // First row as column headers
    const dataRows = rows.slice(1) // Remaining rows as data
    
    const objectData = dataRows.map((row: string[]) => {
      const obj: Record<string, string> = {}
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '' // Handle missing cells
      })
      return obj
    })

    return Response.json({
      success: true,
      spreadsheetId,
      range: data.range, // Actual range read (may be different from requested)
      rawData: rows,     // 2D array format
      objectData,        // Array of objects with headers as keys
      rowCount: rows.length,
      columnCount: headers.length,
      headers
    })

  } catch (error) {
    console.error('Google Sheets Read API Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST ENDPOINT - Read multiple ranges or complex requests
 * 
 * Usage: Read multiple sheets/ranges in one request
 * Body: { 
 *   spreadsheetId: "ABC123", 
 *   ranges: ["Sheet1!A:C", "Sheet2!E:F"], 
 *   valueRenderOption: "FORMATTED_VALUE" 
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: GoogleSheetsReadRequest = await request.json()
    const { companyId, spreadsheetId, ranges, majorDimension, valueRenderOption } = body

    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }

    if (!spreadsheetId || !ranges || ranges.length === 0) {
      return Response.json({ 
        error: 'spreadsheetId and ranges are required' 
      }, { status: 400 })
    }

    // STEP 1: Get OAuth access token from database
    console.log(`[SHEETS-READ-POST] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[SHEETS-READ-POST] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Sheets not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 1: Build batch request for multiple ranges
    // Google Sheets allows reading multiple ranges in one API call
    const queryParams = new URLSearchParams({
      majorDimension: majorDimension || 'ROWS',
      valueRenderOption: valueRenderOption || 'FORMATTED_VALUE'
    })
    
    // Add each range as a separate query parameter
    ranges.forEach(range => {
      queryParams.append('ranges', range)
    })

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryParams}`,
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
        error: 'Google Sheets API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 2: Parse batch response
    const data: GoogleSheetsResponse = await response.json()
    
    // STEP 3: Transform each range to plugin-friendly format
    const processedRanges = data.valueRanges.map(valueRange => {
      const rows = valueRange.values || []
      const headers = rows[0] || []
      const dataRows = rows.slice(1)
      
      // Convert to objects if there are headers
      const objectData = dataRows.map((row: string[]) => {
        const obj: Record<string, string> = {}
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index] || ''
        })
        return obj
      })

      return {
        range: valueRange.range,
        rawData: rows,
        objectData: headers.length > 0 ? objectData : [], // Only create objects if headers exist
        rowCount: rows.length,
        columnCount: headers.length,
        headers
      }
    })

    return Response.json({
      success: true,
      spreadsheetId: data.spreadsheetId,
      ranges: processedRanges,
      totalRanges: processedRanges.length
    })

  } catch (error) {
    console.error('Google Sheets Batch Read Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}