-- =====================================================
-- SCRIPT PARA CORREGIR POLÍTICAS RLS PROBLEMÁTICAS
-- =====================================================

-- PASO 1: Eliminar todas las políticas problemáticas de profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage company profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles in company" ON profiles;

-- PASO 2: Crear políticas simples y seguras
-- Política básica: cada usuario puede ver y editar su propio perfil
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- PASO 3: Permitir que cualquier usuario autenticado pueda insertar su perfil
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- PASO 4: Permitir lectura básica para la funcionalidad del sistema
-- Esta política permite que users vean perfiles básicos para funciones del sistema
CREATE POLICY "Allow basic profile reads" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================================================
-- MENSAJE DE FINALIZACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ POLÍTICAS RLS CORREGIDAS';
  RAISE NOTICE '🔧 Eliminadas políticas recursivas problemáticas';
  RAISE NOTICE '✅ Creadas políticas simples y seguras';
  RAISE NOTICE '🚀 El sistema debería funcionar ahora sin recursión infinita';
END $$;