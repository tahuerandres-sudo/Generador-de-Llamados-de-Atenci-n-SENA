export interface GeneralInfo {
  programa: string;
  codigoFicha: string;
  nombreInstructorAsignado: string;
  nombreInstructorLlamado: string;
  motivo: string;
  competencia: string;
  resultadosAprendizaje: string[]; // List of RAs
  observacionesAprendiz: string;
  juicioTexto: string;
  juicioResultado: 'NO_APROBO' | 'APROBO';
  senaLogoUrl?: string;
  codigoDocumento?: string;
  fecha?: string;
  cargoCoordinador?: string;
}

export type EvidenceStatus = 'NO' | 'SI' | 'CORREGIR' | '-';

export interface EvidenceItem {
  id: string;
  numero: number;
  nombre: string;
  fechaEntrega?: string;
  defaultEstado: EvidenceStatus;
  observacion?: string;
  rap?: string;
}

export interface ApprenticeEvidenceStatus {
  evidenceId: string;
  estado: EvidenceStatus;
  observacion?: string;
}

export interface Apprentice {
  id: string;
  nombre: string;
  documento?: string;
  correo: string;
  telefono?: string;
  // Custom evidence statuses if overridden from default
  evidenciasStatus?: Record<string, EvidenceStatus>;
  observacionesEspecificas?: string;
  juicioEspecifico?: 'NO_APROBO' | 'APROBO';
  observacionAprendizEspecifica?: string;
}

export interface SignatureConfig {
  instructorSignatureType: 'drawn' | 'upload' | 'text' | 'none';
  instructorSignatureData?: string; // base64 data url
  instructorName: string;
  coordinadorName?: string;
  subdirectorName?: string;
}

export type ActiveTab = 'general' | 'evidencias' | 'matriz' | 'aprendices' | 'vista-previa';

export interface ProgramSlot {
  id: number;
  name: string;
  codigoFicha: string;
  generalInfo: GeneralInfo;
  evidences: EvidenceItem[];
  apprentices: Apprentice[];
  signatureConfig: SignatureConfig;
}

