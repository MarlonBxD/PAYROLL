-- =====================================================
-- SCRIPT PARA ARREGLAR POLÍTICAS RLS DE EMPLOYEES
-- =====================================================

-- PASO 1: Eliminar políticas problemáticas de employees
DROP POLICY IF EXISTS "Users can view company employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage company employees" ON employees;

-- PASO 2: Crear políticas simples y funcionales
-- Permitir a usuarios autenticados ver empleados de su empresa
CREATE POLICY "Users can view company employees" ON employees
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Permitir a usuarios autenticados insertar empleados en su empresa
CREATE POLICY "Users can insert company employees" ON employees
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Permitir a usuarios autenticados actualizar empleados de su empresa
CREATE POLICY "Users can update company employees" ON employees
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Permitir a usuarios autenticados eliminar empleados de su empresa
CREATE POLICY "Users can delete company employees" ON employees
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- PASO 3: CREAR FUNCIÓN PARA VALIDAR CÉDULA ÚNICA
-- =====================================================

CREATE OR REPLACE FUNCTION check_cedula_unique(
  cedula_to_check TEXT,
  user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  user_company_id UUID;
  cedula_exists BOOLEAN;
BEGIN
  -- Obtener la empresa del usuario
  SELECT company_id INTO user_company_id
  FROM profiles 
  WHERE id = user_id;
  
  -- Verificar si la cédula ya existe en esa empresa
  SELECT EXISTS (
    SELECT 1 FROM employees 
    WHERE cedula = cedula_to_check 
      AND company_id = user_company_id
  ) INTO cedula_exists;
  
  -- Retornar TRUE si es única (NO existe), FALSE si ya existe
  RETURN NOT cedula_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_cedula_unique(TEXT, UUID) TO authenticated;

-- =====================================================
-- PASO 4: CREAR FUNCIÓN PARA CREAR EMPLEADOS
-- =====================================================

CREATE OR REPLACE FUNCTION create_employee_for_company(
  employee_data JSONB,
  user_id UUID
) RETURNS UUID AS $$
DECLARE
  user_company_id UUID;
  new_employee_id UUID;
BEGIN
  -- Obtener la empresa del usuario
  SELECT company_id INTO user_company_id
  FROM profiles 
  WHERE id = user_id;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no tiene empresa asignada';
  END IF;
  
  -- Verificar que la cédula sea única en la empresa
  IF NOT check_cedula_unique(employee_data->>'cedula', user_id) THEN
    RAISE EXCEPTION 'Ya existe un empleado con esta cédula en la empresa';
  END IF;
  
  -- Insertar el empleado
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
    user_company_id,
    employee_data->>'cedula',
    employee_data->>'full_name',
    employee_data->>'email',
    employee_data->>'phone',
    employee_data->>'position',
    employee_data->>'department',
    employee_data->>'centro_costo',
    employee_data->>'contract_number',
    (employee_data->>'hire_date')::DATE,
    COALESCE(employee_data->>'salary_type', 'FIJO'),
    COALESCE((employee_data->>'base_salary')::DECIMAL, 0),
    employee_data->>'bank_name',
    employee_data->>'account_number',
    employee_data->>'afp',
    employee_data->>'eps',
    COALESCE(employee_data->>'contract_type', 'NOMINA'),
    COALESCE(employee_data->>'status', 'ACTIVO')
  ) RETURNING id INTO new_employee_id;
  
  RETURN new_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_employee_for_company(JSONB, UUID) TO authenticated;

-- =====================================================
-- FINALIZACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ POLÍTICAS RLS DE EMPLOYEES CORREGIDAS';
  RAISE NOTICE '🔧 Funciones RPC creadas: check_cedula_unique(), create_employee_for_company()';
  RAISE NOTICE '✅ Usuarios pueden gestionar empleados de su empresa';
  RAISE NOTICE '🚀 Creación de empleados debería funcionar ahora';
END $$;