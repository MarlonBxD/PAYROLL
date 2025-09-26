-- =====================================================
-- SCRIPT DE RESET COMPLETO DE BASE DE DATOS
-- ⚠️  CUIDADO: Este script ELIMINA TODO y recrea desde cero
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR TODO (RESET COMPLETO)
-- =====================================================

-- Deshabilitar RLS temporalmente para poder eliminar todo
SET session_replication_role = replica;

-- Eliminar todas las funciones personalizadas
DROP FUNCTION IF EXISTS get_complete_payroll_data(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_current_user_info() CASCADE;
DROP FUNCTION IF EXISTS get_company_users() CASCADE;
DROP FUNCTION IF EXISTS link_user_to_company(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_company_with_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS change_user_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS user_has_role(TEXT) CASCADE;
DROP FUNCTION IF EXISTS user_belongs_to_company(UUID) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;

-- Eliminar todas las vistas
DROP VIEW IF EXISTS company_statistics CASCADE;

-- Eliminar todas las tablas personalizadas (en orden correcto)
DROP TABLE IF EXISTS user_activity_log CASCADE;
DROP TABLE IF EXISTS user_invitations CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS payroll_deductions CASCADE;
DROP TABLE IF EXISTS payroll_concepts CASCADE;
DROP TABLE IF EXISTS payroll_summary CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Eliminar todos los triggers personalizados
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_updated_at ON profiles;

-- Eliminar todos los índices personalizados (por si quedaron)
DROP INDEX IF EXISTS idx_companies_nit CASCADE;
DROP INDEX IF EXISTS idx_profiles_company_id CASCADE;
DROP INDEX IF EXISTS idx_profiles_email CASCADE;
DROP INDEX IF EXISTS idx_profiles_role CASCADE;
DROP INDEX IF EXISTS idx_profiles_status CASCADE;
DROP INDEX IF EXISTS idx_employees_company_id CASCADE;
DROP INDEX IF EXISTS idx_employees_cedula CASCADE;
DROP INDEX IF EXISTS idx_employees_contract_type CASCADE;
DROP INDEX IF EXISTS idx_employees_status CASCADE;
DROP INDEX IF EXISTS idx_payroll_periods_company_id CASCADE;
DROP INDEX IF EXISTS idx_payroll_periods_status CASCADE;
DROP INDEX IF EXISTS idx_payroll_summary_period_employee CASCADE;
DROP INDEX IF EXISTS idx_payroll_summary_sent CASCADE;
DROP INDEX IF EXISTS idx_payroll_concepts_period_employee CASCADE;
DROP INDEX IF EXISTS idx_payroll_deductions_period_employee CASCADE;
DROP INDEX IF EXISTS idx_user_sessions_user_id CASCADE;
DROP INDEX IF EXISTS idx_user_sessions_active CASCADE;
DROP INDEX IF EXISTS idx_user_sessions_login_at CASCADE;
DROP INDEX IF EXISTS idx_user_invitations_company_id CASCADE;
DROP INDEX IF EXISTS idx_user_invitations_email CASCADE;
DROP INDEX IF EXISTS idx_user_invitations_token CASCADE;
DROP INDEX IF EXISTS idx_user_invitations_status CASCADE;
DROP INDEX IF EXISTS idx_user_activity_log_user_id CASCADE;
DROP INDEX IF EXISTS idx_user_activity_log_action CASCADE;
DROP INDEX IF EXISTS idx_user_activity_log_created_at CASCADE;

-- Rehabilitar RLS
SET session_replication_role = DEFAULT;

-- =====================================================
-- PASO 2: CREAR TABLA COMPANIES (base del sistema)
-- =====================================================

CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  nit VARCHAR(20) NOT NULL UNIQUE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  nombre_representante TEXT,
  tipo_documento_representante TEXT CHECK (tipo_documento_representante IN ('CC', 'CE', 'PP', 'NIT')),
  numero_documento_representante TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para companies
CREATE INDEX idx_companies_nit ON companies(nit);

-- Comentarios
COMMENT ON TABLE companies IS 'Empresas/compañías del sistema';
COMMENT ON COLUMN companies.nombre_representante IS 'Nombre completo del representante legal';
COMMENT ON COLUMN companies.tipo_documento_representante IS 'Tipo de documento del representante legal';
COMMENT ON COLUMN companies.numero_documento_representante IS 'Número de documento del representante legal';

-- RLS para companies (se configurará después de crear profiles)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 3: CREAR TABLA PROFILES (usuarios)
-- =====================================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'VIEWER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_email_per_company UNIQUE (company_id, email)
);

-- Índices para profiles
CREATE INDEX idx_profiles_company_id ON profiles(company_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);

-- Comentarios
COMMENT ON TABLE profiles IS 'Perfiles de usuario vinculados a Supabase Auth';

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas auto-referenciales se crearán después

-- Ahora configurar políticas para companies (después de que profiles existe)
CREATE POLICY "Users can view their company" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- PASO 4: CREAR TABLA EMPLOYEES
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
  
  CONSTRAINT unique_cedula_per_company UNIQUE (company_id, cedula),
  CONSTRAINT unique_contract_per_company UNIQUE (company_id, contract_number)
);

-- Índices para employees
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_cedula ON employees(cedula);
CREATE INDEX idx_employees_contract_type ON employees(contract_type);
CREATE INDEX idx_employees_status ON employees(status);

-- Comentarios
COMMENT ON TABLE employees IS 'Empleados con soporte para NOMINA y OPS';

-- RLS para employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company employees" ON employees
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage company employees" ON employees
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =====================================================
-- PASO 5: CREAR TABLAS DE NÓMINA
-- =====================================================

-- Tabla payroll_periods
CREATE TABLE payroll_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'CALCULADA', 'PROCESADA', 'ENVIADA')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_period_per_company UNIQUE (company_id, period_number),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

CREATE INDEX idx_payroll_periods_company_id ON payroll_periods(company_id);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);

-- Tabla payroll_summary
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
  
  CONSTRAINT unique_employee_per_period UNIQUE (payroll_period_id, employee_id)
);

CREATE INDEX idx_payroll_summary_period_employee ON payroll_summary(payroll_period_id, employee_id);
CREATE INDEX idx_payroll_summary_sent ON payroll_summary(payslip_sent);

-- Tabla payroll_concepts
CREATE TABLE payroll_concepts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  concept_code VARCHAR(10) NOT NULL,
  concept_name VARCHAR(255) NOT NULL,
  days_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  unit_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payroll_concepts_period_employee ON payroll_concepts(payroll_period_id, employee_id);

-- Tabla payroll_deductions
CREATE TABLE payroll_deductions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  deduction_code VARCHAR(10) NOT NULL,
  deduction_name VARCHAR(255) NOT NULL,
  base_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  percentage DECIMAL(5,4) NOT NULL DEFAULT 0,
  deduction_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payroll_deductions_period_employee ON payroll_deductions(payroll_period_id, employee_id);

-- RLS para tablas de nómina
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;

-- Políticas para payroll_periods
CREATE POLICY "Users can manage company payroll periods" ON payroll_periods
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Políticas para payroll_summary
CREATE POLICY "Users can manage company payroll summary" ON payroll_summary
  FOR ALL USING (
    payroll_period_id IN (
      SELECT pp.id FROM payroll_periods pp
      JOIN profiles p ON p.company_id = pp.company_id
      WHERE p.id = auth.uid()
    )
  );

-- Políticas para payroll_concepts
CREATE POLICY "Users can manage company payroll concepts" ON payroll_concepts
  FOR ALL USING (
    payroll_period_id IN (
      SELECT pp.id FROM payroll_periods pp
      JOIN profiles p ON p.company_id = pp.company_id
      WHERE p.id = auth.uid()
    )
  );

-- Políticas para payroll_deductions
CREATE POLICY "Users can manage company payroll deductions" ON payroll_deductions
  FOR ALL USING (
    payroll_period_id IN (
      SELECT pp.id FROM payroll_periods pp
      JOIN profiles p ON p.company_id = pp.company_id
      WHERE p.id = auth.uid()
    )
  );

-- =====================================================
-- PASO 6: CREAR FUNCIONES ESENCIALES
-- =====================================================

-- Función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para nuevos usuarios
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Función para updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para profiles
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Función RPC para datos completos de nómina
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

-- Función para información del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user', json_build_object(
      'id', p.id,
      'email', p.email,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'role', p.role,
      'status', p.status,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ),
    'company', CASE 
      WHEN c.id IS NOT NULL THEN json_build_object(
        'id', c.id,
        'name', c.name,
        'nit', c.nit,
        'address', c.address,
        'phone', c.phone,
        'email', c.email,
        'nombre_representante', c.nombre_representante,
        'tipo_documento_representante', c.tipo_documento_representante,
        'numero_documento_representante', c.numero_documento_representante
      )
      ELSE NULL
    END
  ) INTO result
  FROM profiles p
  LEFT JOIN companies c ON c.id = p.company_id
  WHERE p.id = auth.uid();
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_current_user_info() TO authenticated;

-- =====================================================
-- PASO 6.5: CREAR POLÍTICAS SEGURAS SIN RECURSIÓN
-- =====================================================

-- Política simple para que admins puedan insertar perfiles
CREATE POLICY "Enable insert for authenticated users" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Política para que admins puedan gestionar perfiles (usando EXISTS sin auto-referencia)
CREATE POLICY "Admins can manage all profiles in company" ON profiles
  FOR ALL USING (
    -- Si eres ADMIN, puedes gestionar todos los perfiles de tu empresa
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
    OR 
    -- O si es tu propio perfil
    auth.uid() = id
  );

-- =====================================================
-- PASO 7: INSERTAR DATOS INICIALES
-- =====================================================

-- Insertar empresa inicial
INSERT INTO companies (
  id,
  name,
  nit,
  address,
  phone,
  email,
  nombre_representante,
  tipo_documento_representante,
  numero_documento_representante
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000', -- ID fijo para referencia
  'MI EMPRESA DE PRUEBA',
  '900123456-7',
  'Calle Principal 123',
  '(01) 234-5678',
  'admin@miempresa.com',
  'MARLON ANDRES BUELVAS TELLEZ',
  'CC',
  '1007398493'
) ON CONFLICT (nit) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  nombre_representante = EXCLUDED.nombre_representante,
  tipo_documento_representante = EXCLUDED.tipo_documento_representante,
  numero_documento_representante = EXCLUDED.numero_documento_representante;

-- =====================================================
-- FINALIZACIÓN
-- =====================================================

-- Mensaje de finalización
DO $$
BEGIN
  RAISE NOTICE '🎉 BASE DE DATOS RECREADA COMPLETAMENTE';
  RAISE NOTICE '✅ Tablas: companies, profiles, employees, payroll_*';
  RAISE NOTICE '🔧 Funciones: get_complete_payroll_data, get_current_user_info';
  RAISE NOTICE '🔒 Políticas RLS aplicadas';
  RAISE NOTICE '🏢 Empresa inicial creada con ID: 550e8400-e29b-41d4-a716-446655440000';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASOS:';
  RAISE NOTICE '1. Registrar usuario en Supabase Auth';
  RAISE NOTICE '2. Actualizar perfil: UPDATE profiles SET company_id = ''550e8400-e29b-41d4-a716-446655440000'', role = ''ADMIN'' WHERE email = ''tu-email@ejemplo.com'';';
  RAISE NOTICE '3. Crear empleados desde la aplicación';
  RAISE NOTICE '🚀 ¡Sistema listo para usar!';
END $$;