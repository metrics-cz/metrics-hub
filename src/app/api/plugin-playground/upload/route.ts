import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

export async function POST(request: NextRequest) {
  try {
    console.log('[PLUGIN-PLAYGROUND] Upload request received');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('[PLUGIN-PLAYGROUND] Form data processed, file:', file ? `${file.name} (${file.size} bytes)` : 'null');

    if (!file) {
      console.log('[PLUGIN-PLAYGROUND] ERROR: No file provided in form data');
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided',
        details: 'FormData did not contain a file field'
      }, { status: 400 });
    }

    if (!file.name.endsWith('.zip')) {
      console.log(`[PLUGIN-PLAYGROUND] ERROR: Invalid file extension: ${file.name}`);
      return NextResponse.json({ 
        success: false, 
        error: 'Only .zip files are allowed',
        details: `File "${file.name}" does not have .zip extension`
      }, { status: 400 });
    }

    // Create unique directory for this upload
    const uploadId = crypto.randomUUID();
    const uploadDir = path.join('/tmp', 'plugin-playground-uploads', uploadId);
    const zipPath = path.join(uploadDir, 'plugin.zip');

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Save uploaded ZIP file
    const bytes = await file.arrayBuffer();
    await fs.writeFile(zipPath, Buffer.from(bytes));

    console.log(`[PLUGIN-PLAYGROUND] ZIP uploaded: ${zipPath} (${file.size} bytes)`);

    // Extract ZIP contents
    const extractedDir = path.join(uploadDir, 'extracted');
    await fs.mkdir(extractedDir, { recursive: true });

    try {
      const zip = new AdmZip(Buffer.from(bytes));
      const zipEntries = zip.getEntries();
      
      console.log(`[PLUGIN-PLAYGROUND] Extracting ${zipEntries.length} files...`);
      
      // Extract all files
      const extractedFiles: string[] = [];
      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const filePath = path.join(extractedDir, entry.entryName);
          const fileDir = path.dirname(filePath);
          
          // Ensure directory exists
          await fs.mkdir(fileDir, { recursive: true });
          
          // Write file
          await fs.writeFile(filePath, entry.getData());
          extractedFiles.push(entry.entryName);
          console.log(`[PLUGIN-PLAYGROUND] Extracted: ${entry.entryName}`);
        }
      }

      // Validate plugin structure
      const hasPublicIndex = extractedFiles.some(f => f === 'public/index.html' || f.endsWith('/public/index.html'));
      const hasRootIndex = extractedFiles.some(f => f === 'index.html');
      const hasPackageJson = extractedFiles.some(f => f === 'package.json' || f.endsWith('/package.json'));

      if (!hasPublicIndex && !hasRootIndex) {
        return NextResponse.json({
          success: false,
          error: 'Invalid plugin structure - no index.html found',
          details: 'Plugin must contain either public/index.html or index.html in the root'
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        extractedPath: extractedDir,
        uploadId: uploadId,
        files: extractedFiles,
        structure: {
          hasPublicIndex,
          hasRootIndex,
          hasPackageJson,
          totalFiles: extractedFiles.length
        },
        message: `Plugin "${file.name}" uploaded and extracted successfully (${extractedFiles.length} files)`
      });

    } catch (zipError) {
      console.error('[PLUGIN-PLAYGROUND] ZIP extraction failed:', zipError);
      return NextResponse.json({
        success: false,
        error: 'ZIP extraction failed',
        details: `Failed to process ZIP file "${file.name}": ${zipError instanceof Error ? zipError.message : String(zipError)}`,
        zipError: zipError instanceof Error ? zipError.message : String(zipError)
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[PLUGIN-PLAYGROUND] Upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Upload failed',
      details: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

