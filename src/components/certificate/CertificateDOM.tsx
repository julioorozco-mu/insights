"use client";

import React, { forwardRef } from 'react';
import { CertificateTemplate, CertificateSignature } from '@/types/certificate';

interface Props {
  template: CertificateTemplate;
  data: Record<string, string>;
  signatures?: CertificateSignature[];
  backgroundSrc?: string; // prefer data URL
}

const CertificateDOM = forwardRef<HTMLDivElement, Props>(function CertificateDOM(
  { template, data, signatures = [], backgroundSrc },
  ref
) {
  const designWidth = template.designWidth || 900;
  const designHeight = template.designHeight || 600;

  const getValue = (variableKey?: string, value?: string) => {
    if (variableKey && data[variableKey as keyof typeof data]) {
      const dataValue = data[variableKey as keyof typeof data] as string;
      // Aplicar uppercase a studentName
      if (variableKey === 'studentName' && dataValue) {
        return dataValue.toUpperCase();
      }
      return dataValue;
    }
    return value || '';
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: `${designWidth}px`,
        height: `${designHeight}px`,
        background: '#ffffff',
      }}
    >
      {/* Fondo */}
      {template.backgroundUrl && (
        <img
          src={backgroundSrc || template.backgroundUrl}
          alt="Fondo"
          style={{
            position: 'absolute',
            inset: 0,
            width: `${designWidth}px`,
            height: `${designHeight}px`,
            objectFit: 'cover',
          }}
        />
      )}

      {/* Elementos */}
      {template.elements.map((el) => (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}px`,
            top: `${el.y}px`,
            width: `${el.width}px`,
            height: `${el.height}px`,
            fontSize: `${el.style?.fontSize || 18}px`,
            color: el.style?.color || '#000',
            fontFamily: el.style?.fontFamily || 'Helvetica, Arial, sans-serif',
            textAlign: el.style?.align || 'left',
            fontWeight: el.style?.bold ? 'bold' : 'normal',
            fontStyle: el.style?.italic ? 'italic' : 'normal',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              el.style?.align === 'center' ? 'center' : el.style?.align === 'right' ? 'flex-end' : 'flex-start',
            pointerEvents: 'none',
          }}
        >
          {getValue(el.variableKey, el.value)}
        </div>
      ))}

      {/* Firmas */}
      {signatures.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: `${0.08 * designHeight}px`,
            left: `${0.1 * designWidth}px`,
            right: `${0.1 * designWidth}px`,
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'flex-end',
          }}
        >
          {signatures.map((signature) => (
            <div
              key={signature.id}
              style={{
                flex: 1,
                textAlign: 'center',
                maxWidth: `${0.8 * designWidth / signatures.length}px`,
              }}
            >
              {signature.imageUrl && (
                <img
                  src={signature.imageUrl}
                  alt="Firma"
                  style={{
                    width: `${0.14 * designWidth}px`,
                    height: `${0.07 * designHeight}px`,
                    objectFit: 'contain',
                    marginBottom: '4px',
                  }}
                />
              )}
              <div
                style={{
                  borderTop: '1px solid #000',
                  paddingTop: '4px',
                  fontSize: '10px',
                }}
              >
                {signature.name && (
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{signature.name}</div>
                )}
                {signature.title && (
                  <div style={{ fontSize: '9px', color: '#666' }}>{signature.title}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default CertificateDOM;
