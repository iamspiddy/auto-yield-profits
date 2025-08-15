# Admin Panel - Forexcomplex Crypto Trading Platform

A comprehensive admin panel for managing the Forexcomplex crypto trading platform. Built with React, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Features

### Core Admin Functions
- **Secure Admin Authentication** - JWT-based admin login with role verification
- **Dashboard Overview** - Real-time platform metrics and activity feed
- **User Management** - Complete user account management with KYC status tracking
- **Deposit Approval** - Review and approve pending deposits with proof verification
- **Withdrawal Processing** - Process withdrawal requests and mark payments
- **Profit Distribution** - Manual profit distribution to verified users
- **KYC Verification** - Review identity documents and verify user accounts
- **Referral Tracking** - Monitor referral program performance and earnings
- **Activity Logging** - Comprehensive audit trail of all admin actions

### Security Features
- Role-based access control (admin-only routes)
- Secure authentication with Supabase Auth
- Audit logging for all balance changes
- Confirmation dialogs for critical actions
- Input validation and error handling

### UI/UX Features
- Dark theme optimized for admin use
- Responsive design for tablet/desktop
- Real-time data updates
- Search and filtering capabilities
- Export functionality (CSV)
- Toast notifications for user feedback

## 📁 File Structure

```
src/
├── pages/admin/
│   ├── AdminLogin.tsx          # Admin login page
│   ├── AdminDashboard.tsx      # Dashboard overview
│   ├── AdminUsers.tsx          # User management
│   ├── AdminDeposits.tsx       # Deposit approval
│   ├── AdminWithdrawals.tsx    # Withdrawal processing
│   ├── AdminProfits.tsx        # Profit distribution
│   ├── AdminKYC.tsx           # KYC verification
│   ├── AdminReferrals.tsx     # Referral tracking
│   └── AdminLogs.tsx          # Activity logging
├── components/admin/
│   └── AdminLayout.tsx        # Admin layout with sidebar
└── utils/
    └── adminSetup.ts          # Admin role utilities
```

## 🛠️ Setup Instructions

### 1. Database Setup

Ensure your Supabase database has the required tables and functions:

```sql
-- User roles table
CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin role function
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Create Admin User

Use the provided utility functions to create an admin user:

```typescript
import { createTestAdmin } from '@/utils/adminSetup';

// Create test admin (development only)
const result = await createTestAdmin();
console.log('Admin credentials:', result);
```

Or manually set up admin role:

```typescript
import { setupAdminRole } from '@/utils/adminSetup';

// Set admin role for existing user
await setupAdminRole('admin@example.com');
```

### 3. Environment Variables

Ensure your Supabase configuration is properly set up in `src/integrations/supabase/client.ts`.

## 🔐 Admin Access

### Login
- Navigate to `/admin/login`
- Use admin credentials
- System verifies admin role before allowing access

### Role Verification
The admin panel checks for admin role using the `has_role` function:
```sql
SELECT has_role(user_id, 'admin')
```

## 📊 Dashboard Features

### Overview Metrics
- Total users count
- Total deposits amount
- Profit distributed
- Pending withdrawals
- KYC submissions awaiting review

### Quick Actions
- Review KYC applications
- Process pending withdrawals
- Approve deposits
- Distribute profits

## 👥 User Management

### User List
- Search by email, name, or referral code
- Filter by KYC status, balance, etc.
- View detailed user information
- Manage KYC verification status

### User Details
- Complete transaction history
- Balance information
- Referral statistics
- KYC document review

## 💰 Deposit Management

### Approval Process
1. Review pending deposits
2. Verify proof of payment
3. Approve or reject with reason
4. Automatic balance update
5. Referral commission calculation

### Features
- Bulk approval options
- Proof document viewing
- Transaction hash tracking
- Audit logging

## 💸 Withdrawal Processing

### Processing Workflow
1. Review withdrawal requests
2. Process payment externally
3. Mark as paid with transaction hash
4. Update withdrawal status
5. Log admin action

### Features
- Payment confirmation
- Transaction hash tracking
- Rejection with refund
- Export functionality

## 📈 Profit Distribution

### Distribution Types
- **Individual Amount** - Fixed amount per user
- **Equal Split** - Total amount split equally

### Features
- Select multiple users
- Bulk distribution
- Transaction logging
- Balance updates

## 🛡️ KYC Verification

### Verification Process
1. Review uploaded documents
2. Verify identity information
3. Approve or reject with reason
4. Update user status
5. Send notification

### Document Types
- Government ID
- Selfie verification
- Proof of address
- Additional documents

## 🔗 Referral Tracking

### Metrics
- Total referrals count
- Commission earnings
- Conversion rates
- Top referrers

### Features
- Referral relationship mapping
- Commission calculation
- Export functionality
- Performance analytics

## 📋 Activity Logging

### Logged Actions
- Deposit approvals/rejections
- Withdrawal processing
- KYC verifications
- Profit distributions
- User management actions

### Features
- Real-time logging
- Search and filtering
- Date range filtering
- Export to CSV
- Detailed action history

## 🎨 UI Components

### Design System
- Dark theme optimized for admin use
- Consistent color scheme
- Responsive layout
- Accessible components

### Navigation
- Sticky sidebar navigation
- Breadcrumb navigation
- Mobile-responsive menu
- Active state indicators

## 🔧 Development

### Adding New Features
1. Create new admin page component
2. Add route to `App.tsx`
3. Update sidebar navigation
4. Implement role-based access
5. Add to activity logging

### Testing
```bash
# Run development server
npm run dev

# Access admin panel
http://localhost:5173/admin/login
```

### Security Considerations
- All admin routes require authentication
- Role verification on every page load
- Input validation and sanitization
- Audit logging for all actions
- Confirmation dialogs for critical operations

## 📱 Responsive Design

The admin panel is optimized for:
- **Desktop** - Full sidebar navigation
- **Tablet** - Collapsible sidebar
- **Mobile** - Hamburger menu

## 🚀 Deployment

### Production Considerations
1. Set up proper admin roles in production
2. Configure email notifications
3. Set up monitoring and alerts
4. Implement backup strategies
5. Configure security headers

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🔒 Security Best Practices

1. **Role-based Access** - Only admins can access admin routes
2. **Session Management** - Secure session handling
3. **Input Validation** - All inputs validated and sanitized
4. **Audit Logging** - All actions logged with admin details
5. **Confirmation Dialogs** - Critical actions require confirmation
6. **Error Handling** - Graceful error handling and user feedback

## 📞 Support

For issues or questions:
1. Check the database schema and functions
2. Verify admin role setup
3. Review browser console for errors
4. Check Supabase logs for backend issues

## 🔄 Updates

The admin panel is designed to be easily extensible. New features can be added by:
1. Creating new page components
2. Adding routes to the router
3. Updating the sidebar navigation
4. Implementing proper role checks
5. Adding to the activity logging system 