'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useActiveCompany } from '@/lib/activeCompany';
import { isAdminOrHigher } from '@/lib/permissions';

interface ColorSchemeManagerProps {
 companyId: string;
 currentPrimaryColor?: string;
 currentSecondaryColor?: string;
 onUpdateSuccess: (primaryColor: string, secondaryColor: string) => void;
 onUpdateError: (error: string) => void;
}

const DEFAULT_COLORS = {
 primary: '#3B82F6',
 secondary: '#1F2937',
};

const PRESET_COLORS = [
 { name: 'Blue', primary: '#3B82F6', secondary: '#1F2937' },
 { name: 'Green', primary: '#10B981', secondary: '#1F2937' },
 { name: 'Purple', primary: '#8B5CF6', secondary: '#1F2937' },
 { name: 'Red', primary: '#EF4444', secondary: '#1F2937' },
 { name: 'Orange', primary: '#F97316', secondary: '#1F2937' },
 { name: 'Pink', primary: '#EC4899', secondary: '#1F2937' },
 { name: 'Teal', primary: '#14B8A6', secondary: '#1F2937' },
 { name: 'Indigo', primary: '#6366F1', secondary: '#1F2937' },
];

export function ColorSchemeManager({
 companyId,
 currentPrimaryColor = DEFAULT_COLORS.primary,
 currentSecondaryColor = DEFAULT_COLORS.secondary,
 onUpdateSuccess,
 onUpdateError,
}: ColorSchemeManagerProps) {
 const [primaryColor, setPrimaryColor] = useState(currentPrimaryColor);
 const [secondaryColor, setSecondaryColor] = useState(currentSecondaryColor);
 const [isUpdating, setIsUpdating] = useState(false);
 const [error, setError] = useState<string | null>(null);
 
 const activeCompany = useActiveCompany();
 const hasPermission = isAdminOrHigher(activeCompany?.userRole);

 const validateColor = (color: string): boolean => {
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  return hexRegex.test(color);
 };

 const getContrastRatio = (color1: string, color2: string): number => {
  const getRGB = (color: string) => {
   const hex = color.replace('#', '');
   return {
    r: parseInt(hex.substr(0, 2), 16),
    g: parseInt(hex.substr(2, 2), 16),
    b: parseInt(hex.substr(4, 2), 16),
   };
  };

  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
   const { r, g, b } = rgb;
   const sRGB = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
   });
   return 0.2126 * (sRGB[0] || 0) + 0.7152 * (sRGB[1] || 0) + 0.0722 * (sRGB[2] || 0);
  };

  const rgb1 = getRGB(color1);
  const rgb2 = getRGB(color2);
  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
 };

 const handleUpdateColors = async () => {
  setError(null);
  setIsUpdating(true);

  try {
   // Check user permissions
   if (!hasPermission) {
    throw new Error('You do not have permission to update colors. Admin or higher role required.');
   }

   // Validate colors
   if (!validateColor(primaryColor)) {
    throw new Error('Invalid primary color format. Please use hex format (e.g., #FF0000)');
   }
   if (!validateColor(secondaryColor)) {
    throw new Error('Invalid secondary color format. Please use hex format (e.g., #FF0000)');
   }

   // Check contrast ratio
   const contrastRatio = getContrastRatio(primaryColor, secondaryColor);
   if (contrastRatio < 3) {
    throw new Error('Colors have insufficient contrast. Please choose colors with better contrast for accessibility.');
   }

   // Update company colors
   const { error: updateError } = await supabase
    .from('companies')
    .update({
     primary_color: primaryColor,
     secondary_color: secondaryColor,
    })
    .eq('id', companyId);

   if (updateError) {
    throw updateError;
   }

   onUpdateSuccess(primaryColor, secondaryColor);
  } catch (error) {
   const errorMessage = error instanceof Error ? error.message : 'Update failed';
   setError(errorMessage);
   onUpdateError(errorMessage);
  } finally {
   setIsUpdating(false);
  }
 };

 const handlePresetSelect = (preset: { primary: string; secondary: string }) => {
  setPrimaryColor(preset.primary);
  setSecondaryColor(preset.secondary);
 };

 const handleReset = () => {
  setPrimaryColor(DEFAULT_COLORS.primary);
  setSecondaryColor(DEFAULT_COLORS.secondary);
 };

 const hasChanges = primaryColor !== currentPrimaryColor || secondaryColor !== currentSecondaryColor;

 return (
  <Card>
   <CardHeader>
    <CardTitle>Color Scheme</CardTitle>
    <CardDescription>
     Customize your company's brand colors. These colors will be used throughout the application.
     {!hasPermission && (
      <span className="block text-red-600 text-sm mt-2">
       Admin or higher role required to modify color scheme.
      </span>
     )}
    </CardDescription>
   </CardHeader>
   <CardContent className="space-y-6">
    {/* Current Color Preview */}
    <div className="grid grid-cols-2 gap-4">
     <div className="space-y-2">
      <Label htmlFor="primary-color">Primary Color</Label>
      <div className="flex gap-2">
       <div
        className="w-10 h-10 rounded-lg border-2 border-border-light flex-shrink-0"
        style={{ backgroundColor: primaryColor }}
       />
       <Input
        id="primary-color"
        type="text"
        value={primaryColor}
        onChange={(e) => setPrimaryColor(e.target.value)}
        placeholder="#3B82F6"
        className="font-mono"
        disabled={!hasPermission}
       />
      </div>
     </div>
     <div className="space-y-2">
      <Label htmlFor="secondary-color">Secondary Color</Label>
      <div className="flex gap-2">
       <div
        className="w-10 h-10 rounded-lg border-2 border-border-light flex-shrink-0"
        style={{ backgroundColor: secondaryColor }}
       />
       <Input
        id="secondary-color"
        type="text"
        value={secondaryColor}
        onChange={(e) => setSecondaryColor(e.target.value)}
        placeholder="#1F2937"
        className="font-mono"
        disabled={!hasPermission}
       />
      </div>
     </div>
    </div>

    {/* Color Preview */}
    <div className="space-y-2">
     <Label>Preview</Label>
     <div className="p-4 rounded-lg border" style={{ backgroundColor: secondaryColor }}>
      <div className="flex items-center gap-3">
       <div
        className="w-8 h-8 rounded-full"
        style={{ backgroundColor: primaryColor }}
       />
       <div>
        <div className="font-semibold" style={{ color: primaryColor }}>
         Primary Color
        </div>
        <div className="text-sm opacity-75" style={{ color: 'white' }}>
         Secondary background
        </div>
       </div>
      </div>
     </div>
    </div>

    {/* Color Presets */}
    <div className="space-y-2">
     <Label>Color Presets</Label>
     <div className="grid grid-cols-4 gap-2">
      {PRESET_COLORS.map((preset) => (
       <button
        key={preset.name}
        onClick={() => handlePresetSelect(preset)}
        className={`p-2 rounded-lg border transition-colors ${
         hasPermission 
          ? 'hover:border-border-default cursor-pointer' 
          : 'cursor-not-allowed opacity-50'
        }`}
        title={preset.name}
        disabled={!hasPermission}
       >
        <div className="flex gap-1">
         <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: preset.primary }}
         />
         <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: preset.secondary }}
         />
        </div>
        <div className="text-xs mt-1">{preset.name}</div>
       </button>
      ))}
     </div>
    </div>

    {/* Color Picker Inputs */}
    <div className="grid grid-cols-2 gap-4">
     <div className="space-y-2">
      <Label htmlFor="primary-picker">Primary Color Picker</Label>
      <input
       id="primary-picker"
       type="color"
       value={primaryColor}
       onChange={(e) => setPrimaryColor(e.target.value)}
       className="w-full h-10 rounded-lg border cursor-pointer"
       disabled={!hasPermission}
      />
     </div>
     <div className="space-y-2">
      <Label htmlFor="secondary-picker">Secondary Color Picker</Label>
      <input
       id="secondary-picker"
       type="color"
       value={secondaryColor}
       onChange={(e) => setSecondaryColor(e.target.value)}
       className="w-full h-10 rounded-lg border cursor-pointer"
       disabled={!hasPermission}
      />
     </div>
    </div>

    {error && (
     <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
     </Alert>
    )}

    {/* Actions */}
    <div className="flex gap-2">
     <Button
      onClick={handleUpdateColors}
      disabled={isUpdating || !hasChanges || !hasPermission}
      className="flex-1"
     >
      {isUpdating ? (
       <>
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        Updating...
       </>
      ) : (
       'Update Colors'
      )}
     </Button>
     <Button
      variant="outline"
      onClick={handleReset}
      disabled={isUpdating || !hasPermission}
     >
      Reset
     </Button>
    </div>
   </CardContent>
  </Card>
 );
}