'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type Company, type UserCompany } from '@/lib/validation/companySchema';
import CompanyInitialsIcon from '@/components/company/CompanyInitialsIcon';
import { LogoUpload } from '@/components/company/LogoUpload';
import { ColorSchemeManager } from '@/components/company/ColorSchemeManager';
import { AuthAndApiSettings } from '@/components/company/AuthAndApiSettings';
import { ContactDetailsForm } from '@/components/company/ContactDetailsForm';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useActiveCompany } from '@/lib/activeCompany';
import { isAdminOrHigher } from '@/lib/permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Palette, Key, Mail, Trash2, AlertCircle, Save, RefreshCw } from 'lucide-react';
export default function CompanySettingsPage() {
 /* params from URL */
 const { companyId } = useParams<{ companyId: string }>();
 const router = useRouter();
 const { user } = useAuth();

 /* Get company data from context instead of fetching */
 const company: UserCompany | null = useActiveCompany();
 /* local state */
 const [deleting, setDeleting] = useState(false);
 const [activeTab, setActiveTab] = useState('general');
 const [companyData, setCompanyData] = useState<Company | null>(company);
 const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

 /* Form state for general settings */
 const [generalFormData, setGeneralFormData] = useState({
  name: company?.name || ''
 });
 const [isSaving, setIsSaving] = useState(false);

 useEffect(() => {
  setCompanyData(company);
  if (company) {
   setGeneralFormData({
    name: company.name || ''
   });
  }
 }, [company]);

 // Check if user has admin permission for settings management
 const hasAdminPermission = isAdminOrHigher(company?.userRole);

 const showNotification = (type: 'success' | 'error', message: string) => {
  setNotification({ type, message });
  setTimeout(() => setNotification(null), 5000);
 };

 const handleLogoUploadSuccess = (logoUrl: string, type: 'square' | 'rectangular') => {
  if (companyData) {
   setCompanyData({
    ...companyData,
    [type === 'square' ? 'logo_url' : 'rectangular_logo_url']: logoUrl,
   });
  }
  showNotification('success', `${type === 'square' ? 'Square' : 'Rectangular'} logo uploaded and saved successfully`);
 };

 const handleColorSchemeUpdate = (primaryColor: string, secondaryColor: string) => {
  if (companyData) {
   setCompanyData({
    ...companyData,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
   });
  }
  showNotification('success', 'Color scheme updated successfully');
 };

 const handleContactDetailsUpdate = (contactDetails: any) => {
  if (companyData) {
   setCompanyData({
    ...companyData,
    contact_details: contactDetails,
    billing_email: contactDetails.email,
   });
  }
  showNotification('success', 'Contact details updated successfully');
 };

 const handleError = (error: string) => {
  showNotification('error', error);
 };

 const handleSaveGeneralSettings = async () => {
  if (!company || !user) return;

  setIsSaving(true);
  try {
   const { data: { session } } = await supabase.auth.getSession();
   const token = session?.access_token;

   if (!token) {
    throw new Error('Not authenticated');
   }

   const response = await fetch(`/api/companies/${companyId}`, {
    method: 'PUT',
    headers: {
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
     name: generalFormData.name
    })
   });

   if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update company');
   }

   const updatedCompany = await response.json();

   // Update local state
   setCompanyData(updatedCompany);

   showNotification('success', 'Company details updated successfully');
  } catch (error) {
   console.error('Error updating company:', error);
   handleError(error instanceof Error ? error.message : 'Failed to update company');
  } finally {
   setIsSaving(false);
  }
 };

 /* --- delete company function --- */
 const handleDeleteCompany = async () => {
  if (!company || !user) return;

  const confirmed = confirm(
   `Opravdu chcete smazat společnost "${company.name}"? Tato akce je nevratná a všechna data budou trvale odstraněna.`
  );

  if (!confirmed) return;

  setDeleting(true);

  try {
   const { data: { session } } = await supabase.auth.getSession();
   const token = session?.access_token;

   if (!token) {
    throw new Error('Nejste přihlášeni');
   }

   const response = await fetch(`/api/companies/${companyId}`, {
    method: 'DELETE',
    headers: {
     'Authorization': `Bearer ${token}`
    }
   });

   if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Chyba při mazání společnosti');
   }

   // Redirect to companies list or dashboard
   router.push('/companies');
  } catch (error) {
   console.error('Error deleting company:', error);
   alert(error instanceof Error ? error.message : 'Chyba při mazání společnosti');
  } finally {
   setDeleting(false);
  }
 };

 if (!companyData) {
  return (
   <main className="max-w-7xl mx-auto px-6 py-8">
    <div className="text-center py-8">
     <p>Loading company data...</p>
    </div>
   </main>
  );
 }

 return (
  <main className="max-w-7xl mx-auto px-6 py-8">
   <div className="flex items-center justify-between mb-8">
    <div>
     <h1 className="text-3xl font-semibold mb-2">Company Settings</h1>
     <p className="text-muted-foreground">Manage your company profile, branding, and API connections</p>
    </div>
    <div className="flex items-center gap-2">
     <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
      <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
      Active
     </Badge>
    </div>
   </div>

   {/* Permission Warning */}
   {!hasAdminPermission && (
    <Alert className="mb-6 border-orange-200 bg-orange-50">
     <AlertCircle className="h-4 w-4 text-orange-600" />
     <AlertDescription className="text-orange-800">
      You have limited access to company settings. Admin or higher role is required to modify company information, branding, and advanced settings.
     </AlertDescription>
    </Alert>
   )}

   {/* Notification */}
   {notification && (
    <Alert
     variant={notification.type === 'error' ? 'destructive' : 'default'}
     className="mb-6"
    >
     <AlertCircle className="h-4 w-4" />
     <AlertDescription>{notification.message}</AlertDescription>
    </Alert>
   )}

   <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
    <TabsList className="grid w-full grid-cols-5">
     <TabsTrigger value="general" className="flex items-center gap-2">
      <Settings className="h-4 w-4" />
      General
     </TabsTrigger>
     <TabsTrigger value="branding" className="flex items-center gap-2">
      <Palette className="h-4 w-4" />
      Branding
     </TabsTrigger>
     <TabsTrigger value="integrations" className="flex items-center gap-2">
      <Key className="h-4 w-4" />
      Auth & API's
     </TabsTrigger>
     <TabsTrigger value="contact" className="flex items-center gap-2">
      <Mail className="h-4 w-4" />
      Contact
     </TabsTrigger>
     <TabsTrigger value="advanced" className="flex items-center gap-2">
      <Trash2 className="h-4 w-4" />
      Advanced
     </TabsTrigger>
    </TabsList>

    {/* General Settings */}
    <TabsContent value="general" className="space-y-6">
     <Card>
      <CardHeader>
       <CardTitle>Company Profile</CardTitle>
       <CardDescription>
        Basic information about your company
       </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
       <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
         {companyData.logo_url ? (
          <img
           src={companyData.logo_url}
           alt={`${companyData.name} logo`}
           className="w-16 h-16 rounded-lg object-cover"
          />
         ) : (
          <CompanyInitialsIcon name={companyData.name} size={64} />
         )}
        </div>
        <div className="flex-1">
         <h3 className="text-xl font-semibold">{companyData.name}</h3>
         <p className="text-muted-foreground">{companyData.billing_email}</p>
        </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
         <label htmlFor="company-name" className="text-sm font-medium">
          Company Name
         </label>
         <input
          id="company-name"
          type="text"
          value={generalFormData.name}
          onChange={(e) => setGeneralFormData(prev => ({ ...prev, name: e.target.value }))}
          disabled={!hasAdminPermission}
          className="w-full px-3 py-2 border border-border-default rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-base disabled:text-muted"
         />
        </div>
        <div className="space-y-2">
         <label htmlFor="plan" className="text-sm font-medium">
          Plan
         </label>
         <input
          id="plan"
          type="text"
          value={companyData.plan || 'Free'}
          className="w-full px-3 py-2 border border-border-default rounded-md bg-base"
          readOnly
         />
        </div>
       </div>      

       <Button
        className="w-full"
        disabled={!hasAdminPermission || isSaving}
        onClick={handleSaveGeneralSettings}
       >
        {isSaving ? (
         <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Saving...
         </>
        ) : (
         <>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
         </>
        )}
       </Button>
      </CardContent>
     </Card>
    </TabsContent>

    {/* Branding Settings */}
    <TabsContent value="branding" className="space-y-6">
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LogoUpload
       companyId={companyId}
       companyName={companyData.name}
       type="square"
       {...(companyData.logo_url && { currentLogoUrl: companyData.logo_url })}
       onUploadSuccess={(url) => handleLogoUploadSuccess(url, 'square')}
       onUploadError={handleError}
      />
      <LogoUpload
       companyId={companyId}
       companyName={companyData.name}
       type="rectangular"
       {...(companyData.rectangular_logo_url && { currentLogoUrl: companyData.rectangular_logo_url })}
       onUploadSuccess={(url) => handleLogoUploadSuccess(url, 'rectangular')}
       onUploadError={handleError}
      />
     </div>

     <ColorSchemeManager
      companyId={companyId}
      {...(companyData.primary_color && { currentPrimaryColor: companyData.primary_color })}
      {...(companyData.secondary_color && { currentSecondaryColor: companyData.secondary_color })}
      onUpdateSuccess={handleColorSchemeUpdate}
      onUpdateError={handleError}
     />
    </TabsContent>

    {/* Auth & API's */}
    <TabsContent value="integrations" className="space-y-6">
     <AuthAndApiSettings companyId={companyId} />
    </TabsContent>

    {/* Contact Details */}
    <TabsContent value="contact" className="space-y-6">
     <ContactDetailsForm
      companyId={companyId}
      companyEmail={companyData.billing_email || ''}
      {...(companyData.contact_details && { currentContactDetails: companyData.contact_details })}
      onUpdateSuccess={handleContactDetailsUpdate}
      onUpdateError={handleError}
     />
    </TabsContent>

    {/* Advanced Settings */}
    <TabsContent value="advanced" className="space-y-6">
     <Card className="border-red-200">
      <CardHeader>
       <CardTitle className="text-red-600">Danger Zone</CardTitle>
       <CardDescription>
        These actions are irreversible. Please be careful.
       </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
       <div className="p-4 bg-red-50 rounded-lg">
        <h4 className="font-semibold text-red-800 mb-2">Delete Company</h4>
        <p className="text-sm text-red-700 mb-4">
         Permanently delete this company and all associated data. This action cannot be undone.
        </p>
        <Button
         variant="destructive"
         onClick={handleDeleteCompany}
         disabled={deleting}
        >
         {deleting ? (
          <>Deleting...</>
         ) : (
          <>
           <Trash2 className="h-4 w-4 mr-2" />
           Delete Company
          </>
         )}
        </Button>
       </div>
      </CardContent>
     </Card>
    </TabsContent>
   </Tabs>
  </main>
 );
}
