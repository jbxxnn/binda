# Binda Database Schema

This directory contains the SQL migration files for the Binda multi-tenant SaaS platform.

## 🗄️ Database Structure

### Core Tables

1. **`businesses`** - Stores business account information
   - Each business has a unique slug for subdomain routing
   - Subscription plan and status tracking
   - Business-specific settings in JSONB format

2. **`business_users`** - Many-to-many relationship between businesses and users
   - Role-based access control (owner, admin, employee)
   - Custom permissions per user
   - Automatic business owner assignment

3. **`customers`** - Customer records per business
   - Phone numbers are unique within each business
   - Full-text search support for names and notes

4. **`transactions`** - Sales and service records
   - Linked to customers and businesses
   - Support for different transaction types
   - Status tracking (pending, completed, cancelled)

5. **`invoices`** - Invoice generation and tracking
   - Auto-generated invoice numbers per business
   - Delivery method tracking
   - PDF storage paths

### Views

- **`customer_details`** - Customer info with transaction summaries
- **`transaction_details`** - Transactions with customer information
- **`business_dashboard_stats`** - Business performance metrics
- **`recent_activity`** - Recent activity feed

### Helper Functions

- **`user_belongs_to_business()`** - Check user access to business
- **`get_user_business_role()`** - Get user's role in business
- **`is_business_owner()`** - Check if user owns business
- **`get_user_businesses()`** - Get all businesses for user
- **`get_business_stats()`** - Get business statistics
- **`get_business_performance_metrics()`** - Detailed performance metrics

## 🔒 Security Features

### Row Level Security (RLS)
- Complete data isolation between businesses
- Users can only access data from businesses they belong to
- Business owners have full access to their business data
- Employees have limited access based on their role

### Data Validation
- Phone numbers unique within each business
- Invoice numbers unique within each business
- Amount validation (non-negative)
- Enum constraints for status fields

## 🚀 Getting Started

1. **Run Migrations**
   ```bash
   # Apply all migrations in order
   supabase db reset
   ```

2. **Verify Setup**
   ```sql
   -- Check if all tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

3. **Test RLS Policies**
   ```sql
   -- Test business isolation
   SELECT * FROM businesses;
   SELECT * FROM customers;
   ```

## 📊 Sample Data

The `007_create_sample_data.sql` file includes sample data for testing:
- 1 sample business
- 3 sample customers
- 3 sample transactions
- 1 sample invoice

## 🔧 Maintenance

### Cleanup Function
The `cleanup_old_data()` function removes:
- Cancelled transactions older than 2 years
- Customers with no transactions older than 1 year

### Performance Monitoring
- Comprehensive indexing for common queries
- Full-text search indexes
- Composite indexes for business-specific queries

## 📝 Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE`
- UUIDs are used for all primary keys
- Business isolation is enforced at the database level
- Real-time notifications via PostgreSQL NOTIFY
- Automatic invoice number generation
- Comprehensive audit trail with created_at/updated_at

## 🚨 Important

- **Never run sample data in production**
- **Test RLS policies thoroughly**
- **Monitor performance with large datasets**
- **Regular backups of business data**

