-- Create function to get complete payroll data
-- This function returns all the data needed for generating payslips and certificates

CREATE OR REPLACE FUNCTION get_complete_payroll_data(
  p_period_id UUID,
  p_employee_id UUID
) RETURNS TABLE (
  -- Company data
  company_id UUID,
  company_name TEXT,
  company_nit TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_nombre_representante TEXT,
  company_tipo_documento_representante TEXT,
  company_numero_documento_representante TEXT,
  
  -- Period data
  period_id UUID,
  period_number INTEGER,
  period_start_date DATE,
  period_end_date DATE,
  period_status TEXT,
  
  -- Employee data
  employee_id UUID,
  employee_cedula TEXT,
  employee_full_name TEXT,
  employee_email TEXT,
  employee_phone TEXT,
  employee_position TEXT,
  employee_department TEXT,
  employee_centro_costo TEXT,
  employee_contract_number TEXT,
  employee_hire_date DATE,
  employee_salary_type TEXT,
  employee_base_salary DECIMAL,
  employee_bank_name TEXT,
  employee_account_number TEXT,
  employee_afp TEXT,
  employee_eps TEXT,
  employee_contract_type TEXT,
  employee_status TEXT,
  
  -- Summary data
  summary_id UUID,
  summary_total_earned DECIMAL,
  summary_total_deductions DECIMAL,
  summary_net_pay DECIMAL,
  summary_payslip_sent BOOLEAN,
  summary_payslip_sent_at TIMESTAMPTZ,
  
  -- Concepts data (as JSON)
  concepts JSONB,
  
  -- Deductions data (as JSON)
  deductions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Company data
    c.id as company_id,
    c.name as company_name,
    c.nit as company_nit,
    c.address as company_address,
    c.phone as company_phone,
    c.email as company_email,
    c.nombre_representante as company_nombre_representante,
    c.tipo_documento_representante as company_tipo_documento_representante,
    c.numero_documento_representante as company_numero_documento_representante,
    
    -- Period data
    pp.id as period_id,
    pp.period_number,
    pp.start_date as period_start_date,
    pp.end_date as period_end_date,
    pp.status as period_status,
    
    -- Employee data
    e.id as employee_id,
    e.cedula as employee_cedula,
    e.full_name as employee_full_name,
    e.email as employee_email,
    e.phone as employee_phone,
    e.position as employee_position,
    e.department as employee_department,
    e.centro_costo as employee_centro_costo,
    e.contract_number as employee_contract_number,
    e.hire_date as employee_hire_date,
    e.salary_type as employee_salary_type,
    e.base_salary as employee_base_salary,
    e.bank_name as employee_bank_name,
    e.account_number as employee_account_number,
    e.afp as employee_afp,
    e.eps as employee_eps,
    COALESCE(e.contract_type, 'NOMINA') as employee_contract_type,
    e.status as employee_status,
    
    -- Summary data
    ps.id as summary_id,
    ps.total_earned as summary_total_earned,
    ps.total_deductions as summary_total_deductions,
    ps.net_pay as summary_net_pay,
    ps.payslip_sent as summary_payslip_sent,
    ps.payslip_sent_at as summary_payslip_sent_at,
    
    -- Concepts data (as JSON array)
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', pc.id,
          'concept_code', pc.concept_code,
          'concept_name', pc.concept_name,
          'days_hours', pc.days_hours,
          'unit_value', pc.unit_value,
          'total_value', pc.total_value
        )
      ) FROM payroll_concepts pc WHERE pc.payroll_period_id = p_period_id AND pc.employee_id = p_employee_id),
      '[]'::jsonb
    ) as concepts,
    
    -- Deductions data (as JSON array)
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', pd.id,
          'concept_code', pd.deduction_code,
          'concept_name', pd.deduction_name,
          'percentage', pd.percentage,
          'base_value', pd.base_amount,
          'total_value', pd.deduction_value
        )
      ) FROM payroll_deductions pd WHERE pd.payroll_period_id = p_period_id AND pd.employee_id = p_employee_id),
      '[]'::jsonb
    ) as deductions
    
  FROM payroll_periods pp
  JOIN companies c ON c.id = pp.company_id
  JOIN payroll_summary ps ON ps.payroll_period_id = pp.id
  JOIN employees e ON e.id = ps.employee_id
  WHERE pp.id = p_period_id 
    AND e.id = p_employee_id
    AND ps.employee_id = p_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_complete_payroll_data(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_complete_payroll_data IS 'Returns complete payroll data for generating payslips and certificates';