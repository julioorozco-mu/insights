import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #e5041e',
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e5041e',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
    textAlign: 'center',
  },
  date: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e5041e',
    color: '#fff',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e0e0e0',
    padding: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1 solid #e0e0e0',
    padding: 8,
    backgroundColor: '#f5f5f5',
  },
  col1: { width: '18%' }, // Nombre completo
  col2: { width: '10%' }, // Teléfono
  col3: { width: '12%' }, // Estado
  col4: { width: '16%' }, // Correo electrónico
  col5: { width: '8%' }, // Sexo
  col6: { width: '8%' }, // Edad
  col7: { width: '12%' }, // F. Nacimiento
  col8: { width: '16%' }, // Constancia
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    borderTop: '1 solid #e0e0e0',
    paddingTop: 10,
  },
  summary: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f7ff',
    borderRadius: 5,
  },
  summaryText: {
    fontSize: 11,
    marginBottom: 3,
  },
});

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  state?: string;
  age?: number;
  birthDate?: string;
  gender?: string;
  hasCertificate: boolean;
  enrolledAt: string;
}

interface StudentReportPDFProps {
  courseTitle: string;
  students: Student[];
  generatedDate: string;
  lessonTitle?: string;
}

export default function StudentReportPDF({ courseTitle, students, generatedDate, lessonTitle }: StudentReportPDFProps) {
  const totalStudents = students.length;
  const withCertificates = students.filter(s => s.hasCertificate).length;
  const withoutCertificates = totalStudents - withCertificates;

  const reportTitle = lessonTitle
    ? `Reporte de Asistencia - Lección`
    : `Reporte de Estudiantes Inscritos`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {/* Logo PRI Estado de México */}
            <View style={styles.logoContainer}>
              <Image 
                src="/images/logos/logo_pri_edomex.png" 
                style={styles.logo}
              />
            </View>
            
            {/* Título y texto central */}
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>{reportTitle}</Text>
              <Text style={styles.subtitle}>Curso: {courseTitle}</Text>
              {lessonTitle && (
                <Text style={styles.subtitle}>Lección: {lessonTitle}</Text>
              )}
              <Text style={styles.date}>Generado: {generatedDate}</Text>
            </View>
            
            {/* Logo Instituto Reyes Heroles */}
            <View style={styles.logoContainer}>
              <Image 
                src="/images/logos/logo-ire-edomex.png" 
                style={styles.logo}
              />
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Nombre Completo</Text>
            <Text style={styles.col2}>Teléfono</Text>
            <Text style={styles.col3}>Estado</Text>
            <Text style={styles.col4}>Correo Electrónico</Text>
            <Text style={styles.col5}>Sexo</Text>
            <Text style={styles.col6}>Edad</Text>
            <Text style={styles.col7}>F. Nacimiento</Text>
            <Text style={styles.col8}>Constancia</Text>
          </View>

          {/* Table Rows */}
          {students.map((student, index) => {
            // Formatear fecha de nacimiento
            const formattedBirthDate = student.birthDate
              ? new Date(student.birthDate).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })
              : 'N/A';

            return (
              <View key={student.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.col1}>{student.name}</Text>
                <Text style={styles.col2}>{student.phone || 'N/A'}</Text>
                <Text style={styles.col3}>{student.state || 'N/A'}</Text>
                <Text style={styles.col4}>{student.email}</Text>
                <Text style={styles.col5}>{student.gender || 'N/A'}</Text>
                <Text style={styles.col6}>{student.age || 'N/A'}</Text>
                <Text style={styles.col7}>{formattedBirthDate}</Text>
                <Text style={styles.col8}>{student.hasCertificate ? 'Sí' : 'No'}</Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Reporte generado automáticamente - Página 1 de 1
        </Text>
      </Page>
    </Document>
  );
}
