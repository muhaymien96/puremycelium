-- Add profile management columns to business_settings
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_name text;

-- Set default profile name for existing records
UPDATE business_settings 
SET is_default = true, 
    profile_name = 'BeePure'
WHERE profile_name IS NULL;

-- Add business_profile_id to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS business_profile_id uuid REFERENCES business_settings(id);

-- Backfill existing invoices with the default profile
UPDATE invoices 
SET business_profile_id = (
  SELECT id FROM business_settings WHERE is_default = true LIMIT 1
)
WHERE business_profile_id IS NULL;

-- Create index for faster profile lookups
CREATE INDEX IF NOT EXISTS idx_business_settings_is_default ON business_settings(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_invoices_business_profile_id ON invoices(business_profile_id);