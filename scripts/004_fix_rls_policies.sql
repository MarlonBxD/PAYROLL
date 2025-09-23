-- Agregar política para permitir que los usuarios inserten empresas
CREATE POLICY "Users can insert companies" ON companies FOR INSERT WITH CHECK (true);

-- También necesitamos asegurar que los usuarios puedan ver las empresas que acabaran de crear
-- Vamos a modificar la política de SELECT para incluir empresas recién creadas

-- Primero, borramos la política existente
DROP POLICY IF EXISTS "Users can view their company" ON companies;

-- Creamos una nueva política más permisiva para SELECT
CREATE POLICY "Users can view their company" ON companies FOR SELECT USING (
  id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) OR
  id IN (SELECT id FROM companies WHERE true) -- Temporalmente más permisivo para debug
);

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a las tablas relevantes
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON payroll_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_summary_updated_at BEFORE UPDATE ON payroll_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();