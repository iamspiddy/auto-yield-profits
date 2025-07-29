import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  Banknote, 
  TrendingUp, 
  UserPlus, 
  Activity,
  Menu,
  X,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Deposits', href: '/admin/deposits', icon: CreditCard },
  { name: 'Withdrawals', href: '/admin/withdrawals', icon: Banknote },
  { name: 'Profit Distribution', href: '/admin/profits', icon: TrendingUp },
  { name: 'Referrals', href: '/admin/referrals', icon: UserPlus },
  { name: 'Activity Log', href: '/admin/activity', icon: Activity },
];

export const AdminSidebar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const NavItems = () => (
    <nav className="space-y-2">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <NavLink
            key={item.name}
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            onClick={() => setIsMobileOpen(false)}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-background border-r">
        <div className="flex flex-col flex-grow pt-6 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <div className="mt-4 flex-grow flex flex-col px-4">
            <NavItems />
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 flex z-40">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsMobileOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-background">
            <div className="flex flex-col flex-grow pt-6 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4 mb-8">
                <h1 className="text-xl font-bold">Admin Panel</h1>
              </div>
              <div className="mt-4 flex-grow flex flex-col px-4">
                <NavItems />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};