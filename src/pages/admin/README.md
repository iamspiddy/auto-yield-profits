# Admin Panel Documentation

## Overview

The Admin Panel provides a comprehensive interface for managing the AutoYield platform. It includes modules for user management, transaction processing, profit distribution, referral tracking, and activity logging.

## Modules

### 1. Dashboard

The dashboard provides an overview of key platform metrics:
- Total Users
- Pending Deposits
- Pending Withdrawals
- Total Volume
- Active Referrals
- System Status

### 2. User Management

The User Management module allows administrators to:
- View all registered users
- Search and filter users by various criteria
- View detailed user information including:
  - Account balance
  - KYC status
  - Referral information
  - Transaction history (deposits, withdrawals, earnings)

### 3. Deposits Management

The Deposits Management module allows administrators to:
- View all deposit requests
- Filter deposits by status (pending, approved, rejected)
- Review deposit proof images
- Approve or reject deposits with notes
- Process deposits in batch
- Record transaction hashes for approved deposits

### 4. Withdrawals Management

The Withdrawals Management module allows administrators to:
- View all withdrawal requests
- Filter withdrawals by status (pending, processing, completed, rejected)
- Approve, mark as processing, or reject withdrawals
- Add transaction hashes and notes

### 5. Profit Distribution

The Profit Distribution module allows administrators to:
- Distribute profits to users
- Choose between fixed amount or percentage-based distribution
- Select specific users or distribute to all users
- View earnings history
- Process batch distributions

### 6. Referrals Management

The Referrals Management module allows administrators to:
- View all referral relationships
- See referral statistics and analytics
- Adjust commission rates
- Visualize referral trees
- Export referral data

### 7. Activity Log

The Activity Log module provides:
- A comprehensive audit trail of all administrative actions
- Filtering by action type, entity type, and date
- Detailed information about each action including:
  - Admin who performed the action
  - IP address
  - Timestamp
  - Action details

## Technical Implementation

### Database Tables

The admin panel interacts with the following database tables:
- `profiles`: User information
- `user_roles`: Admin role assignments
- `deposits`: Deposit transactions
- `withdrawals`: Withdrawal requests
- `earnings`: User profit distributions
- `referrals`: Referral relationships
- `admin_actions`: Audit log of administrative actions

### Authentication & Authorization

Access to the admin panel is restricted to users with the 'admin' role in the `user_roles` table. The `AdminGuard` component ensures that only authenticated admin users can access the admin routes.

### Logging

All administrative actions are logged to the `admin_actions` table using the `adminLogger` utility. This provides a comprehensive audit trail for compliance and security purposes.

## Best Practices

1. **Always add notes** when approving or rejecting transactions to maintain transparency.
2. **Verify transaction hashes** carefully before recording them.
3. **Use batch operations** for efficiency when processing multiple items.
4. **Check the Activity Log** regularly to monitor administrative actions.
5. **Export data** periodically for backup and reporting purposes.

## Future Enhancements

- Two-factor authentication for admin actions
- Enhanced reporting and analytics
- Customizable admin roles and permissions
- Automated profit distribution scheduling
- Integration with external compliance tools