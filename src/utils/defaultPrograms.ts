import { ProgramSlot, Apprentice, EvidenceItem } from '../types';
import {
  INITIAL_GENERAL_INFO,
  INITIAL_EVIDENCES,
  INITIAL_SIGNATURE_CONFIG,
  SAMPLE_NAMES_80
} from './sampleData';

function createSampleApprentices(names: string[], evidenceList: EvidenceItem[]): Apprentice[] {
  return names.map((nombre, idx) => {
    const docNum = (1014000000 + (idx + 1) * 3471).toString();
    const cleanMail = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '');

    const sampleEvStatus: Record<string, 'SI' | 'NO' | 'CORREGIR'> = {};
    const pattern = idx % 5;
    evidenceList.forEach((ev, evIdx) => {
      if (pattern === 0) {
        sampleEvStatus[ev.id] = evIdx < 4 ? 'SI' : evIdx === 4 ? 'CORREGIR' : 'NO';
      } else if (pattern === 1) {
        sampleEvStatus[ev.id] = evIdx < 2 ? 'SI' : evIdx < 3 ? 'CORREGIR' : 'NO';
      } else if (pattern === 2) {
        sampleEvStatus[ev.id] = evIdx % 2 === 0 ? 'CORREGIR' : 'NO';
      } else if (pattern === 3) {
        sampleEvStatus[ev.id] = evIdx === 0 ? 'SI' : 'NO';
      } else {
        sampleEvStatus[ev.id] = 'NO';
      }
    });

    return {
      id: `app-slot-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`,
      nombre,
      documento: docNum,
      correo: `${cleanMail}@misena.edu.co`,
      telefono: `3${Math.floor(100000000 + Math.random() * 90000000)}`,
      evidenciasStatus: sampleEvStatus,
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    };
  });
}

function createSampleEvidences(count: number, prefix: string = 'GA'): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  for (let i = 1; i <= count; i++) {
    const rapNum = i <= Math.ceil(count / 2) ? 1 : 2;
    items.push({
      id: `ev-${prefix.toLowerCase()}-${i}`,
      numero: i,
      nombre: `Evidencia ${prefix}${rapNum}-240202501-AA${Math.ceil(i / 2)}-EV0${(i % 3) + 1}. Actividad técnica ${i}`,
      rap: `RAP ${rapNum}`,
      defaultEstado: 'NO',
      observacion: ''
    });
  }
  return items;
}

export function getDefaultPrograms(): ProgramSlot[] {
  // 1. Program 1: Gestión contable y de información financiera (27 aprendices, 10 evid.)
  const p1Evidences = createSampleEvidences(10, 'GA1');
  const p1Names = SAMPLE_NAMES_80.slice(0, 27);
  const p1Apprentices = createSampleApprentices(p1Names, p1Evidences);

  // 2. Program 2: Desarrollo de videojuegos y entornos interactivos (68 aprendices, 8 evid.)
  const p2Evidences: EvidenceItem[] = [
    ...INITIAL_EVIDENCES,
    {
      id: 'ev-8',
      numero: 8,
      nombre: 'Evidencia GA2-240202501-AA2-EV02. Documento de especificación.',
      rap: 'RAP 2',
      defaultEstado: 'NO',
      observacion: ''
    }
  ];
  const p2Names = SAMPLE_NAMES_80.slice(0, 68);
  const p2Apprentices = createSampleApprentices(p2Names, p2Evidences);

  // 3. Program 3: Gestión contable y de información financiera (3 aprendices, 4 evid.)
  const p3Evidences = createSampleEvidences(4, 'GA3');
  const p3Names = SAMPLE_NAMES_80.slice(27, 30);
  const p3Apprentices = createSampleApprentices(p3Names, p3Evidences);

  // 4. Program 4: Animación 3D y Modelado Digital (3 aprendices, 4 evid.)
  const p4Evidences = createSampleEvidences(4, 'GA4');
  const p4Names = SAMPLE_NAMES_80.slice(30, 33);
  const p4Apprentices = createSampleApprentices(p4Names, p4Evidences);

  // 5. Program 5: Administración y Seguridad en Redes de Computadores (3 aprendices, 4 evid.)
  const p5Evidences = createSampleEvidences(4, 'GA5');
  const p5Names = SAMPLE_NAMES_80.slice(33, 36);
  const p5Apprentices = createSampleApprentices(p5Names, p5Evidences);

  return [
    {
      id: 1,
      name: 'Gestión contable y de información financiera',
      codigoFicha: '3491355',
      generalInfo: {
        ...INITIAL_GENERAL_INFO,
        programa: 'Gestión contable y de información financiera',
        codigoFicha: '3491355'
      },
      evidences: p1Evidences,
      apprentices: p1Apprentices,
      signatureConfig: { ...INITIAL_SIGNATURE_CONFIG }
    },
    {
      id: 2,
      name: 'Desarrollo de videojuegos y entornos interactivos',
      codigoFicha: '3466175',
      generalInfo: {
        ...INITIAL_GENERAL_INFO,
        programa: 'Desarrollo de videojuegos y entornos interactivos',
        codigoFicha: '3466175'
      },
      evidences: p2Evidences,
      apprentices: p2Apprentices,
      signatureConfig: { ...INITIAL_SIGNATURE_CONFIG }
    },
    {
      id: 3,
      name: 'Gestión contable y de información financiera',
      codigoFicha: '2901452',
      generalInfo: {
        ...INITIAL_GENERAL_INFO,
        programa: 'Gestión contable y de información financiera',
        codigoFicha: '2901452'
      },
      evidences: p3Evidences,
      apprentices: p3Apprentices,
      signatureConfig: { ...INITIAL_SIGNATURE_CONFIG }
    },
    {
      id: 4,
      name: 'Animación 3D y Modelado Digital',
      codigoFicha: '3015884',
      generalInfo: {
        ...INITIAL_GENERAL_INFO,
        programa: 'Animación 3D y Modelado Digital',
        codigoFicha: '3015884'
      },
      evidences: p4Evidences,
      apprentices: p4Apprentices,
      signatureConfig: { ...INITIAL_SIGNATURE_CONFIG }
    },
    {
      id: 5,
      name: 'Administración y Seguridad en Redes de Computadores',
      codigoFicha: '3129840',
      generalInfo: {
        ...INITIAL_GENERAL_INFO,
        programa: 'Administración y Seguridad en Redes de Computadores',
        codigoFicha: '3129840'
      },
      evidences: p5Evidences,
      apprentices: p5Apprentices,
      signatureConfig: { ...INITIAL_SIGNATURE_CONFIG }
    }
  ];
}
