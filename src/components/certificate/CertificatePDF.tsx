import React from 'react';
import { Document, Page, Text, Image, StyleSheet, View } from '@react-pdf/renderer';
import { CertificateTemplate } from '@/types/certificate';

const styles = StyleSheet.create({
  page: {
    position: 'relative',
  },
  background: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

interface Signature {
  id: string;
  imageUrl: string;
  title: string;
  name: string;
}

interface Props {
  template: CertificateTemplate;
  data: {
    studentName?: string;
    courseTitle?: string;
    instructorName?: string;
    completionDate?: string;
    signatureUrl?: string;
  };
  signatures?: Signature[];
}

export default function CertificatePDF({ template, data, signatures = [] }: Props) {
  const getValue = (variableKey?: string, value?: string) => {
    if (variableKey && data[variableKey as keyof typeof data]) {
      const dataValue = data[variableKey as keyof typeof data];
      // Aplicar uppercase a studentName
      if (variableKey === 'studentName' && dataValue) {
        return dataValue.toUpperCase();
      }
      return dataValue;
    }
    return value || '';
  };

  // Page size in PDF points (72 points = 1 inch)
  const PAGE_SIZES = {
    letter: { width: 612, height: 792 },  // 8.5 x 11 in
    legal: { width: 612, height: 1008 },  // 8.5 x 14 in
  } as const;

  const pageSizeKey = template.pageSize || 'letter';
  const orientation = template.orientation || 'landscape';
  const base = PAGE_SIZES[pageSizeKey];
  const pageWidth = orientation === 'landscape' ? base.height : base.width;
  const pageHeight = orientation === 'landscape' ? base.width : base.height;

  // Design dimensions used in the editor (coordinate system)
  const designWidth = template.designWidth || 900;
  const designHeight = template.designHeight || 600;
  const scaleX = pageWidth / designWidth;
  const scaleY = pageHeight / designHeight;
  const fontScale = Math.min(scaleX, scaleY);



  return (
    <Document>
      <Page size={{ width: pageWidth, height: pageHeight }} style={styles.page}>
        {/* Fondo */}
        {template.backgroundUrl ? (
          <Image 
            src={template.backgroundUrl} 
            style={{ ...styles.background, width: pageWidth, height: pageHeight, objectFit: 'cover' }} 
          />
        ) : null}

        {/* Elementos */}
        {template.elements.map((el) => {
          if (el.type === 'image' && el.variableKey === 'signatureUrl' && data.signatureUrl) {
            return (
              <Image
                key={el.id}
                src={data.signatureUrl}
                style={{
                  position: 'absolute',
                  left: el.x * scaleX,
                  top: el.y * scaleY,
                  width: el.width * scaleX,
                  height: el.height * scaleY,
                }}
              />
            );
          }

          if (el.type === 'variable' || el.type === 'text') {
            // Convertir fuente a una compatible si es necesario
            const allowed = new Set([
              'Helvetica','Helvetica-Bold','Helvetica-Oblique','Helvetica-BoldOblique',
              'Times-Roman','Times-Bold','Times-Italic','Times-BoldItalic',
              'Courier','Courier-Bold','Courier-Oblique','Courier-BoldOblique'
            ]);
            let fontFamily = el.style?.fontFamily || 'Helvetica';
            if (fontFamily === 'Arial' || !allowed.has(fontFamily)) {
              fontFamily = 'Helvetica';
            }

            const fs = (el.style?.fontSize || 18) * fontScale;
            const top = el.y * scaleY + ((el.height * scaleY) - fs) / 2; // centrar vertical

            return (
              <Text
                key={el.id}
                style={{
                  position: 'absolute',
                  left: el.x * scaleX,
                  top,
                  width: el.width * scaleX,
                  fontSize: fs,
                  color: el.style?.color || '#000',
                  fontFamily: fontFamily,
                  textAlign: (el.style?.align as any) || 'left',
                  fontWeight: el.style?.bold ? 'bold' : 'normal',
                  fontStyle: el.style?.italic ? 'italic' : 'normal',
                }}
              >
                {getValue(el.variableKey, el.value)}
              </Text>
            );
          }

          return null;
        })}

        {/* Firmas */}
        {signatures.length > 0 && (
          <View
            style={{
              position: 'absolute',
              bottom: 0.08 * pageHeight,
              left: 0.1 * pageWidth,
              right: 0.1 * pageWidth,
              flexDirection: 'row',
              justifyContent: 'space-around',
            }}
          >
            {signatures.map((signature, index) => (
              <View
                key={signature.id}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  maxWidth: `${80 / signatures.length}%`,
                }}
              >
                {signature.imageUrl && (
                  <Image
                    src={signature.imageUrl}
                    style={{
                      width: 0.14 * pageWidth,
                      height: 0.07 * pageHeight,
                      objectFit: 'contain',
                      marginBottom: 4,
                    }}
                  />
                )}
                <View
                  style={{
                    borderTop: '1 solid #000',
                    paddingTop: 4,
                    width: '100%',
                  }}
                >
                  {signature.name && (
                    <Text
                      style={{
                        fontSize: 10 * fontScale,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginBottom: 2,
                      }}
                    >
                      {signature.name}
                    </Text>
                  )}
                  {signature.title && (
                    <Text
                      style={{
                        fontSize: 9 * fontScale,
                        color: '#666',
                        textAlign: 'center',
                      }}
                    >
                      {signature.title}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
