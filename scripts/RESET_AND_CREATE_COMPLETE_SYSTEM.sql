-- =====================================================
-- SCRIPT COMPLETO PARA RESETEAR Y CREAR SISTEMA DE NÓMINA
-- Este script elimina todo excepto usuarios y empresa
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR TABLAS EXISTENTES (excepto usuarios y empresa)
-- =====================================================

-- Eliminar funciones RPC si existen
DROP FUNCTION IF EXISTS get_complete_payroll_data(UUID, UUID);

-- Eliminar tablas en orden correcto (respetando foreign keys)
DROP TABLE IF EXISTS payroll_deductions CASCADE;
DROP TABLE IF EXISTS payroll_concepts CASCADE;
DROP TABLE IF EXISTS payroll_summary CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Eliminar índices específicos si existen
DROP INDEX IF EXISTS idx_employees_company_id;
DROP INDEX IF EXISTS idx_employees_cedula;
DROP INDEX IF EXISTS idx_employees_contract_type;
DROP INDEX IF EXISTS idx_payroll_periods_company_id;
DROP INDEX IF EXISTS idx_payroll_summary_period_employee;
DROP INDEX IF EXISTS idx_payroll_concepts_period_employee;
DROP INDEX IF EXISTS idx_payroll_deductions_period_employee;

-- =====================================================
-- PASO 2: ACTUALIZAR TABLA COMPANIES (agregar campos nuevos)
-- =====================================================

-- Agregar campos de representante legal si no existen
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nombre_representante TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tipo_documento_representante TEXT 
  CHECK (tipo_documento_representante IN ('CC', 'CE', 'PP', 'NIT'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS numero_documento_representante TEXT;

-- Agregar comentarios
COMMENT ON COLUMN companies.nombre_representante IS 'Nombre completo del representante legal';
COMMENT ON COLUMN companies.tipo_documento_representante IS 'Tipo de documento del representante legal (CC, CE, PP, NIT)';
COMMENT ON COLUMN companies.numero_documento_representante IS 'Número de documento del representante legal';

-- =====================================================
-- PASO 3: CREAR TABLA EMPLOYEES (con todos los campos nuevos)
-- =====================================================

CREATE TABLE employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cedula VARCHAR(20) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  position VARCHAR(100),
  department VARCHAR(100),
  centro_costo VARCHAR(50) NOT NULL,
  contract_number VARCHAR(50) NOT NULL,
  hire_date DATE NOT NULL,
  salary_type VARCHAR(20) NOT NULL DEFAULT 'FIJO' CHECK (salary_type IN ('FIJO', 'VARIABLE')),
  base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  afp VARCHAR(100),
  eps VARCHAR(100),
  contract_type VARCHAR(20) NOT NULL DEFAULT 'NOMINA' CHECK (contract_type IN ('NOMINA', 'OPS')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'INACTIVO')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_cedula_per_company UNIQUE (company_id, cedula),
  CONSTRAINT unique_contract_per_company UNIQUE (company_id, contract_number)
);

-- Índices para employees
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_cedula ON employees(cedula);
CREATE INDEX idx_employees_contract_type ON employees(contract_type);
CREATE INDEX idx_employees_status ON employees(status);

-- Comentarios para employees
COMMENT ON TABLE employees IS 'Tabla de empleados con soporte para NOMINA y OPS';
COMMENT ON COLUMN employees.email IS 'Email del empleado (requerido para envío de documentos)';
COMMENT ON COLUMN employees.phone IS 'Teléfono del empleado';
COMMENT ON COLUMN employees.position IS 'Cargo/posición del empleado';
COMMENT ON COLUMN employees.department IS 'Departamento donde trabaja';
COMMENT ON COLUMN employees.contract_type IS 'Tipo de contrato: NOMINA (nómina) o OPS (servicios)';

-- RLS para employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employees from their company" ON employees
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert employees to their company" ON employees
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update employees from their company" ON employees
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- PASO 4: CREAR TABLA PAYROLL_PERIODS
-- =====================================================

CREATE TABLE payroll_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'CALCULADA', 'PROCESADA', 'ENVIADA')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_period_per_company UNIQUE (company_id, period_number),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Índices para payroll_periods
CREATE INDEX idx_payroll_periods_company_id ON payroll_periods(company_id);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);

-- Comentarios
COMMENT ON TABLE payroll_periods IS 'Períodos de nómina por empresa';

-- RLS para payroll_periods
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage payroll periods from their company" ON payroll_periods
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- PASO 5: CREAR TABLA PAYROLL_SUMMARY
-- =====================================================

CREATE TABLE payroll_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  total_earned DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_pay DECIMAL(15,2) NOT NULL DEFAULT 0,
  payslip_sent BOOLEAN NOT NULL DEFAULT FALSE,
  payslip_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_employee_per_period UNIQUE (payroll_period_id, employee_id),
  CONSTRAINT non_negative_amounts CHECK (
    total_earned >= 0 AND 
    total_deductions >= 0 AND 
    net_pay >= 0
  )
);

-- Índices para payroll_summary
CREATE INDEX idx_payroll_summary_period_employee ON payroll_summary(payroll_period_id, employee_id);
CREATE INDEX idx_payroll_summary_sent ON payroll_summary(payslip_sent);

-- Comentarios
COMMENT ON TABLE payroll_summary IS 'Resumen de nómina por empleado y período';

-- RLS para payroll_summary
ALTER TABLE payroll_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage payroll summary from their company" ON payroll_summary
  FOR ALL USING (
    payroll_period_id IN (
      SELECT pp.id FROM payroll_periods pp
      JOIN profiles p ON p.company_id = pp.company_id
      WHERE p.id = auth.uid()
    )
  );

-- =====================================================
-- PASO 6: CREAR TABLA PAYROLL_CONCEPTS
-- =====================================================

CREATE TABLE payroll_concepts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  concept_code VARCHAR(10) NOT NULL,
  concept_name VARCHAR(255) NOT NULL,
  days_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  unit_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT non_negative_concept_values CHECK (
    days_hours >= 0 AND 
    unit_value >= 0 AND 
    total_value >= 0
  )
);

-- Índices para payroll_concepts
CREATE INDEX idx_payroll_concepts_period_employee ON payroll_concepts(payroll_period_id, employee_id);

-- Comentarios
COMMENT ON TABLE payroll_concepts IS 'Conceptos de pago (devengados) por empleado y período';

-- RLS para payroll_concepts
ALTER TABLE payroll_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage payroll concepts from their company" ON payroll_concepts
  FOR ALL USING (
    payroll_period_id IN (
      SELECT pp.id FROM payroll_periods pp
      JOIN profiles p ON p.company_id = pp.company_id
      WHERE p.id = auth.uid()
    )
  );

-- =====================================================
-- PASO 7: CREAR TABLA PAYROLL_DEDUCTIONS
-- =====================================================

CREATE TABLE payroll_deductions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  deduction_code VARCHAR(10) NOT NULL,
  deduction_name VARCHAR(255) NOT NULL,
  base_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  percentage DECIMAL(5,4) NOT NULL DEFAULT 0,
  deduction_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT non_negative_deduction_values CHECK (
    base_amount >= 0 AND 
    percentage >= 0 AND 
    deduction_value >= 0
  )
);

-- Índices para payroll_deductions
CREATE INDEX idx_payroll_deductions_period_employee ON payroll_deductions(payroll_period_id, employee_id);

-- Comentarios
COMMENT ON TABLE payroll_deductions IS 'Deducciones por empleado y período';

-- RLS para payroll_deductions
ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage payroll deductions from their company" ON payroll_deductions
  FOR ALL USING (
    payroll_period_id IN (
      SELECT pp.id FROM payroll_periods pp
      JOIN profiles p ON p.company_id = pp.company_id
      WHERE p.id = auth.uid()
    )
  );

-- =====================================================
-- PASO 8: CREAR FUNCIÓN RPC PARA OBTENER DATOS COMPLETOS
-- =====================================================

CREATE OR REPLACE FUNCTION get_complete_payroll_data(
  p_period_id UUID,
  p_employee_id UUID
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'company', json_build_object(
      'id', c.id,
      'name', c.name,
      'nit', c.nit,
      'address', c.address,
      'phone', c.phone,
      'email', c.email,
      'nombre_representante', c.nombre_representante,
      'tipo_documento_representante', c.tipo_documento_representante,
      'numero_documento_representante', c.numero_documento_representante
    ),
    'period', json_build_object(
      'id', pp.id,
      'period_number', pp.period_number,
      'start_date', pp.start_date,
      'end_date', pp.end_date,
      'status', pp.status
    ),
    'employee', json_build_object(
      'id', e.id,
      'cedula', e.cedula,
      'full_name', e.full_name,
      'email', e.email,
      'phone', e.phone,
      'position', e.position,
      'department', e.department,
      'centro_costo', e.centro_costo,
      'contract_number', e.contract_number,
      'hire_date', e.hire_date,
      'salary_type', e.salary_type,
      'base_salary', e.base_salary,
      'bank_name', e.bank_name,
      'account_number', e.account_number,
      'afp', e.afp,
      'eps', e.eps,
      'contract_type', e.contract_type,
      'status', e.status
    ),
    'summary', json_build_object(
      'id', ps.id,
      'total_earned', ps.total_earned,
      'total_deductions', ps.total_deductions,
      'net_pay', ps.net_pay,
      'payslip_sent', ps.payslip_sent,
      'payslip_sent_at', ps.payslip_sent_at
    ),
    'concepts', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'id', pc.id,
          'concept_code', pc.concept_code,
          'concept_name', pc.concept_name,
          'days_hours', pc.days_hours,
          'unit_value', pc.unit_value,
          'total_value', pc.total_value
        )
      ) FROM payroll_concepts pc 
      WHERE pc.payroll_period_id = p_period_id AND pc.employee_id = p_employee_id),
      '[]'::json
    ),
    'deductions', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'id', pd.id,
          'concept_code', pd.deduction_code,
          'concept_name', pd.deduction_name,
          'percentage', pd.percentage,
          'base_value', pd.base_amount,
          'total_value', pd.deduction_value
        )
      ) FROM payroll_deductions pd 
      WHERE pd.payroll_period_id = p_period_id AND pd.employee_id = p_employee_id),
      '[]'::json
    )
  ) INTO result
  FROM payroll_periods pp
  JOIN companies c ON c.id = pp.company_id
  JOIN payroll_summary ps ON ps.payroll_period_id = pp.id
  JOIN employees e ON e.id = ps.employee_id
  WHERE pp.id = p_period_id 
    AND e.id = p_employee_id
    AND ps.employee_id = p_employee_id;
    
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_complete_payroll_data(UUID, UUID) TO authenticated;

-- =====================================================
-- PASO 9: INSERTAR DATOS DE EJEMPLO
-- =====================================================

-- Insertar empleado de ejemplo (actualiza según tu empresa)
-- NOTA: Reemplaza 'tu-company-id' con el ID real de tu empresa
/*
INSERT INTO employees (
  company_id,
  cedula,
  full_name,
  email,
  phone,
  position,
  department,
  centro_costo,
  contract_number,
  hire_date,
  salary_type,
  base_salary,
  bank_name,
  account_number,
  afp,
  eps,
  contract_type,
  status
) VALUES (
  'tu-company-id', -- Reemplaza con tu ID de empresa
  '1007398493',
  'MARLON ANDRES BUELVAS TELLEZ',
  'marlonbuelvas314@gmail.com',
  '3245653729',
  'Administrador',
  'Sistemas',
  'CC001',
  '08',
  '2025-09-01',
  'FIJO',
  1600000,
  'Bancolombia',
  '52391565295',
  'Porvenir',
  'Sura',
  'NOMINA',
  'ACTIVO'
);
*/

-- =====================================================
-- FINALIZACIÓN
-- =====================================================

-- Mensaje de finalización
DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT COMPLETADO EXITOSAMENTE';
  RAISE NOTICE '📋 Tablas creadas: employees, payroll_periods, payroll_summary, payroll_concepts, payroll_deductions';
  RAISE NOTICE '🔧 Función RPC creada: get_complete_payroll_data()';
  RAISE NOTICE '🔒 Políticas RLS aplicadas';
  RAISE NOTICE '📝 SIGUIENTE PASO: Actualizar el INSERT de ejemplo con tu company_id real';
  RAISE NOTICE '🎉 Sistema de nómina diferenciado NOMINA/OPS listo para usar';
END $$;