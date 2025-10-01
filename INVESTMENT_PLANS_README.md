# Investment Plans Feature

This document describes the Investment Plans feature implementation with weekly compounding profit.

## Overview

The Investment Plans feature allows users to invest in predefined plans with weekly compound profits. The system includes:

- **4 Default Investment Plans**: Bronze, Silver, Gold, Diamond
- **Weekly Compounding**: Automatic profit calculation and application
- **User Dashboard**: Investment management and tracking
- **Admin Panel**: Plan management and user investment oversight
- **Automated Processing**: Cron job for weekly compounding

## Features

### Investment Plans

| Plan | Min Amount | Weekly Profit | Duration |
|------|------------|---------------|----------|
| Bronze | $200 | 10% | Unlimited |
| Silver | $400 | 20% | Unlimited |
| Gold | $800 | 40% | Unlimited |
| Diamond | $1,200 | 50% | Unlimited |

### User Features

- **Plan Selection**: Choose from available investment plans
- **Investment Form**: Enter amount and view projected returns
- **My Investments**: Track all active investments
- **Real-time Updates**: Current balance and profit tracking
- **Investment Management**: Pause/resume investments

### Admin Features

- **Plan Management**: Create, edit, and manage investment plans
- **User Investment Oversight**: Monitor all user investments
- **Weekly Compounding**: Manual and automated compounding
- **Statistics**: Investment analytics and reporting

## Database Schema

### Tables Created

1. **investment_plans**: Stores investment plan definitions
2. **investments**: User investment records
3. **investment_compounds**: Weekly compounding history

### Key Fields

```sql
-- investment_plans
- id (UUID, Primary Key)
- plan_name (TEXT)
- min_amount (DECIMAL)
- weekly_profit_percent (DECIMAL)
- duration_weeks (INTEGER, NULL for unlimited)
- is_active (BOOLEAN)

-- investments
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- plan_id (UUID, Foreign Key)
- invested_amount (DECIMAL)
- current_balance (DECIMAL)
- total_profit_earned (DECIMAL)
- status (TEXT: active, paused, completed, cancelled)
- start_date (TIMESTAMP)
- next_compound_date (TIMESTAMP)

-- investment_compounds
- id (UUID, Primary Key)
- investment_id (UUID, Foreign Key)
- compound_date (TIMESTAMP)
- balance_before (DECIMAL)
- profit_amount (DECIMAL)
- balance_after (DECIMAL)
```

## API Endpoints

### User Endpoints

- `GET /api/investment-plans` - Get available plans
- `POST /api/investments` - Create new investment
- `GET /api/investments` - Get user investments
- `PUT /api/investments/:id/status` - Update investment status

### Admin Endpoints

- `GET /api/admin/investment-plans` - Get all plans
- `POST /api/admin/investment-plans` - Create plan
- `PUT /api/admin/investment-plans/:id` - Update plan
- `DELETE /api/admin/investment-plans/:id` - Delete plan
- `POST /api/admin/compound-weekly` - Apply weekly compounding

## Components

### User Components

- **InvestmentPlans**: Plan selection interface
- **InvestmentForm**: Investment creation form
- **MyInvestments**: Investment tracking dashboard

### Admin Components

- **AdminInvestmentPlans**: Plan management interface
- **AdminUserInvestments**: User investment oversight

## Services

### InvestmentService

Main service class for investment operations:

```typescript
class InvestmentService {
  static async getInvestmentPlans(): Promise<InvestmentPlan[]>
  static async createInvestment(planId: string, amount: number, userId: string): Promise<Investment>
  static async getUserInvestments(userId: string): Promise<InvestmentWithPlan[]>
  static async applyWeeklyCompounding(): Promise<CompoundResult[]>
  static calculateProjectedReturns(amount: number, weeklyProfitPercent: number, weeks: number)
}
```

### CompoundingAutomation

Automated compounding system:

```typescript
class CompoundingAutomation {
  static async applyWeeklyCompounding(): Promise<CompoundingResult>
  static async getInvestmentsDueForCompounding(): Promise<number>
  static async getCompoundingStats(): Promise<CompoundingStats>
}
```

## Weekly Compounding Logic

### Formula

```
profit = current_balance × (weekly_profit_percent / 100)
new_balance = current_balance + profit
```

### Example

User invests $400 in Silver plan (20% weekly):

- **Week 1**: $400 → $480 (+$80)
- **Week 2**: $480 → $576 (+$96)
- **Week 3**: $576 → $691.20 (+$115.20)
- **Week 4**: $691.20 → $829.44 (+$138.24)

### Automation

The system includes automated weekly compounding:

1. **Cron Job**: Runs every Sunday at midnight
2. **Database Function**: `apply_weekly_compounding()`
3. **Error Handling**: Graceful failure handling
4. **Logging**: Comprehensive operation logging

## Security Features

### Row Level Security (RLS)

- Users can only view their own investments
- Admins have full access to all data
- Plan data is publicly readable

### Data Validation

- Minimum amount validation
- Plan existence verification
- User authentication checks
- Input sanitization

## Performance Optimizations

### Database Indexes

```sql
CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_investments_plan_id ON investments(plan_id);
CREATE INDEX idx_investments_status ON investments(status);
CREATE INDEX idx_investments_next_compound_date ON investments(next_compound_date);
```

### Caching

- Plan data caching
- User investment caching
- Statistics caching

## Testing

### Unit Tests

```typescript
// Test investment creation
test('should create investment with valid data', async () => {
  const investment = await InvestmentService.createInvestment(
    planId, 
    500, 
    userId
  );
  expect(investment.invested_amount).toBe(500);
});

// Test compounding calculation
test('should calculate correct weekly profit', () => {
  const profit = InvestmentService.calculateProjectedReturns(
    400, 
    20, 
    4
  );
  expect(profit[3].balance).toBe(829.44);
});
```

### Integration Tests

- Database function testing
- API endpoint testing
- Compounding automation testing

## Deployment

### Environment Variables

```env
# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Compounding
CRON_SECRET=your-cron-secret
DEBUG_COMPOUNDING=false
```

### Database Migration

Run the migration to create tables and functions:

```bash
supabase db push
```

### Cron Job Setup

See `COMPOUNDING_AUTOMATION_SETUP.md` for detailed setup instructions.

## Monitoring

### Key Metrics

- Total active investments
- Weekly compounding success rate
- Average investment amounts
- Plan popularity

### Alerts

- Compounding failures
- Database errors
- High error rates
- Performance issues

## Troubleshooting

### Common Issues

1. **Compounding not running**: Check cron job configuration
2. **Database errors**: Verify table permissions
3. **User access issues**: Check RLS policies
4. **Performance issues**: Review database indexes

### Debug Mode

Enable debug logging:

```env
DEBUG_COMPOUNDING=true
```

## Future Enhancements

### Planned Features

- **Daily Compounding**: Option for daily instead of weekly
- **Custom Plans**: User-defined investment plans
- **Investment Limits**: Maximum investment amounts
- **Withdrawal Options**: Early withdrawal with penalties
- **Referral Bonuses**: Investment-based referral rewards

### Technical Improvements

- **Real-time Updates**: WebSocket integration
- **Advanced Analytics**: Detailed investment analytics
- **Mobile Optimization**: Enhanced mobile experience
- **API Rate Limiting**: Advanced rate limiting
- **Audit Logging**: Comprehensive audit trails

## Support

For technical support:

1. Check application logs
2. Verify database connectivity
3. Test manual compounding
4. Review cron job status
5. Contact development team

## License

This feature is part of the main application and follows the same licensing terms.
