// Simple test to check customer creation
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCustomerCreation() {
  try {
    console.log('Testing customer creation...');
    
    // Test data
    const testData = {
      business_id: 'test-business-id', // This will fail, but we'll see the error
      name: 'Test Customer',
      email: 'test@example.com',
      customer_type: 'individual'
    };
    
    console.log('Attempting to insert:', testData);
    
    const { data, error } = await supabase
      .from('customers')
      .insert(testData)
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
    } else {
      console.log('Success:', data);
    }
  } catch (err) {
    console.error('JavaScript error:', err);
  }
}

testCustomerCreation();

