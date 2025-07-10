'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import CompanyInitialsIcon from './CompanyInitialsIcon';
import { validateFileUpload, FileValidationError } from '@/lib/file-security';
import { useAuth } from '@/components/AuthProvider';
import { useActiveCompany } from '@/lib/activeCompany';
import { isAdminOrHigher } from '@/lib/permissions';

interface LogoUploadProps {
  companyId: string;
  companyName: string;
  type: 'square' | 'rectangular';
  currentLogoUrl?: string;
  onUploadSuccess: (logoUrl: string) => void;
  onUploadError: (error: string) => void;
}

export function LogoUpload({
  companyId,
  companyName,
  type,
  currentLogoUrl,
  onUploadSuccess,
  onUploadError,
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const activeCompany = useActiveCompany();

  const specs = {
    square: {
      title: 'Square Logo',
      description: 'Recommended: 1200×1200px (min: 128×128px)',
      aspectRatio: 1,
      maxWidth: 1200,
      maxHeight: 1200,
      minWidth: 128,
      minHeight: 128,
    },
    rectangular: {
      title: 'Rectangular Logo',
      description: 'Recommended: 1200×300px (min: 512×128px)',
      aspectRatio: 4,
      maxWidth: 1200,
      maxHeight: 300,
      minWidth: 512,
      minHeight: 128,
    },
  };

  const spec = specs[type];

  // Check if user has permission to upload logos
  const hasPermission = isAdminOrHigher(activeCompany?.userRole);

  // Remove old validation functions - replaced with secure validation

  const uploadFile = async (file: File) => {
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Ensure user is authenticated
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check user permissions
      if (!hasPermission) {
        throw new Error('You do not have permission to upload logos. Admin or higher role required.');
      }

      // Validate file using secure validation
      const secureFilename = await validateFileUpload(file, user.id, 'logo', type);
      setUploadProgress(25);

      // Generate secure file path
      const filePath = `${companyId}/${secureFilename}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(75);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(uploadData.path);

      const logoUrl = urlData.publicUrl;

      // Update company record
      const updateField = type === 'square' ? 'logo_url' : 'rectangular_logo_url';

      const { error: updateError } = await supabase
        .from('companies')
        .update({ [updateField]: logoUrl })
        .eq('id', companyId);

      if (updateError) {
        throw updateError;
      }

      setPreviewUrl(logoUrl);
      onUploadSuccess(logoUrl);
      setUploadProgress(100);
    } catch (error) {
      let errorMessage = 'Upload failed';

      if (error instanceof FileValidationError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      onUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl) return;

    try {
      // Extract file path from URL
      const urlParts = currentLogoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${companyId}/${fileName}`;

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('company-logos')
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }

      // Update company record
      const updateField = type === 'square' ? 'logo_url' : 'rectangular_logo_url';
      const { error: updateError } = await supabase
        .from('companies')
        .update({ [updateField]: null })
        .eq('id', companyId);

      if (updateError) {
        throw updateError;
      }

      setPreviewUrl(null);
      onUploadSuccess('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Remove failed';
      setError(errorMessage);
      onUploadError(errorMessage);
    }
  };

  const displayUrl = previewUrl || currentLogoUrl;

  console.log('Display URL:', displayUrl)
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">{spec.title}</Label>
        <p className="text-xs text-muted-foreground mt-1">{spec.description}</p>
        <p className="text-xs text-muted-foreground">Max file size: 5MB</p>
        <p className="text-xs text-green-600 mt-1">
          ✓ Logos are automatically saved when uploaded
        </p>
        {!hasPermission && (
          <p className="text-xs text-red-600 mt-1">
            Admin or higher role required to upload logos
          </p>
        )}
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${!hasPermission
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
          : dragOver
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400'
          }`}
        onDragOver={hasPermission ? handleDragOver : undefined}
        onDragLeave={hasPermission ? handleDragLeave : undefined}
        onDrop={hasPermission ? handleDrop : undefined}
      >
        {displayUrl ? (
          <div className="relative">
            <div className="mb-4">
              {type === 'square' ? (
                <img
                  src={displayUrl}
                  alt={`${companyName} square logo`}
                  className="mx-auto h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <img
                  src={displayUrl}
                  alt={`${companyName} rectangular logo`}
                  className="mx-auto h-12 w-48 rounded-lg object-cover"
                />
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !hasPermission}
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={isUploading || !hasPermission}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              {type === 'square' ? (
                <CompanyInitialsIcon name={companyName} size={80} className="mx-auto" />
              ) : (
                <div className="mx-auto w-48 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {hasPermission
                ? "Drag and drop your logo here, or click to browse"
                : "Admin or higher role required to upload logos"
              }
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !hasPermission}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Logo
            </Button>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            Uploading logo...
          </p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={!hasPermission}
      />
    </div>
  );
}