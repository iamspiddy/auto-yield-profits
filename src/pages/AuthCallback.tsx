import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('AuthCallback: Starting authentication process...');
        
        // Wait a bit for the session to be established
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Get the current session
        const { data, error } = await supabase.auth.getSession();
        
        console.log('AuthCallback: Session data:', data);
        console.log('AuthCallback: Session error:', error);
        
        if (error) {
          console.error('AuthCallback: Session error:', error);
          setError(error.message);
          setLoading(false);
          return;
        }

        if (data.session && data.session.user) {
          console.log('AuthCallback: User authenticated:', data.session.user.email);
          
          // Check if we have a referral code in the state
          const state = searchParams.get('state');
          if (state) {
            console.log('AuthCallback: Referral code from OAuth:', state);
            // Handle referral code logic here if needed
          }
          
          // Redirect to dashboard
          console.log('AuthCallback: Redirecting to dashboard...');
          navigate('/dashboard', { replace: true });
        } else {
          console.log('AuthCallback: No session found, checking for OAuth response...');
          
          // Check if this is an OAuth callback
          const accessToken = searchParams.get('access_token');
          const refreshToken = searchParams.get('refresh_token');
          
          if (accessToken) {
            console.log('AuthCallback: OAuth tokens found, setting session...');
            // Set the session manually if needed
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (sessionData.session) {
              console.log('AuthCallback: Session established, redirecting to dashboard...');
              navigate('/dashboard', { replace: true });
              return;
            }
          }
          
          setError('Authentication failed. Please try again.');
          setLoading(false);
        }
      } catch (err) {
        console.error('AuthCallback: Unexpected error:', err);
        setError('An unexpected error occurred.');
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Completing sign-in...</p>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we authenticate you.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-destructive">Authentication Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Try Again
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate('/')}
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default AuthCallback;