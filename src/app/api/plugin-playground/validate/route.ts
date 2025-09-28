import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const directory = searchParams.get('dir');
    
    if (!directory) {
      return NextResponse.json(
        { error: 'Directory path is required (?dir=/path/to/plugin)' }, 
        { status: 400 }
      );
    }

    const validationResult = await validatePluginStructure(directory);
    return NextResponse.json(validationResult);

  } catch (error) {
    console.error('[PLUGIN-PLAYGROUND] Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate plugin structure', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}

async function validatePluginStructure(directory: string) {
  const result = {
    valid: true,
    issues: [] as string[],
    suggestions: [] as string[],
    files: {} as Record<string, boolean>,
    structure: {
      hasPublicDir: false,
      hasIndexHtml: false,
      hasScript: false,
      hasStyles: false,
      hasPackageJson: false
    },
    zipPreview: [] as string[]
  };

  const resolvedDir = path.resolve(directory);
  
  try {
    // Check if directory exists
    await fs.access(resolvedDir);
  } catch {
    result.valid = false;
    result.issues.push('Directory does not exist');
    return result;
  }

  // Check directory structure
  try {
    const publicDirPath = path.join(resolvedDir, 'public');
    await fs.access(publicDirPath);
    result.structure.hasPublicDir = true;
  } catch {
    // Check if files are in root
    result.suggestions.push('Consider organizing files in a public/ directory for better structure');
  }

  // Required files to check (both public/ and root)
  const filesToCheck = [
    { path: 'public/index.html', key: 'public/index.html', required: true, desc: 'Main plugin HTML file' },
    { path: 'index.html', key: 'index.html', required: false, desc: 'Alternative main HTML file' },
    { path: 'public/script.js', key: 'public/script.js', required: true, desc: 'Plugin JavaScript code' },
    { path: 'script.js', key: 'script.js', required: false, desc: 'Alternative script file' },
    { path: 'public/styles.css', key: 'public/styles.css', required: true, desc: 'Plugin CSS styles' },
    { path: 'styles.css', key: 'styles.css', required: false, desc: 'Alternative styles file' },
    { path: 'package.json', key: 'package.json', required: true, desc: 'Plugin metadata and dependencies' },
    { path: 'metadata.json', key: 'metadata.json', required: false, desc: 'MetricsHub plugin metadata' },
    { path: 'README.md', key: 'README.md', required: false, desc: 'Plugin documentation' }
  ];

  // Check all files
  for (const file of filesToCheck) {
    const filePath = path.join(resolvedDir, file.path);
    try {
      const stats = await fs.stat(filePath);
      result.files[file.key] = true;
      result.zipPreview.push(`${file.path} (${stats.size} bytes)`);
      
      // Update structure flags
      if (file.path === 'public/index.html' || file.path === 'index.html') {
        result.structure.hasIndexHtml = true;
      }
      if (file.path === 'public/script.js' || file.path === 'script.js') {
        result.structure.hasScript = true;
      }
      if (file.path === 'public/styles.css' || file.path === 'styles.css') {
        result.structure.hasStyles = true;
      }
      if (file.path === 'package.json') {
        result.structure.hasPackageJson = true;
      }
    } catch {
      result.files[file.key] = false;
      if (file.required) {
        // Only mark as invalid if no alternative exists
        const alternatives = filesToCheck.filter(f => 
          f.desc === file.desc && f.key !== file.key
        );
        const hasAlternative = alternatives.some(alt => result.files[alt.key]);
        
        if (!hasAlternative) {
          result.issues.push(`Missing required file: ${file.path}`);
        }
      }
    }
  }

  // Check if we have main files (either in public/ or root)
  if (!result.structure.hasIndexHtml) {
    result.valid = false;
    result.issues.push('Missing index.html file (checked both public/ and root)');
  }
  
  if (!result.structure.hasScript) {
    result.issues.push('Missing script.js file (recommended for functionality)');
  }
  
  if (!result.structure.hasStyles) {
    result.issues.push('Missing styles.css file (recommended for styling)');
  }
  
  if (!result.structure.hasPackageJson) {
    result.valid = false;
    result.issues.push('Missing package.json file');
  }

  // Generate suggestions based on structure
  if (!result.structure.hasPublicDir && result.structure.hasIndexHtml) {
    result.suggestions.push('✅ Files found in root directory - this works but consider using public/ for better organization');
  }

  if (result.structure.hasPublicDir && result.structure.hasIndexHtml) {
    result.suggestions.push('✅ Great! Files are properly organized in public/ directory');
  }

  // Check package.json content if it exists
  if (result.files['package.json']) {
    try {
      const packageJsonPath = path.join(resolvedDir, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageData = JSON.parse(packageContent);
      
      if (!packageData.name) {
        result.issues.push('package.json missing "name" field');
      }
      if (!packageData.version) {
        result.issues.push('package.json missing "version" field');
      }
      if (!packageData.description) {
        result.suggestions.push('Consider adding "description" field to package.json');
      }
    } catch (error) {
      result.issues.push('package.json is not valid JSON');
    }
  }

  // Generate ZIP structure preview
  if (result.zipPreview.length === 0) {
    result.zipPreview.push('No files found');
  }

  // Check for MetricsHub-specific configuration
  if (result.files['package.json']) {
    try {
      const packageJsonPath = path.join(resolvedDir, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageData = JSON.parse(packageContent);
      
      if (packageData.metricshub) {
        result.suggestions.push('✅ MetricsHub configuration found in package.json');
        
        // Check MetricsHub-specific fields
        if (!packageData.metricshub.displayName) {
          result.suggestions.push('Consider adding "displayName" to metricshub config');
        }
        if (!packageData.metricshub.category) {
          result.suggestions.push('Consider adding "category" to metricshub config');
        }
        if (packageData.metricshub.execution_type !== 'iframe') {
          result.issues.push('execution_type should be "iframe" for playground plugins');
        }
      } else {
        result.suggestions.push('Consider adding metricshub configuration to package.json');
      }
    } catch (error) {
      // Already handled above
    }
  }

  // Check for common dependencies
  const commonDeps = ['jquery', 'bootstrap', 'datatables.net'];
  const hasCommonDeps = commonDeps.some(dep => 
    result.files['package.json'] && JSON.stringify(result.files).includes(dep)
  );
  
  if (!hasCommonDeps) {
    result.suggestions.push('Consider using common UI libraries like jQuery or Bootstrap');
  }

  // Final recommendations
  if (result.valid) {
    result.suggestions.push('🎉 Plugin structure is valid and ready for development!');
    result.suggestions.push('Use the playground to test your plugin with mock data');
    result.suggestions.push('Run dependency check to ensure all packages are available');
  } else {
    result.suggestions.push('❌ Please fix the issues above before using the playground');
    result.suggestions.push('Use the plugin generator to create a proper structure');
  }

  // Add development metadata
  const developmentInfo = {
    timestamp: Date.now(),
    playgroundUrl: `/api/plugin-playground/index.html?dir=${encodeURIComponent(resolvedDir)}`,
    dependenciesUrl: `/api/plugin-playground/dependencies?dir=${encodeURIComponent(resolvedDir)}`,
    estimatedSize: result.zipPreview.reduce((total, file) => {
      const match = file.match(/\((\d+)\s*bytes\)/);
      return total + (match && match[1] ? parseInt(match[1]) : 0);
    }, 0)
  };

  return { ...result, development: developmentInfo };
}