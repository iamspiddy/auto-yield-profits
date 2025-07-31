import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the access token and refresh token from URL parameters
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Email confirmation failed');
          toast({
            title: "Confirmation Failed",
            description: errorDescription || "Email confirmation failed. Please try again.",
            variant: "destructive"
          });
          return;
        }

        if (accessToken && refreshToken) {
          // Set the session with the tokens
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            setStatus('error');
            setMessage('Failed to set session');
            toast({
              title: "Session Error",
              description: "Failed to complete email confirmation. Please try signing in again.",
              variant: "destructive"
            });
            return;
          }

          if (data.session) {
            setStatus('success');
            setMessage('Email confirmed successfully!');
            toast({
              title: "Email Confirmed!",
              description: "Your account has been activated successfully."
            });
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          } else {
            setStatus('error');
            setMessage('No session found after confirmation');
          }
        } else {
          // Check if user is already authenticated
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            setStatus('success');
            setMessage('You are already signed in!');
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          } else {
            setStatus('error');
            setMessage('No confirmation tokens found');
            toast({
              title: "Confirmation Error",
              description: "Invalid confirmation link. Please try signing up again.",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Error handling email confirmation:', error);
        setStatus('error');
        setMessage('An unexpected error occurred');
        toast({
          title: "Error",
          description: "An unexpected error occurred during confirmation.",
          variant: "destructive"
        });
      }
    };

    handleEmailConfirmation();
  }, [navigate, searchParams]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Confirming Email...';
      case 'success':
        return 'Email Confirmed!';
      case 'error':
        return 'Confirmation Failed';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'loading':
        return 'Please wait while we confirm your email address...';
      case 'success':
        return message || 'Your account has been activated successfully!';
      case 'error':
        return message || 'Email confirmation failed. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">{getStatusTitle()}</CardTitle>
          <CardDescription className="text-lg">
            {getStatusDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Back to Login
              </Button>
              <Button 
                onClick={() => navigate('/auth?mode=signup')}
                className="w-full"
                variant="outline"
              >
                Try Signing Up Again
              </Button>
            </div>
          )}
          
          {status === 'loading' && (
            <div className="text-center text-sm text-muted-foreground">
              <p>This may take a few moments...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback; 