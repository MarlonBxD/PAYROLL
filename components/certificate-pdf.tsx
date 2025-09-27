import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'

// Define styles for certificate
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  certificateContent: {
    marginBottom: 15,
    lineHeight: 1.4,
  },
  certificateText: {
    fontSize: 11,
    textAlign: 'justify',
    marginBottom: 8,
    lineHeight: 1.4,
  },
  highlightText: {
    fontWeight: 'bold',
  },
  infoSection: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#000000',
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 120,
    fontSize: 11,
    fontWeight: 'bold',
  },
  colon: {
    width: 10,
    fontSize: 11,
  },
  value: {
    flex: 1,
    fontSize: 11,
  },
  paymentSection: {
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#000000',
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  paymentLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  paymentAmount: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#000000',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  signatureSection: {
    marginTop: 20,
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
    height: 40,
    marginBottom: 3,
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
  footer: {
    marginTop: 15,
    padding: 8,
    borderWidth: 1,
    borderColor: '#000000',
  },
  footerText: {
    fontSize: 9,
    textAlign: 'center',
  },
})

interface CertificatePDFProps {
  data: {
    company: any
    period: any
    employee: any
    summary: any
    concepts: any[]
    deductions: any[]
  }
}

export const CertificatePDF = ({ data }: CertificatePDFProps) => {
  const { company, period, employee, summary, concepts, deductions } = data

  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Document title={`Certificado de Pago - ${employee?.full_name}`}>
      <Page size="LETTER" style={styles.page}>
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
            <Text style={styles.documentTitle}>CERTIFICADO DE PAGO</Text>
          </View>
        </View>

        {/* Certificate Content */}
        <View style={styles.certificateContent}>
          <Text style={styles.certificateText}>
            La empresa <Text style={styles.highlightText}>{company?.name}</Text>, 
            identificada con NIT <Text style={styles.highlightText}>{company?.nit}</Text>, 
            por medio del presente documento
          </Text>

          <Text style={styles.certificateText}>
            <Text style={styles.highlightText}>CERTIFICA</Text>
          </Text>

          <Text style={styles.certificateText}>
            Que el(la) señor(a) <Text style={styles.highlightText}>{employee?.full_name}</Text>, 
            identificado(a) con cédula de ciudadanía No. <Text style={styles.highlightText}>{employee?.cedula}</Text>, 
            prestó servicios profesionales a esta empresa durante el período comprendido entre el{" "}
            <Text style={styles.highlightText}>
              {new Date(period?.start_date).toLocaleDateString('es-ES')}
            </Text>{" "}
            y el{" "}
            <Text style={styles.highlightText}>
              {new Date(period?.end_date).toLocaleDateString('es-ES')}
            </Text>.
          </Text>
        </View>

        {/* Employee Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>INFORMACIÓN DEL CONTRATISTA</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Nombre Completo</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{employee?.full_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Cédula</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{employee?.cedula}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Cargo/Posición</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{employee?.position || 'Contratista'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Período</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>
              {new Date(period?.start_date).toLocaleDateString('es-ES')} - {new Date(period?.end_date).toLocaleDateString('es-ES')}
            </Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>DETALLE DE PAGOS</Text>
          
          {/* Concepts */}
          {concepts?.map((concept, index) => (
            <View key={index} style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>{concept.concept_name}</Text>
              <Text style={styles.paymentAmount}>${concept.total_value?.toLocaleString()}</Text>
            </View>
          ))}

          {/* Deductions */}
          {deductions?.map((deduction, index) => (
            <View key={index} style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>(-) {deduction.deduction_name}</Text>
              <Text style={styles.paymentAmount}>-${deduction.deduction_value?.toLocaleString()}</Text>
            </View>
          ))}

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VALOR TOTAL PAGADO</Text>
            <Text style={styles.totalAmount}>${summary?.net_pay?.toLocaleString()}</Text>
          </View>
        </View>

        {/* Additional Certificate Text */}
        <View style={styles.certificateContent}>
          <Text style={styles.certificateText}>
            Se expide el presente certificado a solicitud del interesado para los fines que considere convenientes.
          </Text>

          <Text style={styles.certificateText}>
            Dado en {company?.address || '[Ciudad]'}, a los {currentDate}.
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              {/* Empty signature area for recipient */}
            </View>
            <Text style={styles.signatureText}>Recibí Conforme</Text>
            <Text style={styles.signatureName}>{employee?.full_name}</Text>
            <Text style={styles.signatureText}>C.C. {employee?.cedula}</Text>
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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este documento ha sido generado electrónicamente y es válido sin firma autógrafa.
          </Text>
        </View>
      </Page>
    </Document>
  )
}