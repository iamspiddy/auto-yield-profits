-- Migration: Create KYC Documents Table
-- This migration creates the KYC documents table for storing user identity documents

-- Create KYC documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('government_id', 'selfie', 'proof_of_address', 'additional')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified BOOLEAN DEFAULT NULL,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_document_type ON kyc_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_verified ON kyc_documents(verified);

-- Enable RLS
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own documents
CREATE POLICY "Users can view own KYC documents" ON kyc_documents
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own documents
CREATE POLICY "Users can insert own KYC documents" ON kyc_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own KYC documents" ON kyc_documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Only admins can verify/reject documents
CREATE POLICY "Only admins can verify KYC documents" ON kyc_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kyc_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_kyc_documents_updated_at
  BEFORE UPDATE ON kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_kyc_documents_updated_at();

-- Create function to get user's KYC status
CREATE OR REPLACE FUNCTION get_user_kyc_status(_user_id UUID)
RETURNS JSON AS $$
DECLARE
  _result JSON;
BEGIN
  SELECT json_build_object(
    'has_documents', EXISTS(SELECT 1 FROM kyc_documents WHERE user_id = _user_id),
    'document_count', (SELECT COUNT(*) FROM kyc_documents WHERE user_id = _user_id),
    'verified_documents', (SELECT COUNT(*) FROM kyc_documents WHERE user_id = _user_id AND verified = true),
    'pending_documents', (SELECT COUNT(*) FROM kyc_documents WHERE user_id = _user_id AND verified IS NULL),
    'rejected_documents', (SELECT COUNT(*) FROM kyc_documents WHERE user_id = _user_id AND verified = false)
  ) INTO _result;
  
  RETURN _result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_kyc_status(UUID) TO authenticated; 