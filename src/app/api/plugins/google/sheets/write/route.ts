import { NextRequest } from 'next/server'
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens'

/**
 * GOOGLE SHEETS WRITE API ROUTE
 * 
 * Purpose: Write/update data in Google Sheets spreadsheets
 * Why needed: Plugins need to export reports, save data, update records in spreadsheets
 * 
 * What you can write:
 * - Single cell values
 * - Ranges of cells
 * - Append new rows to existing data
 * - Update existing rows
 * - Clear cell contents
 * 
 * Write modes:
 * - UPDATE: Update existing cells only
 * - APPEND: Add new rows after existing data
 * - OVERWRITE: Replace all data in range
 */

interface GoogleSheetsWriteRequest {
  companyId: string           // Company ID to get OAuth tokens for
  spreadsheetId: string        // Spreadsheet ID from URL
  range: string               // Where to write (e.g., "Sheet1!A1:C3")
  values: string[][]          // 2D array of values to write
  valueInputOption?: 'RAW' | 'USER_ENTERED'  // How to interpret values
  insertDataOption?: 'OVERWRITE' | 'INSERT_ROWS'  // For append operations
  responseValueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE'
}

interface GoogleSheetsAppendRequest {
  companyId: string           // Company ID to get OAuth tokens for
  spreadsheetId: string
  range: string               // Sheet name or range where to append
  values: string[][]          // Data to append as new rows
  valueInputOption?: 'RAW' | 'USER_ENTERED'
  insertDataOption?: 'OVERWRITE' | 'INSERT_ROWS'
}

interface GoogleSheetsClearRequest {
  companyId: string           // Company ID to get OAuth tokens for
  spreadsheetId: string
  range: string               // Range to clear
}

/**
 * PUT ENDPOINT - Update specific range with new data
 * 
 * Usage: Replace data in specific cells
 * Body: { 
 *   spreadsheetId: "ABC123", 
 *   range: "Sheet1!A1:C3", 
 *   values: [["Name", "Age", "City"], ["John", "25", "NYC"]] 
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body: GoogleSheetsWriteRequest = await request.json()
    const { 
      companyId,
      spreadsheetId, 
      range, 
      values, 
      valueInputOption = 'USER_ENTERED',
      responseValueRenderOption = 'FORMATTED_VALUE'
    } = body

    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }
    if (!spreadsheetId || !range || !values) {
      return Response.json({ 
        error: 'spreadsheetId, range, and values are required' 
      }, { status: 400 })
    }

    // STEP 1: Get OAuth access token from database
    console.log(`[SHEETS-WRITE] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[SHEETS-WRITE] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Sheets not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 1: Prepare the update request
    const updateBody = {
      values: values,
      majorDimension: 'ROWS'  // Data organized by rows
    }

    // STEP 2: Make API call to update the range
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=${valueInputOption}&responseValueRenderOption=${responseValueRenderOption}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateBody)
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Google Sheets API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 3: Parse response and return success info
    const data = await response.json()

    return Response.json({
      success: true,
      spreadsheetId: data.spreadsheetId,
      updatedRange: data.updatedRange,
      updatedRows: data.updatedRows,
      updatedColumns: data.updatedColumns,
      updatedCells: data.updatedCells,
      updatedData: data.updatedData
    })

  } catch (error) {
    console.error('Google Sheets Update Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST ENDPOINT - Append new rows to spreadsheet
 * 
 * Usage: Add new data to the end of existing data
 * Body: { 
 *   spreadsheetId: "ABC123", 
 *   range: "Sheet1!A:C", 
 *   values: [["New Name", "30", "LA"], ["Another", "35", "SF"]] 
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: GoogleSheetsAppendRequest = await request.json()
    const { 
      companyId,
      spreadsheetId, 
      range, 
      values, 
      valueInputOption = 'USER_ENTERED',
      insertDataOption = 'INSERT_ROWS'
    } = body

    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }
    if (!spreadsheetId || !range || !values) {
      return Response.json({ 
        error: 'spreadsheetId, range, and values are required' 
      }, { status: 400 })
    }

    // STEP 1: Get OAuth access token from database
    console.log(`[SHEETS-APPEND] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[SHEETS-APPEND] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Sheets not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 1: Prepare append request
    const appendBody = {
      values: values,
      majorDimension: 'ROWS'
    }

    // STEP 2: Use the append endpoint (different from update)
    // This automatically finds the last row with data and adds after it
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=${valueInputOption}&insertDataOption=${insertDataOption}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appendBody)
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Google Sheets API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 3: Parse response
    const data = await response.json()

    return Response.json({
      success: true,
      spreadsheetId: data.spreadsheetId,
      tableRange: data.tableRange,        // Range of the entire table
      updatedRange: data.updates.updatedRange,  // Range where new data was added
      updatedRows: data.updates.updatedRows,
      updatedColumns: data.updates.updatedColumns,
      updatedCells: data.updates.updatedCells
    })

  } catch (error) {
    console.error('Google Sheets Append Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * DELETE ENDPOINT - Clear contents of specified range
 * 
 * Usage: Remove data from cells (doesn't delete rows/columns, just clears content)
 * Body: { spreadsheetId: "ABC123", range: "Sheet1!A1:C10" }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body: GoogleSheetsClearRequest = await request.json()
    const { companyId, spreadsheetId, range } = body

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

    // STEP 1: Get OAuth access token from database
    console.log(`[SHEETS-CLEAR] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[SHEETS-CLEAR] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Sheets not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 1: Use the clear endpoint to remove cell contents
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`,
      {
        method: 'POST',  // Clear uses POST method
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Empty body for clear operation
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Google Sheets API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 2: Parse response
    const data = await response.json()

    return Response.json({
      success: true,
      spreadsheetId: data.spreadsheetId,
      clearedRange: data.clearedRange
    })

  } catch (error) {
    console.error('Google Sheets Clear Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}