-- Crear tabla de empresas
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nit TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de usuarios del sistema (administradores de nómina)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de empleados
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cedula TEXT NOT NULL,
  full_name TEXT NOT NULL,
  centro_costo TEXT,
  contract_number TEXT,
  hire_date DATE NOT NULL,
  salary_type TEXT DEFAULT 'FIJO' CHECK (salary_type IN ('FIJO', 'VARIABLE')),
  base_salary DECIMAL(12,2) NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  afp TEXT,
  eps TEXT,
  status TEXT DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'INACTIVO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, cedula)
);

-- Crear tabla de períodos de nómina
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'PROCESADA', 'ENVIADA')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, period_number)
);

-- Crear tabla de conceptos de nómina (devengados)
CREATE TABLE IF NOT EXISTS payroll_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  concept_code TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  days_hours DECIMAL(8,2) DEFAULT 0,
  unit_value DECIMAL(12,2) DEFAULT 0,
  total_value DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de descuentos de nómina
CREATE TABLE IF NOT EXISTS payroll_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  deduction_code TEXT NOT NULL,
  deduction_name TEXT NOT NULL,
  base_amount DECIMAL(12,2) NOT NULL,
  percentage DECIMAL(5,2) DEFAULT 0,
  deduction_value DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de resumen de nómina por empleado
CREATE TABLE IF NOT EXISTS payroll_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
  payslip_sent BOOLEAN DEFAULT FALSE,
  payslip_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(payroll_period_id, employee_id)
);

-- Habilitar Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_summary ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para companies
CREATE POLICY "Users can view their company" ON companies FOR SELECT USING (
  id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update their company" ON companies FOR UPDATE USING (
  id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas RLS para employees
CREATE POLICY "Users can view employees from their company" ON employees FOR SELECT USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can insert employees to their company" ON employees FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update employees from their company" ON employees FOR UPDATE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete employees from their company" ON employees FOR DELETE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Políticas RLS para payroll_periods
CREATE POLICY "Users can view payroll periods from their company" ON payroll_periods FOR SELECT USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can insert payroll periods to their company" ON payroll_periods FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update payroll periods from their company" ON payroll_periods FOR UPDATE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete payroll periods from their company" ON payroll_periods FOR DELETE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Políticas RLS para payroll_concepts
CREATE POLICY "Users can view payroll concepts from their company" ON payroll_concepts FOR SELECT USING (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert payroll concepts to their company" ON payroll_concepts FOR INSERT WITH CHECK (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update payroll concepts from their company" ON payroll_concepts FOR UPDATE USING (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete payroll concepts from their company" ON payroll_concepts FOR DELETE USING (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Políticas RLS similares para payroll_deductions y payroll_summary
CREATE POLICY "Users can view payroll deductions from their company" ON payroll_deductions FOR SELECT USING (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert payroll deductions to their company" ON payroll_deductions FOR INSERT WITH CHECK (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update payroll deductions from their company" ON payroll_deductions FOR UPDATE USING (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete payroll deductions from their company" ON payroll_deductions FOR DELETE USING (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view payroll summary from their company" ON payroll_summary FOR SELECT USING (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert payroll summary to their company" ON payroll_summary FOR INSERT WITH CHECK (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update payroll summary from their company" ON payroll_summary FOR UPDATE USING (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete payroll summary from their company" ON payroll_summary FOR DELETE USING (
  payroll_period_id IN (
    SELECT id FROM payroll_periods WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);
