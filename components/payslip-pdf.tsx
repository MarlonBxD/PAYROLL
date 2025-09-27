import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'

// Define styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 100,
    height: 80,
    alignItems: 'center',
  },
  headerContent: {
    textAlign: 'center',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  documentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  leftColumn: {
    flex: 1,
    paddingRight: 20,
  },
  rightColumn: {
    flex: 1,
    paddingLeft: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 80,
    fontSize: 10,
    fontWeight: 'bold',
  },
  colon: {
    width: 10,
    fontSize: 10,
  },
  value: {
    flex: 1,
    fontSize: 10,
  },
  valueBold: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
  },
  conceptsSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  conceptsColumn: {
    flex: 1,
    paddingRight: 10,
  },
  deductionsColumn: {
    flex: 1,
    paddingLeft: 10,
  },
  conceptRow: {
    flexDirection: 'row',
    marginBottom: 2,
    fontSize: 9,
  },
  conceptCode: {
    width: 30,
  },
  conceptName: {
    flex: 1,
  },
  conceptDays: {
    width: 40,
    textAlign: 'right',
  },
  conceptAmount: {
    width: 60,
    textAlign: 'right',
  },
  totalsSection: {
    borderTopWidth: 2,
    borderTopColor: '#000000',
    paddingTop: 10,
  },
  totalsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signatureBox: {
    width: '45%',
    textAlign: 'center',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    height: 60,
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  signatureImage: {
    width: 120,
    height: 40,
    alignSelf: 'center',
    marginTop: 5,
  },
  signatureText: {
    fontSize: 10,
    marginTop: 5,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },

})

interface PayslipPDFProps {
  data: {
    company: any
    period: any
    employee: any
    summary: any
    concepts: any[]
    deductions: any[]
  }
}

export const PayslipPDF = ({ data }: PayslipPDFProps) => {
  const { company, period, employee, summary, concepts, deductions } = data

  return (
    <Document title={`Desprendible - ${employee?.full_name}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Image
              style={styles.logo}
              src="public/placeholders/default-logo.png"
            />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.companyName}>{company?.name || "EMPRESA"}</Text>
            <Text style={styles.documentTitle}>DESPRENDIBLE DE PAGO</Text>
          </View>
        </View>

        {/* Employee Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.leftColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>NOMBRE</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.valueBold}>{employee?.full_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>CEDULA</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{employee?.cedula}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>C.C.</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{employee?.centro_costo}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>CONTRATO</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{employee?.contract_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>BANCO</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{employee?.bank_name}</Text>
            </View>
          </View>

          <View style={styles.rightColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>NOMINA</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{company?.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>PERIODO</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>
                DESDE {new Date(period?.start_date).toLocaleDateString()} HASTA{" "}
                {new Date(period?.end_date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>INGRESO</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{new Date(employee?.hire_date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>HONORARIOS</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{employee?.base_salary?.toLocaleString()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>CUENTA</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{employee?.account_number}</Text>
            </View>
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.infoSection}>
          <View style={styles.leftColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>PAGO</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{period?.period_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>HONORARIOS</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{employee?.salary_type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>A.F.P.</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{employee?.afp}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>E.P.S.</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.value}>{employee?.eps}</Text>
            </View>
          </View>
        </View>



        {/* Concepts and Deductions */}
        <View style={styles.conceptsSection}>
          {/* Deductions */}
          <View style={styles.deductionsColumn}>
            {deductions?.map((deduction, index) => (
              <View key={index} style={styles.conceptRow}>
                <Text style={styles.conceptCode}>{deduction.deduction_code}</Text>
                <Text style={styles.conceptName}>{deduction.deduction_name}</Text>
                <Text style={styles.conceptAmount}>{deduction.base_amount?.toLocaleString()}</Text>
                <Text style={styles.conceptDays}>{deduction.deduction_value?.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTitleRow}>
            <Text style={styles.totalTitle}>TOTAL DEVENGADO</Text>
            <Text style={styles.totalTitle}>TOTAL DEDUCCIONES</Text>
            <Text style={styles.totalTitle}>NETO A PAGAR</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalAmount}>{summary?.total_earned?.toLocaleString()}</Text>
            <Text style={styles.totalAmount}>{summary?.total_deductions?.toLocaleString()}</Text>
            <Text style={styles.totalAmount}>{summary?.net_pay?.toLocaleString()}</Text>
          </View>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              {/* Employee signature area - empty */}
            </View>
            <Text style={styles.signatureText}>Firma del Empleado</Text>
            <Text style={styles.signatureName}>{employee?.full_name}</Text>
          </View>

          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Image
                style={styles.signatureImage}
                src="public/placeholders/default-signature.png"
              />
            </View>
            <Text style={styles.signatureText}>Representante Legal</Text>
            <Text style={styles.signatureName}>{company?.nombre_representante || company?.name}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}