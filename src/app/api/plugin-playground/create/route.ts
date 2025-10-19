import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { 
  createErrorResponse, 
  logError, 
  CustomApiError 
} from '@/lib/error-handler';

interface CreatePluginRequest {
  name: string;
  id: string;
  description: string;
  author: string;
  template: string;
  directory: string;
  category: string;
  permissions: string[];
}

export async function POST(request: NextRequest) {
  try {
    const config: CreatePluginRequest = await request.json();
    
    // Validate required fields
    if (!config.name || !config.template || !config.directory) {
      return createErrorResponse(new CustomApiError(
        'Missing required fields: name, template, and directory are required',
        'MISSING_REQUIRED_FIELDS',
        400,
        { config }
      ));
    }

    // Security: validate directory path
    const resolvedDir = path.resolve(config.directory);
    if (!resolvedDir.startsWith('/home/') && !resolvedDir.startsWith('/tmp/')) {
      return createErrorResponse(new CustomApiError(
        'Invalid directory path - must be in allowed locations',
        'INVALID_DIR_PATH',
        400,
        { directory: config.directory }
      ));
    }

    console.log(`Creating plugin: ${config.name} with template: ${config.template}`);
    
    // Create plugin using the CLI script
    const result = await createPluginWithCLI(config, resolvedDir);
    
    return NextResponse.json({
      success: true,
      message: 'Plugin created successfully',
      path: resolvedDir,
      config: config,
      ...(result && typeof result === 'object' ? result : {})
    });

  } catch (error) {
    console.error('[PLUGIN-PLAYGROUND] Plugin creation error:', error);
    logError(error, 'Plugin playground creation');
    return createErrorResponse(error);
  }
}

async function createPluginWithCLI(config: CreatePluginRequest, outputDir: string) {
  return new Promise((resolve, reject) => {
    // Use the CLI script we created
    const scriptPath = path.join(process.cwd(), 'scripts', 'create-plugin.js');
    
    const child = spawn('node', [scriptPath], {
      stdio: 'pipe',
      env: { ...process.env }
    });

    let output = '';
    let errors = '';

    // Send configuration to the script via stdin
    const input = [
      config.template,        // Template choice
      config.name,           // Plugin name
      config.id,             // Plugin ID
      config.description,    // Description
      config.author || 'MetricsHub Developer',  // Author
      outputDir,             // Output directory
      'y'                    // Confirm creation
    ].join('\n') + '\n';

    child.stdin.write(input);
    child.stdin.end();

    child.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[PLUGIN-CREATE] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      errors += data.toString();
      console.error(`[PLUGIN-CREATE] ${data.toString().trim()}`);
    });

    child.on('close', async (code) => {
      if (code === 0) {
        try {
          // Verify the plugin was created successfully
          await fs.access(outputDir);
          await fs.access(path.join(outputDir, 'package.json'));
          await fs.access(path.join(outputDir, 'public', 'index.html'));

          // Add any additional customizations based on the config
          await customizePlugin(outputDir, config);

          console.log(`Plugin created successfully at: ${outputDir}`);
          resolve({
            output: output,
            files: await getCreatedFiles(outputDir)
          });
        } catch (error) {
          reject(new CustomApiError(
            `Plugin creation succeeded but verification failed: ${error instanceof Error ? error.message : String(error)}`,
            'PLUGIN_VERIFICATION_FAILED',
            500,
            { output, errors, code }
          ));
        }
      } else {
        reject(new CustomApiError(
          `Plugin creation failed with exit code ${code}`,
          'PLUGIN_CREATION_FAILED',
          500,
          { output, errors, code }
        ));
      }
    });

    child.on('error', (error) => {
      reject(new CustomApiError(
        `Failed to spawn plugin creation process: ${error.message}`,
        'PROCESS_SPAWN_FAILED',
        500,
        { error: error.message }
      ));
    });
  });
}

async function customizePlugin(pluginDir: string, config: CreatePluginRequest) {
  try {
    // Update package.json with additional config
    const packageJsonPath = path.join(pluginDir, 'package.json');
    const packageContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageContent);

    // Add MetricsHub-specific metadata
    packageJson.metricshub = {
      ...packageJson.metricshub,
      displayName: config.name,
      category: config.category,
      permissions: config.permissions,
      execution_type: 'iframe',
      created: new Date().toISOString(),
      generator: 'MetricsHub Plugin Playground'
    };

    // Save updated package.json
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Create a .metricshub.json file with development metadata
    const metadataPath = path.join(pluginDir, '.metricshub.json');
    const metadata = {
      created: Date.now(),
      template: config.template,
      version: '1.0.0',
      playground: {
        lastValidated: null,
        lastRun: null,
        dependencies: [],
        issues: []
      }
    };

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Create development README
    const readmePath = path.join(pluginDir, 'README.md');
    const readmeExists = await fs.access(readmePath).then(() => true).catch(() => false);
    
    if (!readmeExists) {
      const readme = generateReadme(config);
      await fs.writeFile(readmePath, readme);
    }

    console.log('Plugin customization completed');
  } catch (error) {
    console.error('Error customizing plugin:', error);
    // Don't fail the whole process for customization errors
  }
}

function generateReadme(config: CreatePluginRequest): string {
  return `# ${config.name}

${config.description}

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start development in playground
npm run playground
\`\`\`

## Template Information

- **Template**: ${config.template}
- **Category**: ${config.category}
- **Permissions**: ${config.permissions.length > 0 ? config.permissions.join(', ') : 'None'}

## Development

This plugin was created using the MetricsHub Plugin Playground. Use the following commands:

\`\`\`bash
# Validate plugin structure
npm run validate

# Open in playground
npm run playground

# Build for deployment
npm run build
\`\`\`

## Plugin Structure

\`\`\`
${path.basename(config.directory)}/
├── public/
│   ├── index.html      # Main plugin interface
│   ├── script.js       # Plugin logic
│   └── styles.css      # Plugin styles
├── package.json        # Plugin metadata
├── .metricshub.json    # Development metadata
└── README.md          # This file
\`\`\`

## MetricsHub Integration

This plugin integrates with MetricsHub using:
- PostMessage communication for configuration
- OAuth token handling for API access
- Responsive iframe interface
- Error handling and logging

## Available APIs

${config.permissions.length > 0 ? 
`Your plugin has access to:
${config.permissions.map(perm => `- ${perm} API`).join('\n')}

Use MetricsHub proxy endpoints to avoid CORS issues:
${config.permissions.map(perm => `- \`/api/proxy/${perm}/...\``).join('\n')}
` : 
'This plugin doesn\'t require special API permissions.'}

## Deployment

1. Test thoroughly in the playground
2. Validate the plugin structure
3. Create a ZIP file of the entire plugin directory
4. Upload to MetricsHub via the admin interface

## Support

- [Plugin Development Guide](../docs/plugin-development/README.md)
- [MetricsHub API Documentation](../docs/api/)
- [Community Support](https://github.com/metrics-cz/metrics-hub/discussions)

---

Generated with MetricsHub Plugin Playground 🚀
Created: ${new Date().toISOString()}
`;
}

async function getCreatedFiles(pluginDir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function walkDir(dir: string, basePath = '') {
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dir, item.name);
        const relativePath = path.join(basePath, item.name);
        
        if (item.isFile()) {
          files.push(relativePath);
        } else if (item.isDirectory() && !item.name.startsWith('.')) {
          await walkDir(itemPath, relativePath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }
  
  await walkDir(pluginDir);
  return files.sort();
}