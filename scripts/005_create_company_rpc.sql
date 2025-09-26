-- Función RPC para crear empresa y asociarla al usuario (evita RLS)
CREATE OR REPLACE FUNCTION create_company_for_user(
  company_data JSONB,
  user_id UUID
)
RETURNS TABLE(id UUID)
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Insert company
  INSERT INTO companies (name, nit, address, phone, email, logo_url)
  VALUES (
    company_data->>'name',
    company_data->>'nit',
    company_data->>'address',
    company_data->>'phone',
    company_data->>'email',
    company_data->>'logo_url'  
  )
  RETURNING companies.id INTO new_company_id;
  
  -- Update or insert profile with company_id
  INSERT INTO profiles (id, company_id, full_name, email)
  VALUES (user_id, new_company_id, 'Usuario', '')
  ON CONFLICT (id) 
  DO UPDATE SET company_id = new_company_id;
  
  RETURN QUERY SELECT new_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- También necesitamos la política RLS para INSERT en companies
CREATE POLICY "Users can insert companies" ON companies FOR INSERT WITH CHECK (true);

-- Y actualizar la política de SELECT para que funcione mejor
DROP POLICY IF EXISTS "Users can view their company" ON companies;
CREATE POLICY "Users can view their company" ON companies FOR SELECT USING (
  id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) OR
  auth.uid() IS NOT NULL  -- Permite ver empresas mientras se está autenticado
);

-- Política para UPDATE en companies
DROP POLICY IF EXISTS "Users can update their company" ON companies;
CREATE POLICY "Users can update their company" ON companies FOR UPDATE USING (
  id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);