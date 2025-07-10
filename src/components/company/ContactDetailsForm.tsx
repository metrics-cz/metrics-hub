'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Globe,
  Building,
  User
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useActiveCompany } from '@/lib/activeCompany';
import { isAdminOrHigher } from '@/lib/permissions';

interface ContactDetails {
  email?: string;
  phone?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contactPerson?: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
  };
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
}

interface ContactDetailsFormProps {
  companyId: string;
  companyEmail?: string;
  currentContactDetails?: ContactDetails;
  onUpdateSuccess: (contactDetails: ContactDetails) => void;
  onUpdateError: (error: string) => void;
}

export function ContactDetailsForm({
  companyId,
  companyEmail = '',
  currentContactDetails = {},
  onUpdateSuccess,
  onUpdateError,
}: ContactDetailsFormProps) {
  const [contactDetails, setContactDetails] = useState<ContactDetails>({
    email: companyEmail || '',
    ...currentContactDetails,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const activeCompany = useActiveCompany();
  const hasPermission = isAdminOrHigher(activeCompany?.userRole);

  useEffect(() => {
    setContactDetails({
      email: companyEmail || '',
      ...currentContactDetails,
    });
  }, [companyEmail, currentContactDetails]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const validateWebsite = (website: string): boolean => {
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const getCompletionPercentage = (): number => {
    const fields = [
      contactDetails.email,
      contactDetails.phone,
      contactDetails.website,
      contactDetails.address?.street,
      contactDetails.address?.city,
      contactDetails.address?.country,
      contactDetails.contactPerson?.name,
      contactDetails.contactPerson?.email,
    ];
    
    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setIsUpdating(true);

    try {
      // Check user permissions
      if (!hasPermission) {
        throw new Error('You do not have permission to update contact details. Admin or higher role required.');
      }

      // Validate required fields
      if (!contactDetails.email || !validateEmail(contactDetails.email)) {
        throw new Error('Valid email address is required');
      }

      // Validate optional fields
      if (contactDetails.phone && !validatePhone(contactDetails.phone)) {
        throw new Error('Invalid phone number format');
      }

      if (contactDetails.website && !validateWebsite(contactDetails.website)) {
        throw new Error('Invalid website URL');
      }

      if (contactDetails.contactPerson?.email && !validateEmail(contactDetails.contactPerson.email)) {
        throw new Error('Invalid contact person email');
      }

      // Update company record
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          billing_email: contactDetails.email || '',
          contact_details: contactDetails,
        })
        .eq('id', companyId);

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      onUpdateSuccess(contactDetails);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      setError(errorMessage);
      onUpdateError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateContactDetails = (updates: Partial<ContactDetails>) => {
    setContactDetails(prev => ({ ...prev, ...updates }));
  };

  const updateAddress = (updates: Partial<ContactDetails['address']>) => {
    setContactDetails(prev => ({
      ...prev,
      address: { ...prev.address, ...updates },
    }));
  };

  const updateContactPerson = (updates: Partial<ContactDetails['contactPerson']>) => {
    setContactDetails(prev => ({
      ...prev,
      contactPerson: { ...prev.contactPerson, ...updates },
    }));
  };

  const updateSocialMedia = (updates: Partial<ContactDetails['socialMedia']>) => {
    setContactDetails(prev => ({
      ...prev,
      socialMedia: { ...prev.socialMedia, ...updates },
    }));
  };

  const completionPercentage = getCompletionPercentage();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contact Details</CardTitle>
            <CardDescription>
              Manage your company's contact information and business details
              {!hasPermission && (
                <span className="block text-red-600 text-sm mt-2">
                  Admin or higher role required to modify contact details.
                </span>
              )}
            </CardDescription>
          </div>
          <Badge variant={completionPercentage > 70 ? 'default' : 'secondary'}>
            {completionPercentage}% Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Contact Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <h3 className="font-semibold">Basic Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={contactDetails.email || ''}
                onChange={(e) => updateContactDetails({ email: e.target.value })}
                placeholder="company@example.com"
                required
                disabled={!hasPermission}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={contactDetails.phone || ''}
                onChange={(e) => updateContactDetails({ phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                disabled={!hasPermission}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={contactDetails.website || ''}
              onChange={(e) => updateContactDetails({ website: e.target.value })}
              placeholder="https://www.example.com"
              disabled={!hasPermission}
            />
          </div>
        </div>

        <Separator />

        {/* Address Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <h3 className="font-semibold">Address</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={contactDetails.address?.street || ''}
                onChange={(e) => updateAddress({ street: e.target.value })}
                placeholder="123 Main Street"
                disabled={!hasPermission}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={contactDetails.address?.city || ''}
                  onChange={(e) => updateAddress({ city: e.target.value })}
                  placeholder="New York"
                  disabled={!hasPermission}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={contactDetails.address?.state || ''}
                  onChange={(e) => updateAddress({ state: e.target.value })}
                  placeholder="NY"
                  disabled={!hasPermission}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                <Input
                  id="zipCode"
                  value={contactDetails.address?.zipCode || ''}
                  onChange={(e) => updateAddress({ zipCode: e.target.value })}
                  placeholder="10001"
                  disabled={!hasPermission}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={contactDetails.address?.country || ''}
                onChange={(e) => updateAddress({ country: e.target.value })}
                placeholder="United States"
                disabled={!hasPermission}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Contact Person */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <h3 className="font-semibold">Primary Contact</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Full Name</Label>
              <Input
                id="contactName"
                value={contactDetails.contactPerson?.name || ''}
                onChange={(e) => updateContactPerson({ name: e.target.value })}
                placeholder="John Doe"
                disabled={!hasPermission}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactTitle">Job Title</Label>
              <Input
                id="contactTitle"
                value={contactDetails.contactPerson?.title || ''}
                onChange={(e) => updateContactPerson({ title: e.target.value })}
                placeholder="CEO"
                disabled={!hasPermission}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactDetails.contactPerson?.email || ''}
                onChange={(e) => updateContactPerson({ email: e.target.value })}
                placeholder="john.doe@example.com"
                disabled={!hasPermission}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={contactDetails.contactPerson?.phone || ''}
                onChange={(e) => updateContactPerson({ phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                disabled={!hasPermission}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Social Media */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <h3 className="font-semibold">Social Media</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={contactDetails.socialMedia?.linkedin || ''}
                onChange={(e) => updateSocialMedia({ linkedin: e.target.value })}
                placeholder="https://linkedin.com/company/example"
                disabled={!hasPermission}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter</Label>
              <Input
                id="twitter"
                value={contactDetails.socialMedia?.twitter || ''}
                onChange={(e) => updateSocialMedia({ twitter: e.target.value })}
                placeholder="https://twitter.com/example"
                disabled={!hasPermission}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={contactDetails.socialMedia?.facebook || ''}
                onChange={(e) => updateSocialMedia({ facebook: e.target.value })}
                placeholder="https://facebook.com/example"
                disabled={!hasPermission}
              />
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Contact details updated successfully!</AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isUpdating || !hasPermission}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Save className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Contact Details
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}