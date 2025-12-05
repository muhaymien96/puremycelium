import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useBusinessProfiles, 
  useUpdateBusinessSettings, 
  useUploadLogo,
  useCreateBusinessProfile,
  useSetDefaultProfile,
  useDeleteBusinessProfile,
  type BusinessSettings as BusinessProfile
} from '@/hooks/useBusinessSettings';
import { Building2, Upload, Save, Star, Trash2, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const BusinessSettings = () => {
  const { data: profiles, isLoading } = useBusinessProfiles();
  const updateSettings = useUpdateBusinessSettings();
  const uploadLogo = useUploadLogo();
  const createProfile = useCreateBusinessProfile();
  const setDefaultProfile = useSetDefaultProfile();
  const deleteProfile = useDeleteBusinessProfile();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNewProfileDialog, setShowNewProfileDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const [formData, setFormData] = useState({
    business_name: '',
    profile_name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'South Africa',
    phone: '',
    email: '',
    vat_number: '',
    bank_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    invoice_footer_text: '',
    primary_color: '#ea384c',
  });

  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  // Set initial selected profile (default one)
  useEffect(() => {
    if (profiles && !selectedProfileId) {
      const defaultProfile = profiles.find(p => p.is_default);
      if (defaultProfile) setSelectedProfileId(defaultProfile.id);
    }
  }, [profiles, selectedProfileId]);

  // Update form when profile changes
  useEffect(() => {
    if (selectedProfile) {
      setFormData({
        business_name: selectedProfile.business_name || '',
        profile_name: selectedProfile.profile_name || '',
        address: selectedProfile.address || '',
        city: selectedProfile.city || '',
        postal_code: selectedProfile.postal_code || '',
        country: selectedProfile.country || 'South Africa',
        phone: selectedProfile.phone || '',
        email: selectedProfile.email || '',
        vat_number: selectedProfile.vat_number || '',
        bank_name: selectedProfile.bank_name || '',
        bank_account_number: selectedProfile.bank_account_number || '',
        bank_branch_code: selectedProfile.bank_branch_code || '',
        invoice_footer_text: selectedProfile.invoice_footer_text || '',
        primary_color: selectedProfile.primary_color || '#ea384c',
      });
      setIsDirty(false);
    }
  }, [selectedProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setIsDirty(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedProfileId) {
      uploadLogo.mutate({ file, profileId: selectedProfileId });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId) return;
    
    updateSettings.mutate(
      { id: selectedProfileId, settings: formData },
      {
        onSuccess: () => {
          setIsDirty(false);
        }
      }
    );
  };

  const handleSetDefault = () => {
    if (selectedProfileId) {
      setDefaultProfile.mutate(selectedProfileId);
    }
  };

  const handleDeleteProfile = () => {
    if (!selectedProfileId) return;
    
    // Prevent deleting the default or last profile
    if (selectedProfile?.is_default) {
      toast.error('Cannot delete the default profile');
      return;
    }
    
    if (profiles && profiles.length <= 1) {
      toast.error('Cannot delete the last profile');
      return;
    }

    deleteProfile.mutate(selectedProfileId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        // Switch to default profile
        const defaultProfile = profiles?.find(p => p.is_default);
        if (defaultProfile) setSelectedProfileId(defaultProfile.id);
      }
    });
  };

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) {
      toast.error('Please enter a profile name');
      return;
    }

    createProfile.mutate(
      { 
        profile_name: newProfileName,
        business_name: newProfileName,
        country: 'South Africa',
        is_default: false 
      },
      {
        onSuccess: (data) => {
          setShowNewProfileDialog(false);
          setNewProfileName('');
          setSelectedProfileId(data.id);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Business Settings</h1>
            <p className="text-muted-foreground">Manage your business profiles and invoice customization</p>
          </div>
        </div>

        {/* Profile Tabs */}
        <Tabs value={selectedProfileId} onValueChange={setSelectedProfileId}>
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
            {profiles?.map(profile => (
              <TabsTrigger key={profile.id} value={profile.id} className="gap-1">
                {profile.profile_name}
                {profile.is_default && <Star className="h-3 w-3 fill-primary text-primary" />}
              </TabsTrigger>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9"
              onClick={() => setShowNewProfileDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Profile
            </Button>
          </TabsList>

          <TabsContent value={selectedProfileId}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Logo Upload */}
              <Card>
                <CardHeader>
                  <CardTitle>Business Logo</CardTitle>
                  <CardDescription>Upload your business logo for invoices and branding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedProfile?.logo_url && (
                    <div className="flex justify-center p-4 border rounded-lg bg-muted">
                      <img src={selectedProfile.logo_url} alt="Business logo" className="max-h-32 object-contain" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadLogo.isPending}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadLogo.isPending ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Business Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>Basic details about your business</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="profile_name">Profile Name</Label>
                      <Input
                        id="profile_name"
                        name="profile_name"
                        value={formData.profile_name}
                        onChange={handleInputChange}
                        placeholder="BeePure"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business_name">Business Name</Label>
                      <Input
                        id="business_name"
                        name="business_name"
                        value={formData.business_name}
                        onChange={handleInputChange}
                        placeholder="Your Business Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="info@business.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+27 12 345 6789"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vat_number">VAT Number</Label>
                      <Input
                        id="vat_number"
                        name="vat_number"
                        value={formData.vat_number}
                        onChange={handleInputChange}
                        placeholder="4123456789"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Cape Town"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                        placeholder="8001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        placeholder="South Africa"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Banking Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Banking Details</CardTitle>
                  <CardDescription>Payment information for invoices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input
                        id="bank_name"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleInputChange}
                        placeholder="FNB"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_account_number">Account Number</Label>
                      <Input
                        id="bank_account_number"
                        name="bank_account_number"
                        value={formData.bank_account_number}
                        onChange={handleInputChange}
                        placeholder="1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_branch_code">Branch Code</Label>
                      <Input
                        id="bank_branch_code"
                        name="bank_branch_code"
                        value={formData.bank_branch_code}
                        onChange={handleInputChange}
                        placeholder="250655"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Customization */}
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Customization</CardTitle>
                  <CardDescription>Customize your invoice appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_footer_text">Invoice Footer Text</Label>
                    <Textarea
                      id="invoice_footer_text"
                      name="invoice_footer_text"
                      value={formData.invoice_footer_text}
                      onChange={handleInputChange}
                      placeholder="Thank you for your business!"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Primary Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="primary_color"
                        name="primary_color"
                        type="color"
                        value={formData.primary_color}
                        onChange={handleInputChange}
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={handleInputChange}
                        name="primary_color"
                        placeholder="#ea384c"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-2">
                  {!selectedProfile?.is_default && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleSetDefault}
                      disabled={setDefaultProfile.isPending}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Set as Default
                    </Button>
                  )}
                  {!selectedProfile?.is_default && profiles && profiles.length > 1 && (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Profile
                    </Button>
                  )}
                </div>

                <Button type="submit" disabled={!isDirty || updateSettings.isPending} size="lg">
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Profile?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedProfile?.profile_name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Profile Dialog */}
        <AlertDialog open={showNewProfileDialog} onOpenChange={setShowNewProfileDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create New Profile</AlertDialogTitle>
              <AlertDialogDescription>
                Enter a name for your new business profile.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                placeholder="Profile name (e.g., EarthSource)"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCreateProfile}>
                Create Profile
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default BusinessSettings;