import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { 
  createErrorResponse, 
  logError, 
  CustomApiError 
} from '@/lib/error-handler';

interface DependencyInfo {
  name: string;
  version?: string;
  found: boolean;
  path?: string;
  size?: number;
  scripts?: string[];
  styles?: string[];
  issues?: string[];
}

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  metricshub?: {
    displayName?: string;
    category?: string;
    permissions?: string[];
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const directory = searchParams.get('dir');
    
    if (!directory) {
      return createErrorResponse(new CustomApiError(
        'Directory path is required (?dir=/path/to/plugin)', 
        'MISSING_DIR_PARAM', 
        400
      ));
    }

    // Security: validate directory path
    const resolvedDir = path.resolve(directory);
    if (!resolvedDir.includes('/home/') && !resolvedDir.includes('/tmp/')) {
      return createErrorResponse(new CustomApiError(
        'Invalid directory path - must be in allowed locations', 
        'INVALID_DIR_PATH', 
        400
      ));
    }

    const dependencyAnalysis = await analyzeDependencies(resolvedDir);
    
    return NextResponse.json({
      success: true,
      pluginDir: resolvedDir,
      timestamp: Date.now(),
      ...dependencyAnalysis
    });

  } catch (error) {
    console.error('[PLUGIN-PLAYGROUND] Dependencies analysis error:', error);
    logError(error, 'Plugin playground dependency analysis');
    return createErrorResponse(error);
  }
}

async function analyzeDependencies(pluginDir: string) {
  const result = {
    dependencies: [] as DependencyInfo[],
    packageInfo: null as PackageJson | null,
    htmlScripts: [] as string[],
    nodeModulesStatus: {
      exists: false,
      path: '',
      packages: [] as string[]
    },
    recommendations: [] as string[],
    totalSize: 0
  };

  try {
    // Check if directory exists
    await fs.access(pluginDir);
  } catch {
    throw new CustomApiError(
      'Plugin directory does not exist', 
      'DIR_NOT_FOUND', 
      404,
      { pluginDir }
    );
  }

  // Analyze package.json
  try {
    const packageJsonPath = path.join(pluginDir, 'package.json');
    const packageContent = await fs.readFile(packageJsonPath, 'utf8');
    result.packageInfo = JSON.parse(packageContent);
    
    console.log('Found package.json:', result.packageInfo?.name);
  } catch (error) {
    console.log('No valid package.json found');
    result.recommendations.push('Create a package.json file to define dependencies');
  }

  // Analyze HTML script references
  try {
    const htmlPath = path.join(pluginDir, 'public', 'index.html');
    let htmlContent: string;
    
    try {
      htmlContent = await fs.readFile(htmlPath, 'utf8');
    } catch (e) {
      // Try root directory
      const rootHtmlPath = path.join(pluginDir, 'index.html');
      htmlContent = await fs.readFile(rootHtmlPath, 'utf8');
    }
    
    // Extract script sources
    const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = scriptRegex.exec(htmlContent)) !== null) {
      if (match[1]) {
        result.htmlScripts.push(match[1]);
      }
    }
    
    console.log('Found HTML script references:', result.htmlScripts);
  } catch (error) {
    console.log('No HTML file found for script analysis');
  }

  // Check node_modules directory
  const possibleNodeModulesPaths = [
    path.join(pluginDir, 'node_modules'),
    path.join(pluginDir, 'public', 'node_modules')
  ];

  for (const nodeModulesPath of possibleNodeModulesPaths) {
    try {
      await fs.access(nodeModulesPath);
      result.nodeModulesStatus.exists = true;
      result.nodeModulesStatus.path = nodeModulesPath;
      
      // List installed packages
      const packages = await fs.readdir(nodeModulesPath);
      result.nodeModulesStatus.packages = packages.filter(pkg => 
        !pkg.startsWith('.') && !pkg.startsWith('@')
      );
      
      console.log(`Found node_modules at: ${nodeModulesPath} with ${packages.length} packages`);
      break;
    } catch (e) {
      // Continue to next path
    }
  }

  // Analyze individual dependencies
  const allDeps = new Set<string>();
  
  // Add dependencies from package.json
  if (result.packageInfo) {
    Object.keys(result.packageInfo.dependencies || {}).forEach(dep => allDeps.add(dep));
    Object.keys(result.packageInfo.devDependencies || {}).forEach(dep => allDeps.add(dep));
  }
  
  // Add dependencies detected from HTML
  result.htmlScripts.forEach(script => {
    const nodeModulesMatch = script.match(/node_modules\/([^\/]+)/);
    if (nodeModulesMatch && nodeModulesMatch[1]) {
      allDeps.add(nodeModulesMatch[1]);
    }
  });

  // Analyze each dependency
  for (const depName of allDeps) {
    const depInfo: DependencyInfo = {
      name: depName,
      found: false,
      issues: []
    };

    // Check if package exists in node_modules
    if (result.nodeModulesStatus.exists) {
      const depPath = path.join(result.nodeModulesStatus.path, depName);
      try {
        await fs.access(depPath);
        depInfo.found = true;
        depInfo.path = depPath;
        
        // Get package info
        try {
          const depPackageJsonPath = path.join(depPath, 'package.json');
          const depPackageContent = await fs.readFile(depPackageJsonPath, 'utf8');
          const depPackageInfo = JSON.parse(depPackageContent);
          depInfo.version = depPackageInfo.version;
        } catch (e) {
          depInfo.issues?.push('No package.json found in dependency');
        }
        
        // Calculate size (approximate)
        try {
          const stats = await fs.stat(depPath);
          if (stats.isDirectory()) {
            const files = await getDirectorySize(depPath);
            depInfo.size = files.totalSize;
            result.totalSize += files.totalSize;
          }
        } catch (e) {
          console.log(`Could not calculate size for ${depName}`);
        }
        
        // Check for common file patterns
        depInfo.scripts = await findFilesInPackage(depPath, [
          '*.js', '*.min.js', 'dist/*.js', 'js/*.js'
        ]);
        
        depInfo.styles = await findFilesInPackage(depPath, [
          '*.css', '*.min.css', 'dist/*.css', 'css/*.css'
        ]);
        
      } catch (e) {
        depInfo.found = false;
        depInfo.issues?.push(`Package not found in node_modules`);
      }
    } else {
      depInfo.issues?.push('No node_modules directory found');
    }

    // Check if dependency is referenced in HTML but missing
    const isReferencedInHtml = result.htmlScripts.some(script => 
      script.includes(`node_modules/${depName}`)
    );
    
    if (isReferencedInHtml && !depInfo.found) {
      depInfo.issues?.push('Referenced in HTML but missing from node_modules');
    }

    result.dependencies.push(depInfo);
  }

  // Generate recommendations
  if (!result.nodeModulesStatus.exists) {
    result.recommendations.push('Run "npm install" to install dependencies');
  }

  const missingDeps = result.dependencies.filter(d => !d.found);
  if (missingDeps.length > 0) {
    result.recommendations.push(
      `Install missing dependencies: ${missingDeps.map(d => d.name).join(', ')}`
    );
  }

  if (result.htmlScripts.length === 0) {
    result.recommendations.push('Consider adding JavaScript dependencies to your HTML file');
  }

  const unusedDeps = result.dependencies.filter(d => 
    d.found && !result.htmlScripts.some(script => script.includes(d.name))
  );
  
  if (unusedDeps.length > 0) {
    result.recommendations.push(
      `Dependencies installed but not referenced in HTML: ${unusedDeps.map(d => d.name).join(', ')}`
    );
  }

  return result;
}

async function getDirectorySize(dirPath: string): Promise<{ totalSize: number; fileCount: number }> {
  let totalSize = 0;
  let fileCount = 0;

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isFile()) {
        try {
          const stats = await fs.stat(itemPath);
          totalSize += stats.size;
          fileCount++;
        } catch (e) {
          // Skip files we can't access
        }
      } else if (item.isDirectory() && !item.name.startsWith('.')) {
        // Recursively calculate directory size (limit depth to avoid infinite loops)
        const subDirSize = await getDirectorySize(itemPath);
        totalSize += subDirSize.totalSize;
        fileCount += subDirSize.fileCount;
      }
    }
  } catch (error) {
    console.log(`Error calculating size for ${dirPath}:`, error instanceof Error ? error.message : String(error));
  }

  return { totalSize, fileCount };
}

async function findFilesInPackage(packagePath: string, patterns: string[]): Promise<string[]> {
  const foundFiles: string[] = [];
  
  for (const pattern of patterns) {
    try {
      // Simple pattern matching - check common directories
      const dirs = pattern.includes('/') ? [path.dirname(pattern)] : ['.'];
      const fileName = path.basename(pattern);
      
      for (const dir of dirs) {
        const searchDir = path.join(packagePath, dir);
        try {
          const files = await fs.readdir(searchDir);
          
          for (const file of files) {
            // Simple wildcard matching
            if (fileName === '*' || 
                fileName.replace('*', '').split('.').every(part => file.includes(part))) {
              foundFiles.push(path.join(dir, file).replace(/^\.\//, ''));
            }
          }
        } catch (e) {
          // Directory doesn't exist, continue
        }
      }
    } catch (e) {
      // Pattern error, continue
    }
  }
  
  return [...new Set(foundFiles)]; // Remove duplicates
}