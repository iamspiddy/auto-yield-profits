import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    // If no user is logged in, redirect to admin login
    if (!user) {
      navigate('/admin/login', { 
        replace: true,
        state: { from: location.pathname }
      });
      return;
    }

    try {
      setIsChecking(true);
      
      // Check if user has admin role
      const { data: hasRole, error } = await supabase
        .rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

      if (error) {
        console.error('Error checking admin role:', error);
        toast({
          title: "Access Denied",
          description: "Admin privileges required. Please contact system administrator.",
          variant: "destructive"
        });
        await signOut();
        navigate('/admin/login', { 
          replace: true,
          state: { from: location.pathname }
        });
        return;
      }

      if (!hasRole) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required",
          variant: "destructive"
        });
        await signOut();
        navigate('/admin/login', { 
          replace: true,
          state: { from: location.pathname }
        });
        return;
      }

      // User has admin access
      setHasAccess(true);
      console.log('Admin access verified successfully');
      
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast({
        title: "Access Denied",
        description: "Unable to verify admin privileges. Please try again.",
        variant: "destructive"
      });
      await signOut();
      navigate('/admin/login', { 
        replace: true,
        state: { from: location.pathname }
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Show loading spinner while checking access
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // If access is denied, don't render children
  if (!hasAccess) {
    return null;
  }

  // Render children if access is granted
  return <>{children}</>;
};

export default AdminRouteGuard; 