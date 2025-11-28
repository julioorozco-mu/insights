// Elemento del certificado (texto, imagen, variable)
export interface CertificateElement {
  id: string;
  type: 'text' | 'variable' | 'image';
  value?: string; // Para textos fijos o URLs de imagen
  variableKey?: 'studentName' | 'courseTitle' | 'instructorName' | 'completionDate' | 'signatureUrl';
  x: number;
  y: number;
  width: number;
  height: number;
  style?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    align?: 'left' | 'center' | 'right';
  };
}

// Colección: certificateTemplates
export type CertificatePageSize = 'letter' | 'legal';
export type CertificateOrientation = 'portrait' | 'landscape';

export interface CertificateSignature {
  id: string;
  imageUrl: string; // PNG transparente recomendado
  name: string;     // Nombre del firmante
  title: string;    // Cargo/título
}

export interface CertificateTemplate {
  id: string;
  title: string;
  description?: string;
  backgroundUrl: string;
  elements: CertificateElement[]; // Elementos arrastrables del editor
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Configuración de página
  pageSize?: CertificatePageSize;           // carta (letter) u oficio (legal)
  orientation?: CertificateOrientation;     // vertical u horizontal
  // Dimensiones del lienzo de diseño usadas en el editor (para escalar en PDF y preview)
  designWidth?: number;  // px
  designHeight?: number; // px
  // Firmas a mostrar en el certificado
  signatures?: CertificateSignature[];
}

// Colección: certificates
export interface Certificate {
  id: string;
  studentId: string;
  courseId: string;
  certificateTemplateId: string;
  studentName: string;
  courseTitle: string;
  speakerNames: string[];
  issueDate: string;
  certificateUrl?: string; // URL del PDF o imagen generada
  createdAt: string;
  verified?: boolean;
}

export interface CreateCertificateTemplateData {
  title: string;
  backgroundUrl: string;
  signatureUrls?: string[];
  style?: {
    fontFamily?: string;
    colorPrimary?: string;
    positionMap?: Record<string, { x: number; y: number }>;
  };
}

export interface UpdateCertificateTemplateData {
  title?: string;
  backgroundUrl?: string;
  signatureUrls?: string[];
  style?: {
    fontFamily?: string;
    colorPrimary?: string;
    positionMap?: Record<string, { x: number; y: number }>;
  };
}

export interface IssueCertificateData {
  studentId: string;
  courseId: string;
  certificateTemplateId: string;
  studentName: string;
  courseTitle: string;
  speakerNames: string[];
}
