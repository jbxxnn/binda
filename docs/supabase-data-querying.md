# Supabase Data Querying in Next.js

This document outlines the patterns for querying Supabase data in Next.js applications, specifically for the Binda project.

## Server Components (Recommended for Initial Data Loading)

Use Server Components for initial data loading and SEO-friendly pages. These run on the server and have access to the full request context.

### Pattern: Async Server Component

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: notes } = await supabase.from('notes').select()

  return <pre>{JSON.stringify(notes, null, 2)}</pre>
}
```

### Benefits of Server Components:
- ✅ Runs on server (better performance)
- ✅ SEO-friendly (data pre-rendered)
- ✅ Access to full request context
- ✅ Automatic caching
- ✅ No client-side JavaScript needed

### When to Use Server Components:
- Initial page loads
- Data that doesn't change frequently
- SEO-critical pages
- Dashboard overviews
- Static content

## Client Components (For Interactive Data)

Use Client Components for interactive features, real-time updates, and user interactions.

### Pattern: Client Component with useEffect

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function Page() {
  const [notes, setNotes] = useState<any[] | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data } = await supabase.from('notes').select()
      setNotes(data)
    }
    getData()
  }, [])

  return <pre>{JSON.stringify(notes, null, 2)}</pre>
}
```

### Benefits of Client Components:
- ✅ Interactive features
- ✅ Real-time updates
- ✅ User interactions
- ✅ Form handling
- ✅ State management

### When to Use Client Components:
- Forms and user input
- Real-time data updates
- Interactive dashboards
- Search and filtering
- CRUD operations

## Binda-Specific Examples

### 1. Business Dashboard (Server Component)

```typescript
// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  
  // Get user's business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()
  
  if (!business) redirect('/setup-business')
  
  // Get business statistics
  const { data: stats } = await supabase
    .from('business_dashboard_stats')
    .select('*')
    .eq('business_id', business.id)
    .single()
  
  return (
    <div>
      <h1>Welcome to {business.name}</h1>
      <p>Total Customers: {stats?.total_customers || 0}</p>
      <p>Total Revenue: ${stats?.total_revenue || 0}</p>
    </div>
  )
}
```

### 2. Customer List (Server Component with Client Interactions)

```typescript
// app/customers/page.tsx
import { createClient } from '@/lib/supabase/server'
import { CustomerList } from '@/components/customer-list'

export default async function CustomersPage() {
  const supabase = await createClient()
  
  // Get current user's business
  const { data: { user } } = await supabase.auth.getUser()
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  
  // Get customers
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
  
  return <CustomerList initialCustomers={customers} />
}
```

### 3. Customer Management (Client Component)

```typescript
// components/customer-list.tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface CustomerListProps {
  initialCustomers: any[]
}

export function CustomerList({ initialCustomers }: CustomerListProps) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const addCustomer = async (customerData: any) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
      
      if (error) throw error
      setCustomers(prev => [data[0], ...prev])
    } catch (error) {
      console.error('Error adding customer:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCustomer = async (customerId: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
      
      if (error) throw error
      setCustomers(prev => prev.filter(c => c.id !== customerId))
    } catch (error) {
      console.error('Error deleting customer:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Customer list UI */}
    </div>
  )
}
```

## Best Practices

### 1. Use Server Components by Default
- Start with Server Components for initial data loading
- Only use Client Components when you need interactivity

### 2. Combine Both Patterns
- Use Server Components for initial data
- Pass data as props to Client Components
- Client Components handle updates and interactions

### 3. Error Handling
```typescript
const { data, error } = await supabase.from('table').select()

if (error) {
  console.error('Database error:', error)
  // Handle error appropriately
  return <div>Error loading data</div>
}

if (!data) {
  return <div>No data found</div>
}
```

### 4. Loading States
```typescript
const [isLoading, setIsLoading] = useState(false)

const handleAction = async () => {
  setIsLoading(true)
  try {
    // Perform action
  } finally {
    setIsLoading(false)
  }
}
```

### 5. Real-time Updates
```typescript
useEffect(() => {
  const channel = supabase
    .channel('customers')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'customers' },
      (payload) => {
        setCustomers(prev => [payload.new, ...prev])
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [])
```

## Security Considerations

### 1. Row Level Security (RLS)
- Always ensure RLS policies are properly configured
- Test that users can only access their own data

### 2. Input Validation
- Validate all user inputs on both client and server
- Use TypeScript for type safety

### 3. Error Messages
- Don't expose sensitive database errors to users
- Log detailed errors server-side only

## Performance Tips

### 1. Selective Queries
```typescript
// Good: Only select needed fields
const { data } = await supabase
  .from('customers')
  .select('id, name, email, created_at')

// Avoid: Selecting all fields
const { data } = await supabase
  .from('customers')
  .select('*')
```

### 2. Pagination
```typescript
const { data } = await supabase
  .from('customers')
  .select('*')
  .range(0, 9) // First 10 records
  .order('created_at', { ascending: false })
```

### 3. Caching
- Server Components are automatically cached
- Use React Query or SWR for client-side caching if needed

---

*This document is part of the Binda project documentation and should be updated as patterns evolve.*
