import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Apprentice, EvidenceItem, EvidenceStatus, GeneralInfo } from '../types';
import { getSenaLogoDataUrl } from './senaLogo';

export interface ApprenticeEvidenceDetail {
  originalIndex: number; // 1-based original list number
  apprentice: Apprentice;
  presentedCount: number;
  missingCount: number;
  correctingCount: number;
  totalEvidences: number;
  compliancePercentage: number;
  allApproved: boolean;
  presentedEvidences: EvidenceItem[];
  missingEvidences: EvidenceItem[];
  correctingEvidences: EvidenceItem[];
  statuses: Record<string, EvidenceStatus>;
}

export interface GuiaGroup {
  guiaNumber: string;
  guiaTitle: string;
  evidences: EvidenceItem[];
}

/**
 * Normalizes raw string/value to EvidenceStatus ('SI' | 'NO' | 'CORREGIR' | '-')
 */
export function normalizeEvidenceStatus(val: any): EvidenceStatus {
  if (val === undefined || val === null) return 'NO';
  const s = String(val).trim().toUpperCase();
  if (!s) return 'NO';
  if (
    s === 'SI' ||
    s === 'SÍ' ||
    s === 'S' ||
    s === 'A' ||
    s === 'APROBADO' ||
    s === 'APROBADA' ||
    s === 'APROBO' ||
    s === 'APROBÓ' ||
    s === 'ENTREGADO' ||
    s === 'ENTREGADA' ||
    s === 'ENTREGO' ||
    s === 'ENTREGÓ' ||
    s === 'CUMPLE' ||
    s === 'CUMPLIO' ||
    s === 'CUMPLIÓ' ||
    s === '1' ||
    s === 'TRUE' ||
    s === 'VERDADERO' ||
    s === 'OK' ||
    s === '✓' ||
    s === '✔'
  ) {
    return 'SI';
  }
  if (
    s === 'CORREGIR' ||
    s === 'CORRIGE' ||
    s === 'CORRECCION' ||
    s === 'CORRECCIÓN' ||
    s === 'POR CORREGIR' ||
    s === 'C' ||
    s.includes('CORREG') ||
    s.includes('AJUST')
  ) {
    return 'CORREGIR';
  }
  if (s === '-' || s === 'N/A' || s === 'NO APLICA') {
    return '-';
  }
  return 'NO';
}

/**
 * Checks if an apprentice has submitted at least one evidence (SI or CORREGIR)
 */
export function hasSubmittedAtLeastOneEvidence(
  apprentice: Apprentice,
  evidences: EvidenceItem[]
): boolean {
  if (!evidences || evidences.length === 0) return true;
  return evidences.some((ev) => {
    const rawStatus =
      (apprentice.evidenciasStatus && apprentice.evidenciasStatus[ev.id]) ??
      ev.defaultEstado ??
      'NO';
    const status = normalizeEvidenceStatus(rawStatus);
    return status === 'SI' || status === 'CORREGIR';
  });
}

/**
 * Counts how many apprentices have submitted at least one evidence
 */
export function countActiveApprentices(
  apprentices: Apprentice[],
  evidences: EvidenceItem[]
): number {
  return apprentices.filter((app) => hasSubmittedAtLeastOneEvidence(app, evidences)).length;
}

/**
 * Analyzes an apprentice's evidence statuses and detailed lists of presented vs missing
 */
export function getApprenticeEvidenceDetail(
  apprentice: Apprentice,
  evidences: EvidenceItem[],
  originalIndex: number
): ApprenticeEvidenceDetail {
  const presentedEvidences: EvidenceItem[] = [];
  const missingEvidences: EvidenceItem[] = [];
  const correctingEvidences: EvidenceItem[] = [];
  const statuses: Record<string, EvidenceStatus> = {};

  evidences.forEach((ev) => {
    const rawStatus =
      (apprentice.evidenciasStatus && apprentice.evidenciasStatus[ev.id]) ??
      ev.defaultEstado ??
      'NO';
    const status = normalizeEvidenceStatus(rawStatus);
    statuses[ev.id] = status;

    if (status === 'SI') {
      presentedEvidences.push(ev);
    } else if (status === 'CORREGIR') {
      correctingEvidences.push(ev);
    } else {
      missingEvidences.push(ev);
    }
  });

  const total = evidences.length;
  const presentedCount = presentedEvidences.length;
  const missingCount = missingEvidences.length;
  const correctingCount = correctingEvidences.length;
  const compliancePercentage = total > 0 ? Math.round((presentedCount / total) * 100) : 0;
  const allApproved = total > 0 && presentedCount === total;

  return {
    originalIndex,
    apprentice,
    presentedCount,
    missingCount,
    correctingCount,
    totalEvidences: total,
    compliancePercentage,
    allApproved,
    presentedEvidences,
    missingEvidences,
    correctingEvidences,
    statuses
  };
}

/**
 * Returns evidence details for ALL apprentices in the ficha
 */
export function getAllApprenticesDetails(
  apprentices: Apprentice[],
  evidences: EvidenceItem[]
): ApprenticeEvidenceDetail[] {
  return apprentices.map((app, idx) => getApprenticeEvidenceDetail(app, evidences, idx + 1));
}

/**
 * Filters the list to only apprentices who have submitted at least one evidence
 */
export function getActiveApprenticesDetails(
  apprentices: Apprentice[],
  evidences: EvidenceItem[]
): ApprenticeEvidenceDetail[] {
  const list: ApprenticeEvidenceDetail[] = [];

  apprentices.forEach((app, idx) => {
    if (hasSubmittedAtLeastOneEvidence(app, evidences)) {
      list.push(getApprenticeEvidenceDetail(app, evidences, idx + 1));
    }
  });

  return list;
}

/**
 * Groups evidences by Guía de Aprendizaje (e.g. GA1 -> GUIA DE APRENDIZAJE Nº 1, GA2 -> GUIA DE APRENDIZAJE Nº 2)
 */
export function groupEvidencesByGuia(evidences: EvidenceItem[]): GuiaGroup[] {
  if (!evidences || evidences.length === 0) return [];

  const groupsMap = new Map<string, EvidenceItem[]>();

  evidences.forEach((ev) => {
    const name = ev.nombre || '';
    // Check patterns like GA1, GA2, Guía 1, Guia 2, G1, etc.
    const matchGA = name.match(/GA\s*(\d+)/i);
    const matchGuia = name.match(/Gu[ií]a\s*(?:de\s*aprendizaje)?\s*(?:N[°º.]?\s*)?(\d+)/i);
    const matchG = name.match(/\bG(\d+)\b/i);

    let guiaNum = '1';
    if (matchGA) {
      guiaNum = matchGA[1];
    } else if (matchGuia) {
      guiaNum = matchGuia[1];
    } else if (matchG) {
      guiaNum = matchG[1];
    } else {
      // Default: if first half vs second half or single guia
      guiaNum = '1';
    }

    if (!groupsMap.has(guiaNum)) {
      groupsMap.set(guiaNum, []);
    }
    groupsMap.get(guiaNum)!.push(ev);
  });

  // Convert to sorted array of GuiaGroup
  const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  return sortedKeys.map((key) => ({
    guiaNumber: key,
    guiaTitle: `GUIA DE APRENDIZAJE Nº ${key}`,
    evidences: groupsMap.get(key)!
  }));
}

/**
 * Builds the spreadsheet title string
 */
export function buildPlanillaTitle(generalInfo: GeneralInfo): string {
  const comp = (generalInfo.competencia || 'TRANSVERSAL INGLES')
    .replace(/^competencia:\s*/i, '')
    .trim();
  const prog = (generalInfo.programa || 'Programa de Formación').trim();
  const ficha = (generalInfo.codigoFicha || '').trim();

  return `LISTADO DE EVIDENCIAS ${comp.toUpperCase()} - ${prog} ${ficha}`.trim();
}

/**
 * Resolves the short RAP label for an evidence (e.g. "RAP 1", "RAP 2")
 */
export function getEvidenceRapLabel(ev: EvidenceItem, generalInfo: GeneralInfo): string {
  if (ev.rap && ev.rap.trim()) {
    const clean = ev.rap.trim();
    if (/^rap\s*\d+/i.test(clean)) {
      return clean.toUpperCase().replace(/\s+/, ' ');
    }
    return clean;
  }
  const nameNorm = (ev.nombre || '').toUpperCase();
  const rapMatch = nameNorm.match(/RAP\s*(\d+)/i);
  if (rapMatch && rapMatch[1]) {
    return `RAP ${rapMatch[1]}`;
  }
  const gaMatch = nameNorm.match(/GA\s*(\d+)/i);
  if (gaMatch && gaMatch[1]) {
    return `RAP ${gaMatch[1]}`;
  }
  if (generalInfo.resultadosAprendizaje && generalInfo.resultadosAprendizaje.length === 1) {
    return 'RAP 1';
  }
  const totalRaps = generalInfo.resultadosAprendizaje?.length || 1;
  const num = Math.min(ev.numero, totalRaps);
  return `RAP ${num > 0 ? num : 1}`;
}

/**
 * Resolves the full RAP description associated with an evidence
 */
export function getEvidenceRapDescription(ev: EvidenceItem, generalInfo: GeneralInfo): string {
  const rapLabel = getEvidenceRapLabel(ev, generalInfo);
  const numMatch = rapLabel.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : 1;
  const ras = generalInfo.resultadosAprendizaje || [];
  if (ras.length >= num && ras[num - 1]) {
    return ras[num - 1];
  }
  return ras[0] || rapLabel;
}

/**
 * EXPORT 1: Generates an Excel HTML/XML spreadsheet (.xls)
 * Opens in Microsoft Excel, LibreOffice and Google Sheets with ALL colors:
 * - Green cells for SI (#92d050)
 * - Pink cells for NO (#fce4d6)
 * - Yellow cells for CORREGIR (#fff2cc)
 * - Sky blue cells (#70d6ff) for apprentices who have 100% approved
 * - Merged Guías and title headers with solid black borders
 */
export function exportActiveApprenticesStyledHtmlExcel(
  apprentices: Apprentice[],
  evidences: EvidenceItem[],
  generalInfo: GeneralInfo,
  fileName?: string
): void {
  const activeDetails = getActiveApprenticesDetails(apprentices, evidences);
  const guiaGroups = groupEvidencesByGuia(evidences);
  const title = buildPlanillaTitle(generalInfo);
  const defaultFileName = `Planilla_Aprendices_Activos_Ficha_${generalInfo.codigoFicha || 'SENA'}.xls`;

  // HTML content with rich Excel styling
  let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:x="urn:schemas-microsoft-com:office:excel" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Planilla_Aprendices_Activos</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:Print>
              <x:ValidPrinterInfo/>
              <x:Orientation>Landscape</x:Orientation>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; }
    table { border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1.5pt solid #000000; padding: 6px 8px; vertical-align: middle; }
    
    .title-banner { 
      font-size: 13pt; 
      font-weight: bold; 
      text-align: center; 
      background-color: #ffffff; 
      color: #000000;
      border: 2pt solid #000000;
    }
    .guia-header { 
      font-size: 12pt; 
      font-weight: bold; 
      text-align: center; 
      background-color: #ffffff; 
      color: #000000;
      border: 1.5pt solid #000000;
      text-transform: uppercase;
    }
    .col-header { 
      font-size: 9.5pt; 
      font-weight: bold; 
      text-align: center; 
      background-color: #ffffff; 
      border: 1.5pt solid #000000;
    }
    .date-row { 
      font-size: 9pt; 
      font-weight: bold; 
      text-align: center; 
      background-color: #ffffff; 
      border: 1.5pt solid #000000;
    }
    .sub-status-header { 
      font-size: 7pt; 
      font-weight: bold; 
      text-align: center; 
      background-color: #ffffff; 
      color: #333333;
      border: 1.5pt solid #000000;
    }
    
    /* Apprentice styling */
    .num-col { text-align: center; font-weight: bold; font-size: 11pt; border: 1.5pt solid #000000; }
    .name-col { font-size: 11pt; font-weight: normal; border: 1.5pt solid #000000; padding-left: 10px; }
    .name-col-all-approved { 
      font-size: 11pt; 
      font-weight: bold; 
      background-color: #70d6ff !important; 
      border: 1.5pt solid #000000; 
      padding-left: 10px; 
    }
    
    /* Status cells */
    .cell-si { 
      background-color: #92d050 !important; 
      font-weight: bold; 
      text-align: center; 
      font-size: 10pt; 
      color: #000000; 
      border: 1.5pt solid #000000;
    }
    .cell-no { 
      background-color: #fce4d6 !important; 
      font-weight: bold; 
      text-align: center; 
      font-size: 10pt; 
      color: #9c0006; 
      border: 1.5pt solid #000000;
    }
    .cell-corregir { 
      background-color: #fff2cc !important; 
      font-weight: bold; 
      text-align: center; 
      font-size: 8.5pt; 
      color: #b25900; 
      border: 1.5pt solid #000000;
    }
    .cell-na { 
      background-color: #f2f2f2; 
      text-align: center; 
      font-size: 9pt; 
      color: #555555; 
      border: 1.5pt solid #000000;
    }
    
    /* Summary columns */
    .summary-header { background-color: #e2efda; font-weight: bold; text-align: center; border: 1.5pt solid #000000; }
    .summary-cell-count { text-align: center; font-weight: bold; font-size: 10pt; border: 1.5pt solid #000000; }
    .summary-cell-text { font-size: 8.5pt; border: 1.5pt solid #000000; }
  </style>
</head>
<body>
  <table>
    <!-- ROW 1: TITLE BANNER & GUIA HEADERS -->
    <tr>
      <th class="title-banner" colspan="2" rowspan="1">
        ${title}
      </th>
`;

  // Guía Headers
  guiaGroups.forEach((g) => {
    html += `
      <th class="guia-header" colspan="${g.evidences.length}">
        ${g.guiaTitle}
      </th>
    `;
  });

  // Summary header in row 1
  html += `
      <th class="summary-header" colspan="4" style="background-color: #d9e1f2;">
        DETALLE DE SEGUIMIENTO INDIVIDUAL (PRESENTADAS VS PENDIENTES)
      </th>
    </tr>
  `;

  // ROW 2: Column Headers (No. de lista, NOMBRE, Evidence names, Details)
  html += `
    <tr>
      <th class="col-header" rowspan="3" style="width: 70px;">No. De<br/>lista</th>
      <th class="col-header" rowspan="3" style="width: 320px;">NOMBRE</th>
  `;

  // Evidence titles
  evidences.forEach((ev) => {
    html += `
      <th class="col-header" style="width: 140px; font-size: 8.5pt;">
        ${ev.nombre || `Evidencia #${ev.numero}`}
      </th>
    `;
  });

  // Detail headers
  html += `
      <th class="col-header" rowspan="3" style="width: 90px; background-color: #c6efce;">TOTAL<br/>PRESENTADAS</th>
      <th class="col-header" rowspan="3" style="width: 90px; background-color: #ffc7ce;">TOTAL<br/>PENDIENTES</th>
      <th class="col-header" rowspan="3" style="width: 250px; background-color: #e2efda;">EVIDENCIAS PRESENTADAS<br/>(APROBADAS)</th>
      <th class="col-header" rowspan="3" style="width: 250px; background-color: #fce4d6;">EVIDENCIAS NO PRESENTADAS<br/>(PENDIENTES)</th>
    </tr>
  `;

  // ROW 3: Date row
  html += `<tr>`;
  evidences.forEach((ev) => {
    const fecha = ev.fechaEntrega ? ev.fechaEntrega.trim() : '-';
    html += `
      <th class="date-row">
        ${fecha}
      </th>
    `;
  });
  html += `</tr>`;

  // ROW 4: "ENTREGÓ/APROBÓ (SI O NO)" row
  html += `<tr>`;
  evidences.forEach(() => {
    html += `
      <th class="sub-status-header">
        ENTREGÓ/APROBÓ<br/>(SI O NO)
      </th>
    `;
  });
  html += `</tr>`;

  // DATA ROWS: Only active apprentices (submitted >= 1 evidence)
  activeDetails.forEach((item) => {
    const { originalIndex, apprentice, allApproved, presentedCount, missingCount, presentedEvidences, missingEvidences } = item;
    const nameClass = allApproved ? 'name-col-all-approved' : 'name-col';

    html += `
      <tr>
        <td class="num-col">${originalIndex}</td>
        <td class="${nameClass}">${apprentice.nombre || ''}</td>
    `;

    // Evidence cells
    evidences.forEach((ev) => {
      const status = item.statuses[ev.id];
      if (status === 'SI') {
        html += `<td class="cell-si">SI</td>`;
      } else if (status === 'CORREGIR') {
        html += `<td class="cell-corregir">CORREGIR</td>`;
      } else if (status === 'NO') {
        html += `<td class="cell-no">NO</td>`;
      } else {
        html += `<td class="cell-na">-</td>`;
      }
    });

    // Detail text columns
    const presentedListStr = presentedEvidences
      .map((e) => `#${e.numero} (${e.nombre})`)
      .join('; ');
    const missingListStr = missingEvidences
      .map((e) => `#${e.numero} (${e.nombre})`)
      .join('; ');

    html += `
        <td class="summary-cell-count" style="background-color: #e2efda;">${presentedCount}</td>
        <td class="summary-cell-count" style="background-color: #fce4d6; color: ${missingCount > 0 ? '#9c0006' : '#000000'};">${missingCount}</td>
        <td class="summary-cell-text">${presentedListStr || 'Ninguna'}</td>
        <td class="summary-cell-text" style="color: ${missingCount > 0 ? '#9c0006' : '#2e7d32'};">${missingListStr || 'Al día (Ninguna pendiente)'}</td>
      </tr>
    `;
  });

  html += `
  </table>
</body>
</html>
  `;

  // Trigger browser download with .xls extension
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || defaultFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * EXPORT 2: Generates a standard native Excel workbook (.xlsx) via SheetJS
 * Contains two sheets:
 * 1. Planilla_Activos: Formatted grid with merges, No. lista, Nombre, evidence statuses, and totals
 * 2. Detalle_Entregas: Detailed breakdown of submitted and pending evidences per apprentice
 */
export function exportActiveApprenticesStandardXlsx(
  apprentices: Apprentice[],
  evidences: EvidenceItem[],
  generalInfo: GeneralInfo,
  fileName?: string
): void {
  const activeDetails = getActiveApprenticesDetails(apprentices, evidences);
  const title = buildPlanillaTitle(generalInfo);
  const defaultFileName = `Planilla_Aprendices_Activos_Ficha_${generalInfo.codigoFicha || 'SENA'}.xlsx`;

  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // SHEET 1: Planilla_Activos
  // -------------------------------------------------------------
  const guiaGroups = groupEvidencesByGuia(evidences);

  // Row 1: Title and Guía names
  const row1: string[] = [title, ''];
  guiaGroups.forEach((g) => {
    row1.push(g.guiaTitle);
    for (let i = 1; i < g.evidences.length; i++) {
      row1.push('');
    }
  });
  row1.push('DETALLE DE SEGUIMIENTO', '', '', '');

  // Row 2: Evidence names
  const row2: string[] = ['No. De lista', 'NOMBRE', ...evidences.map((e) => e.nombre || `Evidencia #${e.numero}`)];
  row2.push('TOTAL PRESENTADAS', 'TOTAL PENDIENTES', 'EVIDENCIAS PRESENTADAS', 'EVIDENCIAS PENDIENTES');

  // Row 3: Dates
  const row3: string[] = ['', '', ...evidences.map((e) => (e.fechaEntrega ? e.fechaEntrega.trim() : '-'))];
  row3.push('', '', '', '');

  // Row 4: ENTREGÓ/APROBÓ (SI O NO)
  const row4: string[] = ['', '', ...evidences.map(() => 'ENTREGÓ/APROBÓ (SI O NO)')];
  row4.push('', '', '', '');

  // Data rows
  const dataRows: (string | number)[][] = activeDetails.map((item) => {
    const evidenceCells = evidences.map((ev) => item.statuses[ev.id] || 'NO');
    const presentedStr = item.presentedEvidences.map((e) => `#${e.numero} (${e.nombre})`).join('; ');
    const missingStr = item.missingEvidences.map((e) => `#${e.numero} (${e.nombre})`).join('; ');

    return [
      item.originalIndex,
      item.apprentice.nombre || '',
      ...evidenceCells,
      item.presentedCount,
      item.missingCount,
      presentedStr || 'Ninguna',
      missingStr || 'Al día'
    ];
  });

  const ws1Data = [row1, row2, row3, row4, ...dataRows];
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

  // Column widths
  const colWidths: { wch: number }[] = [
    { wch: 12 }, // No. de lista
    { wch: 38 }, // Nombre
    ...evidences.map(() => ({ wch: 16 })), // Evidencias
    { wch: 18 }, // Total Presentadas
    { wch: 18 }, // Total Pendientes
    { wch: 45 }, // Detalle Presentadas
    { wch: 45 }  // Detalle Pendientes
  ];
  ws1['!cols'] = colWidths;

  // Merges
  const merges: XLSX.Range[] = [
    // Title merge A1:B1
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    // No de lista merge A2:A4
    { s: { r: 1, c: 0 }, e: { r: 3, c: 0 } },
    // Nombre merge B2:B4
    { s: { r: 1, c: 1 }, e: { r: 3, c: 1 } }
  ];

  // Guía merges in row 1
  let colPointer = 2;
  guiaGroups.forEach((g) => {
    if (g.evidences.length > 1) {
      merges.push({
        s: { r: 0, c: colPointer },
        e: { r: 0, c: colPointer + g.evidences.length - 1 }
      });
    }
    colPointer += g.evidences.length;
  });

  // Summary headers merge in row 1
  merges.push({
    s: { r: 0, c: colPointer },
    e: { r: 0, c: colPointer + 3 }
  });

  ws1['!merges'] = merges;
  XLSX.utils.book_append_sheet(wb, ws1, 'Planilla_Activos');

  // -------------------------------------------------------------
  // SHEET 2: Detalle_Entregas
  // -------------------------------------------------------------
  const sheet2Headers = [
    'No. Lista',
    'Documento',
    'Nombre del Aprendiz',
    'Correo Institucional',
    'Total Entregadas (SI)',
    'Total Pendientes (NO)',
    '% Cumplimiento',
    'Evidencias Presentadas / Aprobadas',
    'Evidencias No Presentadas (Causales Llamado de Atención)'
  ];

  const sheet2Rows = activeDetails.map((item) => [
    item.originalIndex,
    item.apprentice.documento || '',
    item.apprentice.nombre || '',
    item.apprentice.correo || '',
    item.presentedCount,
    item.missingCount,
    `${item.compliancePercentage}%`,
    item.presentedEvidences.map((e) => `[#${e.numero}] ${e.nombre}`).join(' | ') || 'Ninguna',
    item.missingEvidences.map((e) => `[#${e.numero}] ${e.nombre}`).join(' | ') || 'Ninguna (Completo)'
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet([
    ['SERVICIO NACIONAL DE APRENDIZAJE - SENA'],
    ['DETALLE INDIVIDUAL DE EVIDENCIAS PRESENTADAS Y PENDIENTES - APRENDICES ACTIVOS'],
    [`FICHA: ${generalInfo.codigoFicha || ''} | PROGRAMA: ${generalInfo.programa || ''} | COMPETENCIA: ${generalInfo.competencia || ''}`],
    [''],
    sheet2Headers,
    ...sheet2Rows
  ]);

  ws2['!cols'] = [
    { wch: 10 },
    { wch: 16 },
    { wch: 38 },
    { wch: 30 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 50 },
    { wch: 50 }
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Detalle_Entregas');

  // Write and download
  XLSX.writeFile(wb, fileName || defaultFileName);
}

export interface ActiveApprenticesPdfOptions {
  filterMode?: 'ACTIVE_ONLY' | 'ALL';
  fileName?: string;
  includeDetailColumns?: boolean;
}

/**
 * EXPORT 3: Generates a professional Landscape PDF (.pdf) of the Active Apprentices Spreadsheet
 * Matches the official SENA layout:
 * - Institutional SENA header with logo, title banner, program, ficha and date
 * - Grouped headers by Guía de Aprendizaje
 * - Color-coded cells: Green (#92d050) for SI, Pink (#fce4d6) for NO, Yellow (#fff2cc) for CORREGIR
 * - Soft cyan highlight (#70d6ff) for apprentices who have 100% approved
 * - Detailed columns with total presented, total pending, and lists of evidence numbers
 * - Multi-page pagination with repeating headers
 */
export async function exportActiveApprenticesPdf(
  apprentices: Apprentice[],
  evidences: EvidenceItem[],
  generalInfo: GeneralInfo,
  options?: ActiveApprenticesPdfOptions
): Promise<void> {
  const filterMode = options?.filterMode || 'ACTIVE_ONLY';
  const activeDetails =
    filterMode === 'ACTIVE_ONLY'
      ? getActiveApprenticesDetails(apprentices, evidences)
      : getAllApprenticesDetails(apprentices, evidences);

  const guiaGroups = groupEvidencesByGuia(evidences);
  const title = buildPlanillaTitle(generalInfo);
  const defaultFileName = `Planilla_Aprendices_Activos_Ficha_${generalInfo.codigoFicha || 'SENA'}.pdf`;

  // Determine format based on number of evidences to avoid crowding
  const isLargeTable = evidences.length > 9;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: isLargeTable ? 'legal' : 'letter' // legal provides 355.6 mm width if many evidences
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 8;
  const marginRight = 8;
  const marginTop = 8;

  // Institutional SENA Logo
  try {
    const logoDataUrl = await getSenaLogoDataUrl();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', marginLeft, marginTop, 13, 14.5);
    }
  } catch (err) {
    console.warn('Could not load logo for PDF', err);
  }

  // Institutional Header Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 90, 30);
  doc.text('SERVICIO NACIONAL DE APRENDIZAJE SENA', marginLeft + 16, marginTop + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text('DIRECCIÓN DE FORMACIÓN PROFESIONAL • REGISTRO Y SEGUIMIENTO DE EVIDENCIAS', marginLeft + 16, marginTop + 7.2);

  // Metadata block text values
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  const instructorText = `Instructor: ${generalInfo.nombreInstructorAsignado || generalInfo.nombreInstructorLlamado || 'Asignado'}`;

  // Calculate width required by right metadata block to prevent collision
  const rightBlockWidth = doc.getTextWidth(instructorText) + 5;
  const leftBlockMaxW = Math.max(80, (pageWidth - marginRight - rightBlockWidth) - (marginLeft + 16));

  // Line 3: Ficha and Programa (bounded width)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(50, 50, 50);
  const fichaProgText = `FICHA: ${generalInfo.codigoFicha || 'S/N'}  |  PROGRAMA: ${generalInfo.programa || 'No especificado'}`;
  const splitFichaProg = doc.splitTextToSize(fichaProgText, leftBlockMaxW);
  doc.text(splitFichaProg[0] + (splitFichaProg.length > 1 ? '...' : ''), marginLeft + 16, marginTop + 10.8);

  // Line 4: Competencia (bounded width on its own line to completely avoid overlapping)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(70, 70, 70);
  const compText = `COMPETENCIA: ${generalInfo.competencia || 'No especificada'}`;
  const splitComp = doc.splitTextToSize(compText, leftBlockMaxW);
  doc.text(splitComp[0] + (splitComp.length > 1 ? '...' : ''), marginLeft + 16, marginTop + 14.2);

  // Draw right block safely (Instructor only)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 30, 30);
  doc.text(instructorText, pageWidth - marginRight, marginTop + 3.5, { align: 'right' });

  // Thin decorative separator line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(marginLeft, marginTop + 16.5, pageWidth - marginRight, marginTop + 16.5);

  // -------------------------------------------------------------
  // BUILD TABLE STRUCTURE
  // -------------------------------------------------------------
  // Row 1: Title Banner & Guía Groups
  const headRow1: any[] = [
    {
      content: title,
      colSpan: 2,
      styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 6.5 }
    }
  ];

  guiaGroups.forEach((g) => {
    headRow1.push({
      content: g.guiaTitle,
      colSpan: g.evidences.length,
      styles: { halign: 'center', fontStyle: 'bold', fillColor: [225, 238, 225], textColor: [0, 80, 0], fontSize: 6.5 }
    });
  });

  headRow1.push({
    content: 'SEGUIMIENTO',
    colSpan: 2,
    styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [0, 40, 100], fontSize: 6.5 }
  });

  // Row 2: RAPs al que pertenece cada evidencia & Column Headers
  const headRow2: any[] = [
    {
      content: 'No. De\nlista',
      rowSpan: 4,
      styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 6.5, fillColor: [255, 255, 255] }
    },
    {
      content: 'NOMBRE DEL APRENDIZ',
      rowSpan: 4,
      styles: { halign: 'left', valign: 'middle', fontStyle: 'bold', fontSize: 7, fillColor: [255, 255, 255] }
    }
  ];

  evidences.forEach((ev) => {
    const rapLabel = getEvidenceRapLabel(ev, generalInfo);
    headRow2.push({
      content: rapLabel,
      styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 6.5, fillColor: [230, 245, 230], textColor: [10, 85, 20] }
    });
  });

  headRow2.push(
    {
      content: 'TOTAL\nPRES.',
      rowSpan: 4,
      styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 6, fillColor: [198, 239, 206] }
    },
    {
      content: 'TOTAL\nPEND.',
      rowSpan: 4,
      styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 6, fillColor: [255, 199, 206] }
    }
  );

  // Row 3: Nombres completos de las evidencias
  const headRow3: any[] = evidences.map((ev) => ({
    content: ev.nombre || `Evidencia #${ev.numero}`,
    styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 5.5, fillColor: [255, 255, 255], textColor: [0, 0, 0] }
  }));

  // Row 4: Delivery dates
  const headRow4: any[] = evidences.map((ev) => ({
    content: ev.fechaEntrega ? ev.fechaEntrega.trim() : '-',
    styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 5.5, fillColor: [255, 255, 255], textColor: [60, 60, 60] }
  }));

  // Row 5: ENTREGÓ/APROBÓ (SI O NO)
  const headRow5: any[] = evidences.map(() => ({
    content: 'ENTREGÓ / APROBÓ\n(SI O NO)',
    styles: { halign: 'center', valign: 'middle', fontSize: 4.8, fillColor: [255, 255, 255], textColor: [80, 80, 80] }
  }));

  // Body rows (se quitan las 2 columnas de texto mostradas en la imagen)
  const bodyRows: any[][] = activeDetails.map((item) => {
    const evStatusValues = evidences.map((ev) => item.statuses[ev.id] || 'NO');

    return [
      String(item.originalIndex),
      item.apprentice.nombre || '',
      ...evStatusValues,
      String(item.presentedCount),
      String(item.missingCount)
    ];
  });

  // Calculate dynamic column widths that ALWAYS sum precisely to availableW
  const availableW = pageWidth - marginLeft - marginRight;
  const numColW = 8;
  const totalColW = 11;
  const fixedWidths = numColW + (totalColW * 2); // 30 mm
  const remainingForNamesAndEvidences = availableW - fixedWidths;
  
  const evCount = Math.max(1, evidences.length);
  // Allocate balanced space to apprentice name and evidences
  let nameColW = 56;
  if (evCount <= 5) {
    nameColW = 66;
  } else if (evCount <= 8) {
    nameColW = 58;
  } else if (evCount <= 12) {
    nameColW = 50;
  } else {
    nameColW = 44;
  }

  const remainingForEvidences = remainingForNamesAndEvidences - nameColW;
  const evColW = remainingForEvidences / evCount;

  const columnStyles: Record<number, any> = {
    0: { cellWidth: numColW, halign: 'center' },
    1: { cellWidth: nameColW, halign: 'left' }
  };

  evidences.forEach((_, idx) => {
    columnStyles[2 + idx] = { cellWidth: evColW, halign: 'center' };
  });

  const totalPresIdx = 2 + evidences.length;
  const totalPendIdx = totalPresIdx + 1;

  columnStyles[totalPresIdx] = { cellWidth: totalColW, halign: 'center' };
  columnStyles[totalPendIdx] = { cellWidth: totalColW, halign: 'center' };

  autoTable(doc, {
    head: [headRow1, headRow2, headRow3, headRow4, headRow5],
    body: bodyRows,
    startY: marginTop + 18.5,
    margin: { left: marginLeft, right: marginRight, top: marginTop + 18.5, bottom: 10 },
    tableWidth: availableW,
    theme: 'grid',
    styles: {
      fontSize: isLargeTable ? 5.2 : 5.8,
      cellPadding: 0.8,
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      overflow: 'linebreak'
    },
    columnStyles,
    didParseCell: (data) => {
      if (data.section === 'body') {
        data.cell.styles.lineWidth = 0.15;
        data.cell.styles.lineColor = [0, 0, 0];

        // 1. Apprentice Name (col 1): highlight sky blue if 100% approved
        if (data.column.index === 1) {
          const item = activeDetails[data.row.index];
          if (item && item.allApproved) {
            data.cell.styles.fillColor = [112, 214, 255]; // Soft blue/cyan #70d6ff
            data.cell.styles.fontStyle = 'bold';
          }
        }

        // 2. Evidence status cells
        const evStart = 2;
        const evEnd = 2 + evidences.length - 1;
        if (data.column.index >= evStart && data.column.index <= evEnd) {
          const val = String(data.cell.raw).trim().toUpperCase();
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
          if (val === 'SI') {
            data.cell.styles.fillColor = [146, 208, 80]; // Green #92d050
            data.cell.styles.textColor = [0, 0, 0];
          } else if (val === 'NO') {
            data.cell.styles.fillColor = [252, 228, 214]; // Pink #fce4d6
            data.cell.styles.textColor = [156, 0, 6];
          } else if (val === 'CORREGIR') {
            data.cell.styles.fillColor = [255, 242, 204]; // Yellow #fff2cc
            data.cell.styles.textColor = [178, 89, 0];
          } else {
            data.cell.styles.fillColor = [245, 245, 245];
            data.cell.styles.textColor = [120, 120, 120];
          }
        }

        // 3. Totals columns
        if (data.column.index === totalPresIdx) {
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [235, 248, 235];
        }
        if (data.column.index === totalPendIdx) {
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [255, 240, 240];
        }
      }
    },
    didDrawPage: (data) => {
      // Bottom footer on every page
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(110, 110, 110);
      const footerLeft = `Página ${data.pageNumber} • Servicio Nacional de Aprendizaje SENA • Dirección de Formación Profesional • Ficha ${generalInfo.codigoFicha || ''}`;
      doc.text(footerLeft, marginLeft, pageHeight - 5);

      const footerRight = `Planilla de Aprendices Activos • Generado el ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
      doc.text(footerRight, pageWidth - marginRight, pageHeight - 5, { align: 'right' });
    }
  });

  // Table of RAPs and Evidence Linkages
  const finalY = (doc as any).lastAutoTable?.finalY || (marginTop + 100);
  const neededSpaceForRapTable = 25 + (evidences.length * 5.5);
  let currentY = finalY + 8;
  if (pageHeight - finalY < neededSpaceForRapTable) {
    doc.addPage();
    currentY = marginTop + 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 70, 25);
  doc.text('CONVENCIONES: EVIDENCIAS DE APRENDIZAJE Y RESULTADOS DE APRENDIZAJE ASOCIADOS (RAPS)', marginLeft, currentY);

  const rapTableHeaders: any[] = [
    [
      { content: 'N°', styles: { halign: 'center', fontStyle: 'bold', fillColor: [146, 208, 80], textColor: [0, 0, 0], fontSize: 6 } },
      { content: 'GUÍA', styles: { halign: 'center', fontStyle: 'bold', fillColor: [146, 208, 80], textColor: [0, 0, 0], fontSize: 6 } },
      { content: 'CÓDIGO Y NOMBRE DE LA EVIDENCIA', styles: { halign: 'left', fontStyle: 'bold', fillColor: [146, 208, 80], textColor: [0, 0, 0], fontSize: 6 } },
      { content: 'RAP', styles: { halign: 'center', fontStyle: 'bold', fillColor: [146, 208, 80], textColor: [0, 0, 0], fontSize: 6 } },
      { content: 'RESULTADO DE APRENDIZAJE ASOCIADO (DESCRIPCIÓN COMPLETA)', styles: { halign: 'left', fontStyle: 'bold', fillColor: [146, 208, 80], textColor: [0, 0, 0], fontSize: 6 } }
    ]
  ];

  const rapTableRows = evidences.map((ev) => {
    const guiaMatch = (ev.nombre || '').match(/GA\s*(\d+)/i);
    const guiaText = guiaMatch ? `GUÍA ${guiaMatch[1]}` : 'GUÍA';
    const rapLabel = getEvidenceRapLabel(ev, generalInfo);
    const rapDesc = getEvidenceRapDescription(ev, generalInfo);
    return [
      `#${ev.numero < 10 ? '0' + ev.numero : ev.numero}`,
      guiaText,
      ev.nombre || `Evidencia #${ev.numero}`,
      rapLabel,
      rapDesc
    ];
  });

  const rapCol0 = 9;   // N°
  const rapCol1 = 15;  // GUÍA
  const rapCol2 = 75;  // CÓDIGO Y NOMBRE DE LA EVIDENCIA
  const rapCol3 = 14;  // RAP
  const rapCol4 = availableW - (rapCol0 + rapCol1 + rapCol2 + rapCol3); // RESULTADO DE APRENDIZAJE ASOCIADO (takes remaining width)

  autoTable(doc, {
    head: rapTableHeaders,
    body: rapTableRows,
    startY: currentY + 2.5,
    margin: { left: marginLeft, right: marginRight, top: marginTop + 5, bottom: 10 },
    tableWidth: availableW,
    theme: 'grid',
    styles: {
      fontSize: 5.5,
      cellPadding: 0.8,
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: rapCol0, halign: 'center' },
      1: { cellWidth: rapCol1, halign: 'center' },
      2: { cellWidth: rapCol2, halign: 'left' },
      3: { cellWidth: rapCol3, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: rapCol4, halign: 'left' }
    },
    didDrawPage: (data) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(110, 110, 110);
      const footerLeft = `Página ${data.pageNumber} • Servicio Nacional de Aprendizaje SENA • Dirección de Formación Profesional • Ficha ${generalInfo.codigoFicha || ''}`;
      doc.text(footerLeft, marginLeft, pageHeight - 5);

      const footerRight = `Planilla de Aprendices Activos • Generado el ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
      doc.text(footerRight, pageWidth - marginRight, pageHeight - 5, { align: 'right' });
    }
  });

  // Trigger download
  doc.save(options?.fileName || defaultFileName);
}
