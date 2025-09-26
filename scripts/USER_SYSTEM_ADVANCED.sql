-- =====================================================
-- CONFIGURACIONES ADICIONALES PARA SUPABASE AUTH
-- Este script debe ejecutarse después del script principal de usuarios
-- =====================================================

-- =====================================================
-- PASO 1: CONFIGURAR POLÍTICAS DE SEGURIDAD AVANZADAS
-- =====================================================

-- Política para que los usuarios puedan ver empleados de su empresa
CREATE POLICY "Users can view company employees" ON employees
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política para que solo admins puedan crear/editar empleados
CREATE POLICY "Only admins can manage employees" ON employees
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =====================================================
-- PASO 2: FUNCIÓN PARA VALIDAR PERMISOS
-- =====================================================

-- Función para verificar si el usuario tiene un rol específico
CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role = required_role 
      AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario pertenece a una empresa
CREATE OR REPLACE FUNCTION user_belongs_to_company(company_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND company_id = company_uuid 
      AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION user_has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_belongs_to_company(UUID) TO authenticated;

-- =====================================================
-- PASO 3: TRIGGER PARA LOG DE ACTIVIDADES
-- =====================================================

-- Tabla para log de actividades de usuario
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para user_activity_log
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);

-- Comentarios
COMMENT ON TABLE user_activity_log IS 'Log de actividades de usuarios para auditoría y seguridad';

-- RLS para user_activity_log
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view company activity logs" ON user_activity_log
  FOR SELECT USING (
    user_id IN (
      SELECT p.id FROM profiles p
      WHERE p.company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      ) AND EXISTS (
        SELECT 1 FROM profiles current_user 
        WHERE current_user.id = auth.uid() 
          AND current_user.role = 'ADMIN'
      )
    )
  );

-- =====================================================
-- PASO 4: FUNCIÓN PARA CREAR EMPRESA Y USUARIO ADMIN
-- =====================================================

-- Función para crear una empresa completa con usuario admin
CREATE OR REPLACE FUNCTION create_company_with_admin(
  p_company_name TEXT,
  p_company_nit TEXT,
  p_company_address TEXT DEFAULT NULL,
  p_company_phone TEXT DEFAULT NULL,
  p_company_email TEXT DEFAULT NULL,
  p_representative_name TEXT DEFAULT NULL,
  p_representative_doc_type TEXT DEFAULT 'CC',
  p_representative_doc_number TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_company_id UUID;
  current_user_id UUID;
  result JSON;
BEGIN
  -- Obtener ID del usuario actual
  current_user_id := auth.uid();
  
  -- Verificar que el usuario está autenticado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Verificar que el usuario no tiene empresa asignada
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = current_user_id AND company_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;
  
  -- Crear la empresa
  INSERT INTO companies (
    name, 
    nit, 
    address, 
    phone, 
    email,
    nombre_representante,
    tipo_documento_representante,
    numero_documento_representante
  ) VALUES (
    p_company_name,
    p_company_nit,
    p_company_address,
    p_company_phone,
    p_company_email,
    p_representative_name,
    p_representative_doc_type,
    p_representative_doc_number
  ) RETURNING id INTO new_company_id;
  
  -- Vincular el usuario como ADMIN de la empresa
  UPDATE profiles 
  SET 
    company_id = new_company_id,
    role = 'ADMIN',
    status = 'ACTIVE',
    updated_at = NOW()
  WHERE id = current_user_id;
  
  -- Log de la actividad
  INSERT INTO user_activity_log (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    current_user_id,
    'CREATE_COMPANY',
    'company',
    new_company_id,
    json_build_object(
      'company_name', p_company_name,
      'company_nit', p_company_nit,
      'user_role', 'ADMIN'
    )
  );
  
  -- Preparar respuesta
  SELECT json_build_object(
    'success', true,
    'message', 'Company created successfully',
    'company_id', new_company_id,
    'user_id', current_user_id,
    'user_role', 'ADMIN'
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_company_with_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================
-- PASO 5: FUNCIÓN PARA CAMBIAR ROL DE USUARIO
-- =====================================================

-- Función para que los admins cambien roles de usuarios
CREATE OR REPLACE FUNCTION change_user_role(
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS JSON AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_user_company UUID;
  current_user_company UUID;
  result JSON;
BEGIN
  -- Verificar que el usuario actual es admin
  SELECT company_id INTO current_user_company
  FROM profiles 
  WHERE id = current_user_id AND role = 'ADMIN' AND status = 'ACTIVE';
  
  IF current_user_company IS NULL THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Verificar que el usuario objetivo pertenece a la misma empresa
  SELECT company_id INTO target_user_company
  FROM profiles 
  WHERE id = p_user_id;
  
  IF target_user_company IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;
  
  IF target_user_company != current_user_company THEN
    RAISE EXCEPTION 'Access denied: User belongs to different company';
  END IF;
  
  -- Verificar que el rol es válido
  IF p_new_role NOT IN ('ADMIN', 'USER', 'VIEWER') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;
  
  -- Actualizar el rol
  UPDATE profiles 
  SET 
    role = p_new_role,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log de la actividad
  INSERT INTO user_activity_log (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    current_user_id,
    'CHANGE_USER_ROLE',
    'user',
    p_user_id,
    json_build_object(
      'target_user_id', p_user_id,
      'new_role', p_new_role,
      'changed_by', current_user_id
    )
  );
  
  -- Preparar respuesta
  SELECT json_build_object(
    'success', true,
    'message', 'User role updated successfully',
    'user_id', p_user_id,
    'new_role', p_new_role
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION change_user_role(UUID, TEXT) TO authenticated;

-- =====================================================
-- PASO 6: VISTA PARA ESTADÍSTICAS DE LA EMPRESA
-- =====================================================

-- Vista con estadísticas de la empresa
CREATE OR REPLACE VIEW company_statistics AS
SELECT 
  c.id as company_id,
  c.name as company_name,
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT CASE WHEN p.role = 'ADMIN' THEN p.id END) as admin_users,
  COUNT(DISTINCT CASE WHEN p.role = 'USER' THEN p.id END) as regular_users,
  COUNT(DISTINCT CASE WHEN p.role = 'VIEWER' THEN p.id END) as viewer_users,
  COUNT(DISTINCT CASE WHEN p.status = 'ACTIVE' THEN p.id END) as active_users,
  COUNT(DISTINCT e.id) as total_employees,
  COUNT(DISTINCT CASE WHEN e.contract_type = 'NOMINA' THEN e.id END) as nomina_employees,
  COUNT(DISTINCT CASE WHEN e.contract_type = 'OPS' THEN e.id END) as ops_employees,
  COUNT(DISTINCT pp.id) as total_periods,
  COUNT(DISTINCT CASE WHEN pp.status = 'PROCESADA' THEN pp.id END) as processed_periods
FROM companies c
LEFT JOIN profiles p ON p.company_id = c.id
LEFT JOIN employees e ON e.company_id = c.id
LEFT JOIN payroll_periods pp ON pp.company_id = c.id
GROUP BY c.id, c.name;

-- Grant permissions para la vista
GRANT SELECT ON company_statistics TO authenticated;

-- RLS para la vista
ALTER VIEW company_statistics SET (security_invoker = true);

-- =====================================================
-- FINALIZACIÓN
-- =====================================================

-- Mensaje de finalización
DO $$
BEGIN
  RAISE NOTICE '✅ CONFIGURACIONES AVANZADAS COMPLETADAS';
  RAISE NOTICE '🔐 Políticas de seguridad avanzadas aplicadas';
  RAISE NOTICE '📊 Sistema de log de actividades configurado';
  RAISE NOTICE '🏢 Función create_company_with_admin() disponible';
  RAISE NOTICE '👥 Función change_user_role() disponible';
  RAISE NOTICE '📈 Vista company_statistics creada';
  RAISE NOTICE '🎉 Sistema de usuarios completamente configurado';
END $$;