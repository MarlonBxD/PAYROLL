-- =====================================================
-- SCRIPT PARA SISTEMA DE USUARIOS Y AUTENTICACIÓN
-- Este script crea las tablas y funciones necesarias para usuarios
-- =====================================================

-- =====================================================
-- PASO 1: CREAR TABLA PROFILES (perfiles de usuario)
-- =====================================================

-- Crear tabla profiles si no existe
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'VIEWER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_email_per_company UNIQUE (company_id, email)
);

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Comentarios para profiles
COMMENT ON TABLE profiles IS 'Perfiles de usuario vinculados a auth.users de Supabase';
COMMENT ON COLUMN profiles.id IS 'ID del usuario de Supabase Auth (FK a auth.users)';
COMMENT ON COLUMN profiles.company_id IS 'Empresa a la que pertenece el usuario';
COMMENT ON COLUMN profiles.role IS 'Rol del usuario: ADMIN, USER, VIEWER';
COMMENT ON COLUMN profiles.status IS 'Estado del usuario: ACTIVE, INACTIVE, SUSPENDED';

-- =====================================================
-- PASO 2: CONFIGURAR RLS PARA PROFILES
-- =====================================================

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política: Los admins pueden ver todos los perfiles de su empresa
CREATE POLICY "Admins can view company profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = profiles.company_id 
        AND p.role = 'ADMIN'
    )
  );

-- Política: Los admins pueden insertar perfiles en su empresa
CREATE POLICY "Admins can insert company profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = profiles.company_id 
        AND p.role = 'ADMIN'
    )
  );

-- Política: Los admins pueden actualizar perfiles de su empresa
CREATE POLICY "Admins can update company profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = profiles.company_id 
        AND p.role = 'ADMIN'
    )
  );

-- =====================================================
-- PASO 3: CREAR FUNCIÓN PARA MANEJAR NUEVOS USUARIOS
-- =====================================================

-- Función para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

-- Trigger para ejecutar la función cuando se crea un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PASO 4: CREAR FUNCIÓN PARA ACTUALIZAR updated_at
-- =====================================================

-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para profiles
DROP TRIGGER IF EXISTS handle_updated_at ON profiles;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- PASO 5: CREAR TABLA USER_SESSIONS (opcional - para tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT,
  ip_address INET,
  user_agent TEXT,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_session_dates CHECK (logout_at IS NULL OR logout_at > login_at)
);

-- Índices para user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_at ON user_sessions(login_at);

-- Comentarios
COMMENT ON TABLE user_sessions IS 'Registro de sesiones de usuario para auditoría';

-- RLS para user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- PASO 6: CREAR FUNCIONES RPC PARA GESTIÓN DE USUARIOS
-- =====================================================

-- Función para obtener información completa del usuario actual
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_current_user_info() TO authenticated;

-- Función para obtener usuarios de la empresa (solo para admins)
CREATE OR REPLACE FUNCTION get_company_users()
RETURNS SETOF profiles AS $$
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Retornar usuarios de la misma empresa
  RETURN QUERY
  SELECT p.* FROM profiles p
  WHERE p.company_id = (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_company_users() TO authenticated;

-- =====================================================
-- PASO 7: CREAR FUNCIÓN PARA VINCULAR USUARIO A EMPRESA
-- =====================================================

-- Función para que un usuario se vincule a una empresa
CREATE OR REPLACE FUNCTION link_user_to_company(
  p_company_id UUID,
  p_role TEXT DEFAULT 'USER'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_user_id UUID;
BEGIN
  -- Obtener ID del usuario actual
  current_user_id := auth.uid();
  
  -- Verificar que el usuario existe
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Verificar que la empresa existe
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
  
  -- Verificar que el rol es válido
  IF p_role NOT IN ('ADMIN', 'USER', 'VIEWER') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;
  
  -- Actualizar el perfil del usuario
  UPDATE profiles 
  SET 
    company_id = p_company_id,
    role = p_role,
    updated_at = NOW()
  WHERE id = current_user_id;
  
  -- Verificar que se actualizó
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to link user to company';
  END IF;
  
  -- Retornar información actualizada
  SELECT json_build_object(
    'success', true,
    'message', 'User successfully linked to company',
    'user_id', current_user_id,
    'company_id', p_company_id,
    'role', p_role
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION link_user_to_company(UUID, TEXT) TO authenticated;

-- =====================================================
-- PASO 8: CREAR FUNCIÓN PARA INVITAR USUARIOS
-- =====================================================

-- Tabla para invitaciones de usuarios
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'VIEWER')),
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_pending_invitation UNIQUE (company_id, email, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Índices para user_invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);

-- Comentarios
COMMENT ON TABLE user_invitations IS 'Invitaciones para que usuarios se unan a empresas';

-- RLS para user_invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage company invitations" ON user_invitations
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =====================================================
-- PASO 9: DATOS DE EJEMPLO PARA TESTING
-- =====================================================

-- Insertar datos de ejemplo (comentados para personalizar)
/*
-- NOTA: Estos son datos de ejemplo, personaliza según tus necesidades

-- Actualizar empresa con datos del representante legal
UPDATE companies 
SET 
  nombre_representante = 'MARLON ANDRES BUELVAS TELLEZ',
  tipo_documento_representante = 'CC',
  numero_documento_representante = '1007398493'
WHERE id = 'tu-company-id'; -- Reemplaza con tu company_id real

-- Crear un usuario admin de ejemplo (después de registrarse en Supabase Auth)
-- Este UPDATE se ejecuta después de que el usuario se registre
UPDATE profiles 
SET 
  company_id = 'tu-company-id', -- Reemplaza con tu company_id real
  full_name = 'MARLON ANDRES BUELVAS TELLEZ',
  role = 'ADMIN',
  status = 'ACTIVE'
WHERE email = 'marlonbuelvas314@gmail.com';
*/

-- =====================================================
-- FINALIZACIÓN
-- =====================================================

-- Mensaje de finalización
DO $$
BEGIN
  RAISE NOTICE '✅ SISTEMA DE USUARIOS COMPLETADO EXITOSAMENTE';
  RAISE NOTICE '👤 Tabla profiles creada con RLS';
  RAISE NOTICE '🔐 Trigger para nuevos usuarios configurado';
  RAISE NOTICE '📊 Tabla user_sessions para auditoría';
  RAISE NOTICE '🏢 Tabla user_invitations para invitaciones';
  RAISE NOTICE '🔧 Funciones RPC: get_current_user_info(), get_company_users(), link_user_to_company()';
  RAISE NOTICE '📝 SIGUIENTE PASO: Actualizar los datos de ejemplo con tus IDs reales';
  RAISE NOTICE '🎉 Sistema de usuarios listo para integrar con Supabase Auth';
END $$;