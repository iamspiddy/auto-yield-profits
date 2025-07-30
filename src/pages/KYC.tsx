import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Eye,
  EyeOff,
  Calendar,
  User,
  FileText,
  Camera,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FileUpload from '@/components/ui/file-upload';

interface KYCData {
  full_name?: string;
  date_of_birth?: string;
  kyc_status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  kyc_verified?: boolean;
  kyc_id_url?: string;
  kyc_selfie_url?: string;
  kyc_submitted_at?: string;
  kyc_rejection_reason?: string;
}

const KYC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchKYCData();
  }, [user]);

  // Add a refresh mechanism
  const handleRefresh = () => {
    fetchKYCData();
  };

  const fetchKYCData = async () => {
    if (!user) return;
    
    setLoadingKyc(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, date_of_birth, kyc_status, kyc_verified, kyc_id_url, kyc_selfie_url, kyc_submitted_at, kyc_rejection_reason')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setKycData(data);
        setFullName(data.full_name || '');
        setDateOfBirth(data.date_of_birth || '');
      }
    } catch (error) {
      console.error('Error fetching KYC data:', error);
    } finally {
      setLoadingKyc(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      verified: "default",
      pending: "secondary",
      rejected: "destructive",
      not_submitted: "outline"
    };

    const labels: Record<string, string> = {
      verified: "Verified",
      pending: "Pending Review",
      rejected: "Rejected",
      not_submitted: "Not Submitted"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || "Unknown"}
      </Badge>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName || !dateOfBirth || !idFile || !selfieFile) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and upload both documents.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload ID document
      const idFileExt = idFile.name.split('.').pop();
      const idFileName = `${user.id}/kyc_id.${idFileExt}`;
      
      const { error: idUploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(idFileName, idFile, { upsert: true });

      if (idUploadError) throw idUploadError;

      // Upload selfie
      const selfieFileExt = selfieFile.name.split('.').pop();
      const selfieFileName = `${user.id}/kyc_selfie.${selfieFileExt}`;
      
      const { error: selfieUploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(selfieFileName, selfieFile, { upsert: true });

      if (selfieUploadError) throw selfieUploadError;

      // Update profile with KYC data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          date_of_birth: dateOfBirth,
          kyc_status: 'pending',
          kyc_verified: false,
          kyc_id_url: idFileName,
          kyc_selfie_url: selfieFileName,
          kyc_submitted_at: new Date().toISOString(),
          kyc_rejection_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "KYC Submitted Successfully",
        description: "Your documents have been submitted for review. You will be notified within 24-48 hours."
      });

      // Refresh KYC data
      await fetchKYCData();
      
      // Clear form
      setIdFile(null);
      setSelfieFile(null);
      
    } catch (error: any) {
      toast({
        title: "KYC Submission Failed",
        description: error.message || "Failed to submit KYC documents.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || loadingKyc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Back to Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Status
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KYC Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                KYC Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Status</span>
                {getStatusBadge(kycData?.kyc_verified ? 'verified' : (kycData?.kyc_status || 'not_submitted'))}
              </div>

              {kycData?.kyc_submitted_at && (
                <div className="text-sm text-muted-foreground">
                  Submitted: {formatDate(kycData.kyc_submitted_at)}
                </div>
              )}

              {kycData?.kyc_status === 'rejected' && kycData?.kyc_rejection_reason && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Rejection Reason:</strong> {kycData.kyc_rejection_reason}
                  </AlertDescription>
                </Alert>
              )}

              {kycData?.kyc_verified && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your identity has been verified. You now have full access to all platform features.
                  </AlertDescription>
                </Alert>
              )}

              {kycData?.kyc_status === 'pending' && !kycData?.kyc_verified && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Your documents are under review. This process typically takes 24-48 hours.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Document Preview Card */}
          {kycData?.kyc_id_url && kycData?.kyc_selfie_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Submitted Documents
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDocuments(!showDocuments)}
                  >
                    {showDocuments ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showDocuments && (
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Government ID</Label>
                    <div className="mt-2 p-2 border rounded bg-muted/50">
                      <img 
                        src={`${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/kyc-documents/${kycData.kyc_id_url}`}
                        alt="Government ID"
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Selfie</Label>
                    <div className="mt-2 p-2 border rounded bg-muted/50">
                      <img 
                        src={`${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/kyc-documents/${kycData.kyc_selfie_url}`}
                        alt="Selfie"
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* KYC Submission Form */}
        {(!kycData?.kyc_verified && (kycData?.kyc_status === 'not_submitted' || kycData?.kyc_status === 'rejected')) ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verify Your Identity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full legal name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Government-Issued ID *</Label>
                    <FileUpload
                      onFileChange={setIdFile}
                      accept="image/*,.pdf"
                      maxSize={5 * 1024 * 1024}
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a clear photo or scan of your government ID (passport, driver's license, etc.)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Selfie with ID *</Label>
                    <FileUpload
                      onFileChange={setSelfieFile}
                      accept="image/*"
                      maxSize={5 * 1024 * 1024}
                    />
                    <p className="text-xs text-muted-foreground">
                      Take a selfie while holding your ID next to your face
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit KYC'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Your documents will be reviewed within 24–48 hours.
                </p>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default KYC; 