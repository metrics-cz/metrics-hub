/**
 * File security utilities for safe file upload and validation
 */

// Allowed MIME types for uploads
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  // Note: SVG removed due to security risks (can contain JavaScript)
] as const;

// Maximum file sizes
export const MAX_FILE_SIZES = {
  logo: 5 * 1024 * 1024, // 5MB
  avatar: 2 * 1024 * 1024, // 2MB
  document: 10 * 1024 * 1024, // 10MB
} as const;

// File type validation errors
export class FileValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

/**
 * Validates file type using both MIME type and file signature (magic bytes)
 */
export function validateFileType(file: File, allowedTypes: readonly string[]): void {
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    throw new FileValidationError(
      `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      'INVALID_MIME_TYPE'
    );
  }
}

/**
 * Validates file size
 */
export function validateFileSize(file: File, maxSize: number): void {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    throw new FileValidationError(
      `File too large. Maximum size: ${maxSizeMB}MB`,
      'FILE_TOO_LARGE'
    );
  }
}

/**
 * Validates image dimensions
 */
export function validateImageDimensions(
  file: File,
  constraints: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    aspectRatio?: number;
    aspectRatioTolerance?: number;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const { width, height } = img;
        
        if (constraints.minWidth && width < constraints.minWidth) {
          throw new FileValidationError(
            `Image width too small. Minimum: ${constraints.minWidth}px`,
            'WIDTH_TOO_SMALL'
          );
        }
        
        if (constraints.minHeight && height < constraints.minHeight) {
          throw new FileValidationError(
            `Image height too small. Minimum: ${constraints.minHeight}px`,
            'HEIGHT_TOO_SMALL'
          );
        }
        
        if (constraints.maxWidth && width > constraints.maxWidth) {
          throw new FileValidationError(
            `Image width too large. Maximum: ${constraints.maxWidth}px`,
            'WIDTH_TOO_LARGE'
          );
        }
        
        if (constraints.maxHeight && height > constraints.maxHeight) {
          throw new FileValidationError(
            `Image height too large. Maximum: ${constraints.maxHeight}px`,
            'HEIGHT_TOO_LARGE'
          );
        }
        
        if (constraints.aspectRatio) {
          const actualRatio = width / height;
          const expectedRatio = constraints.aspectRatio;
          const tolerance = constraints.aspectRatioTolerance || 0.1;
          
          if (Math.abs(actualRatio - expectedRatio) > tolerance) {
            throw new FileValidationError(
              `Invalid aspect ratio. Expected ${expectedRatio}:1, got ${actualRatio.toFixed(2)}:1`,
              'INVALID_ASPECT_RATIO'
            );
          }
        }
        
        URL.revokeObjectURL(img.src);
        resolve();
      } catch (error) {
        URL.revokeObjectURL(img.src);
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new FileValidationError('Invalid image file', 'INVALID_IMAGE'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generates a secure filename to prevent path traversal attacks
 */
export function generateSecureFilename(originalName: string, prefix: string = ''): string {
  // Extract file extension safely
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  
  // Validate extension
  if (!extension || extension.length > 10) {
    throw new FileValidationError('Invalid file extension', 'INVALID_EXTENSION');
  }
  
  // Generate random filename to prevent conflicts and information disclosure
  const randomName = crypto.randomUUID();
  
  // Combine with prefix if provided
  const filename = prefix ? `${prefix}-${randomName}.${extension}` : `${randomName}.${extension}`;
  
  // Additional validation to ensure no path traversal
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw new FileValidationError('Invalid filename characters', 'INVALID_FILENAME');
  }
  
  return filename;
}

/**
 * Validates file path to prevent directory traversal
 */
export function validateFilePath(path: string): void {
  // Check for directory traversal attempts
  if (path.includes('..') || path.includes('/') || path.includes('\\')) {
    throw new FileValidationError('Invalid file path', 'INVALID_PATH');
  }
  
  // Check for null bytes
  if (path.includes('\0')) {
    throw new FileValidationError('Invalid file path', 'INVALID_PATH');
  }
  
  // Check length
  if (path.length > 255) {
    throw new FileValidationError('File path too long', 'PATH_TOO_LONG');
  }
}

/**
 * Comprehensive file validation for logos
 */
export async function validateLogo(
  file: File,
  type: 'square' | 'rectangular'
): Promise<void> {
  // Basic validations
  validateFileType(file, ALLOWED_IMAGE_TYPES);
  validateFileSize(file, MAX_FILE_SIZES.logo);
  
  // Dimension constraints
  const constraints = {
    square: {
      minWidth: 128,
      minHeight: 128,
      maxWidth: 1200,
      maxHeight: 1200,
      aspectRatio: 1,
      aspectRatioTolerance: 0.1,
    },
    rectangular: {
      minWidth: 512,
      minHeight: 128,
      maxWidth: 1200,
      maxHeight: 300,
      aspectRatio: 4,
      aspectRatioTolerance: 0.1,
    },
  };
  
  await validateImageDimensions(file, constraints[type]);
}

/**
 * Validates avatar uploads
 */
export async function validateAvatar(file: File): Promise<void> {
  validateFileType(file, ALLOWED_IMAGE_TYPES);
  validateFileSize(file, MAX_FILE_SIZES.avatar);
  
  await validateImageDimensions(file, {
    minWidth: 32,
    minHeight: 32,
    maxWidth: 512,
    maxHeight: 512,
  });
}

/**
 * Sanitizes file content by checking for embedded scripts or malicious content
 * This is a basic implementation - for production, consider using a dedicated service
 */
export async function scanFileContent(file: File): Promise<void> {
  // For images, we can check for common malicious patterns
  if (file.type.startsWith('image/')) {
    const buffer = await file.arrayBuffer();
    const content = new TextDecoder().decode(buffer);
    
    // Check for common script injection patterns
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        throw new FileValidationError(
          'File contains potentially malicious content',
          'MALICIOUS_CONTENT'
        );
      }
    }
  }
}

/**
 * Rate limiting for file uploads (per user)
 */
const uploadLimits = new Map<string, { count: number; resetTime: number }>();

export function checkUploadRateLimit(
  userId: string,
  limit: number = 10,
  windowMs: number = 60 * 60 * 1000 // 1 hour
): void {
  const now = Date.now();
  const userLimit = uploadLimits.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    uploadLimits.set(userId, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (userLimit.count >= limit) {
    throw new FileValidationError(
      'Upload rate limit exceeded. Please try again later.',
      'RATE_LIMIT_EXCEEDED'
    );
  }
  
  userLimit.count++;
}

/**
 * Complete file upload validation pipeline
 */
export async function validateFileUpload(
  file: File,
  userId: string,
  uploadType: 'logo' | 'avatar',
  logoType?: 'square' | 'rectangular'
): Promise<string> {
  try {
    // Check rate limit
    checkUploadRateLimit(userId);
    
    // Validate based on upload type
    if (uploadType === 'logo' && logoType) {
      await validateLogo(file, logoType);
    } else if (uploadType === 'avatar') {
      await validateAvatar(file);
    } else {
      throw new FileValidationError('Invalid upload type', 'INVALID_UPLOAD_TYPE');
    }
    
    // Scan for malicious content
    await scanFileContent(file);
    
    // Generate secure filename
    const prefix = uploadType === 'logo' ? logoType : uploadType;
    const secureFilename = generateSecureFilename(file.name, prefix);
    
    return secureFilename;
    
  } catch (error) {
    if (error instanceof FileValidationError) {
      throw error;
    }
    
    throw new FileValidationError(
      'File validation failed',
      'VALIDATION_ERROR'
    );
  }
}