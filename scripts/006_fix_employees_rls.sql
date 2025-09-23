-- Políticas RLS para tabla employees
-- Permitir que los usuarios gestionen empleados de su empresa

-- Política para SELECT (ver empleados)
DROP POLICY IF EXISTS "Users can view company employees" ON employees;
CREATE POLICY "Users can view company employees" ON employees FOR SELECT USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Política para INSERT (crear empleados)
DROP POLICY IF EXISTS "Users can insert company employees" ON employees;
CREATE POLICY "Users can insert company employees" ON employees FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Política para UPDATE (actualizar empleados)
DROP POLICY IF EXISTS "Users can update company employees" ON employees;
CREATE POLICY "Users can update company employees" ON employees FOR UPDATE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Política para DELETE (eliminar empleados)
DROP POLICY IF EXISTS "Users can delete company employees" ON employees;
CREATE POLICY "Users can delete company employees" ON employees FOR DELETE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- También necesitamos políticas similares para otras tablas relacionadas con nómina

-- Políticas para payroll_periods
DROP POLICY IF EXISTS "Users can view company payroll_periods" ON payroll_periods;
CREATE POLICY "Users can view company payroll_periods" ON payroll_periods FOR SELECT USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert company payroll_periods" ON payroll_periods;
CREATE POLICY "Users can insert company payroll_periods" ON payroll_periods FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update company payroll_periods" ON payroll_periods;
CREATE POLICY "Users can update company payroll_periods" ON payroll_periods FOR UPDATE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Políticas para payroll_summary
DROP POLICY IF EXISTS "Users can view company payroll_summary" ON payroll_summary;
CREATE POLICY "Users can view company payroll_summary" ON payroll_summary FOR SELECT USING (
  employee_id IN (
    SELECT id FROM employees WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can insert company payroll_summary" ON payroll_summary;
CREATE POLICY "Users can insert company payroll_summary" ON payroll_summary FOR INSERT WITH CHECK (
  employee_id IN (
    SELECT id FROM employees WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update company payroll_summary" ON payroll_summary;
CREATE POLICY "Users can update company payroll_summary" ON payroll_summary FOR UPDATE USING (
  employee_id IN (
    SELECT id FROM employees WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Función RPC para crear empleado (evita problemas de RLS)
CREATE OR REPLACE FUNCTION create_employee_for_company(
  employee_data JSONB,
  user_id UUID
)
RETURNS TABLE(id UUID, cedula TEXT, full_name TEXT)
AS $$
DECLARE
  company_uuid UUID;
  new_employee_id UUID;
  new_cedula TEXT;
  new_full_name TEXT;
BEGIN
  -- Get company_id from user profile
  SELECT company_id INTO company_uuid FROM profiles WHERE profiles.id = user_id;
  
  IF company_uuid IS NULL THEN
    RAISE EXCEPTION 'Usuario no tiene empresa configurada';
  END IF;
  
  -- Insert employee using correct schema fields
  INSERT INTO employees (
    company_id, cedula, full_name, centro_costo, contract_number, 
    hire_date, salary_type, base_salary, bank_name, account_number, 
    afp, eps, status
  )
  VALUES (
    company_uuid,
    employee_data->>'cedula',
    employee_data->>'full_name',
    NULLIF(employee_data->>'centro_costo', ''),
    NULLIF(employee_data->>'contract_number', ''),
    (employee_data->>'hire_date')::DATE,
    COALESCE(employee_data->>'salary_type', 'FIJO'),
    (employee_data->>'base_salary')::NUMERIC,
    NULLIF(employee_data->>'bank_name', ''),
    NULLIF(employee_data->>'account_number', ''),
    NULLIF(employee_data->>'afp', ''),
    NULLIF(employee_data->>'eps', ''),
    CASE 
      WHEN (employee_data->>'is_active')::BOOLEAN = true THEN 'ACTIVO'
      ELSE 'INACTIVO'
    END
  )
  RETURNING employees.id, employees.cedula, employees.full_name 
  INTO new_employee_id, new_cedula, new_full_name;
  
  RETURN QUERY SELECT new_employee_id, new_cedula, new_full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para verificar cédula única
CREATE OR REPLACE FUNCTION check_cedula_unique(
  cedula_to_check TEXT,
  user_id UUID
)
RETURNS BOOLEAN
AS $$
DECLARE
  company_uuid UUID;
  existing_count INTEGER;
BEGIN
  -- Get company_id from user profile
  SELECT company_id INTO company_uuid FROM profiles WHERE profiles.id = user_id;
  
  IF company_uuid IS NULL THEN
    RETURN TRUE; -- Si no hay empresa, asumir que es única
  END IF;
  
  -- Check if cedula exists in company
  SELECT COUNT(*) INTO existing_count 
  FROM employees 
  WHERE employees.company_id = company_uuid AND employees.cedula = cedula_to_check;
  
  RETURN existing_count = 0; -- TRUE si no existe (es única)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS en todas las tablas si no está habilitado
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_summary ENABLE ROW LEVEL SECURITY;