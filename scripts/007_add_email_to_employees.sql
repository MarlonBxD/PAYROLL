-- Add additional employee fields for better employee management
-- This migration adds email, phone, position, and department fields to the employees table

-- Add email column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT;

-- Add phone column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add position column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS position TEXT;

-- Add department column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department TEXT;

-- Add contract_type column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'NOMINA' CHECK (contract_type IN ('NOMINA', 'OPS'));

-- Add comments to document the columns
COMMENT ON COLUMN employees.email IS 'Employee email address for communication and payslip delivery';
COMMENT ON COLUMN employees.phone IS 'Employee phone number for communication';
COMMENT ON COLUMN employees.position IS 'Employee job position or role';
COMMENT ON COLUMN employees.department IS 'Employee department or area';
COMMENT ON COLUMN employees.contract_type IS 'Employee contract type (NOMINA or OPS)';

-- Optionally, you can add indexes for better performance if you plan to search by these fields frequently
-- CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
-- CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position);
-- CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- Update any existing employees with placeholder data if needed (optional)
-- UPDATE employees SET email = CONCAT(LOWER(REPLACE(full_name, ' ', '.')), '@company.com') WHERE email IS NULL;
-- UPDATE employees SET position = 'No especificado' WHERE position IS NULL;
-- UPDATE employees SET department = 'General' WHERE department IS NULL;