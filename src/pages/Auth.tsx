import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }

    // Check for confirmation error from URL
    const error = searchParams.get('error');
    if (error === 'confirmation_failed') {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You've been signed in successfully."
          });
        }
      } else {
        if (!acceptTerms) {
          toast({
            title: "Terms Required",
            description: "Please accept the Terms of Service to continue.",
            variant: "destructive"
          });
          return;
        }

        const { error, message } = await signUp(email, password, fullName, referralCode || undefined);
        if (error) {
          toast({
            title: "Registration Failed",
            description: error.message,
            variant: "destructive"
          });
        } else if (message) {
          toast({
            title: "Account Created!",
            description: message
          });
          // Switch to login mode after successful signup
          setIsLogin(true);
          setEmail(email); // Keep the email for easy login
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {isLogin ? 'Welcome Back' : 'Join Forexcomplex'}
          </CardTitle>
          <CardDescription className="text-lg font-medium text-muted-foreground">
            Earn Crypto While You Sleep
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                <Input
                  id="referralCode"
                  type="text"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                />
              </div>
            )}

            {!isLogin && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the Terms of Service
                </Label>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
            </Button>
          </form>

          <Separator className="my-6" />

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="p-0 h-auto font-semibold"
            >
              {isLogin ? 'Create Account' : 'Log In'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;