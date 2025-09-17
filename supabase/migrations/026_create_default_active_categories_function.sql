-- Create function to automatically create default active categories for new businesses
CREATE OR REPLACE FUNCTION create_default_active_categories(business_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert only the categories that should be active by default for new businesses
  INSERT INTO categories (business_id, name, type, description, is_active)
  VALUES 
    -- Income categories (active by default)
    (business_uuid, 'Sales Revenue', 'income', 'Money from selling products or services', true),
    (business_uuid, 'Service Revenue', 'income', 'Money from providing services', true),
    (business_uuid, 'Other Income', 'income', 'Other sources of income', true),
    
    -- Expense categories (active by default)
    (business_uuid, 'Rent & Utilities', 'expense', 'Office rent, electricity, water, internet', true),
    (business_uuid, 'Supplies & Inventory', 'expense', 'Office supplies, raw materials, inventory', true),
    (business_uuid, 'Other Expenses', 'expense', 'Miscellaneous business expenses', true);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create default categories when a new business is created
CREATE OR REPLACE FUNCTION trigger_create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_active_categories(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS create_default_categories_trigger ON businesses;
CREATE TRIGGER create_default_categories_trigger
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_categories();
