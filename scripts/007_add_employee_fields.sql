-- Migration 007: Add email and contract fields to employees
-- This migration adds the new fields we implemented in the forms

-- Add new columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS position VARCHAR(100),
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) DEFAULT 'NOMINA' CHECK (contract_type IN ('NOMINA', 'OPS'));

-- Update existing employees to have default contract_type if null
UPDATE employees 
SET contract_type = 'NOMINA' 
WHERE contract_type IS NULL;

-- Create index for better performance on contract_type queries
CREATE INDEX IF NOT EXISTS idx_employees_contract_type ON employees(contract_type);

-- Add comments for documentation
COMMENT ON COLUMN employees.email IS 'Email address of the employee';
COMMENT ON COLUMN employees.phone IS 'Phone number of the employee';
COMMENT ON COLUMN employees.position IS 'Job position/title of the employee';
COMMENT ON COLUMN employees.department IS 'Department where the employee works';
COMMENT ON COLUMN employees.contract_type IS 'Type of contract: NOMINA (payroll) or OPS (services)';

-- Update RLS policies if needed (ensure they still work with new columns)
-- The existing RLS policies should automatically apply to the new columns
-- since they filter by company_id which remains unchanged