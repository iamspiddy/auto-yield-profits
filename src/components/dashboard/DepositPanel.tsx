import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DepositPanel = () => {
  const [amount, setAmount] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  const walletAddress = "TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax"; // Example USDT wallet

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type and size
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive"
        });
        return;
      }
      
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
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

      // Reset form
      setAmount('');
      setTransactionHash('');
      setFile(null);
      
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="h-5 w-5 mr-2" />
          Deposit Funds
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Address */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <Label className="text-sm font-medium">USDT (TRC20) Wallet Address</Label>
          <div className="flex items-center space-x-2">
            <code className="flex-1 bg-background p-2 rounded text-xs break-all">
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
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Input
              id="proof"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Proof'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          Deposits are manually verified within 24 hours.
        </p>
      </CardContent>
    </Card>
  );
};

export default DepositPanel;