import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Copy, Check, ArrowLeft, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FileUpload from '@/components/ui/file-upload';

const Deposit = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const walletAddress = "0xbad80c0d7d84adb576A052327F1bf3f07dD428e0"; // Example USDT wallet

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast({
        title: "Address Copied",
        description: "Wallet address has been copied to clipboard."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy address. Please copy manually.",
        variant: "destructive"
      });
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!amount || !file) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and upload proof.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deposit-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create deposit record
      const { data: depositData, error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          transaction_hash: transactionHash || null,
          proof_file_url: uploadData.path,
          status: 'pending'
        })
        .select();

      if (depositError) throw depositError;

      // Create transaction record with reference to deposit
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'deposit',
          amount: parseFloat(amount),
          status: 'pending',
          description: `Deposit of ${amount} USDT`,
          reference_id: depositData[0].id
        });

      toast({
        title: "Deposit Submitted",
        description: "Your deposit has been submitted for verification."
      });

      setSubmitted(true);
      
    } catch (error: any) {
      toast({
        title: "Deposit Failed",
        description: error.message || "Failed to submit deposit.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Deposit Submitted Successfully!</h2>
                <p className="text-muted-foreground">
                  Your deposit has been submitted for verification. You will receive a notification once it's processed.
                </p>
              </div>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Deposit Funds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wallet Address Section */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
              <Label className="text-sm font-medium mb-3 block">Platform USDT (TRC20) Wallet Address</Label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-background p-3 rounded text-sm break-all border">
                  {walletAddress}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAddress}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Send USDT to this address using the TRC20 network only
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Deposit Amount (USDT)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  required
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="txHash">Transaction Hash (Optional)</Label>
                <Input
                  id="txHash"
                  type="text"
                  placeholder="Enter transaction hash"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof">Upload Payment Proof *</Label>
                <FileUpload
                  onFileChange={setFile}
                  accept="image/*,.pdf"
                  maxSize={5 * 1024 * 1024}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Proof'}
              </Button>
            </form>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Deposits are manually verified within 24 hours
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Deposit; 