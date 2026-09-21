import * as XLSX from 'xlsx';
import { Apprentice, EvidenceItem, EvidenceStatus } from '../types';

export interface ColumnMapping {
  colIndex: number;
  headerName: string;
  type: 'documento' | 'nombre' | 'correo' | 'telefono' | 'evidence' | 'ignore';
  evidenceId?: string;
  evidenceNumero?: number;
  evidenceNombre?: string;
}

export interface ParsedExcelApprentice {
  id: string;
  nombre: string;
  documento?: string;
  correo: string;
  telefono?: string;
  evidenciasStatus: Record<string, EvidenceStatus>;
  matchedWithExistingId?: string;
  totalSi: number;
  totalNo: number;
  totalCorregir: number;
  totalNa: number;
}

export interface ParsedExcelResult {
  fileName: string;
  sheetName: string;
  totalRows: number;
  apprentices: ParsedExcelApprentice[];
  columnMappings: ColumnMapping[];
  detectedEvidenceColumns: {
    headerName: string;
    evidenceId: string;
    evidenceNumero: number;
    evidenceNombre: string;
    isNew?: boolean;
  }[];
  allEvidences: EvidenceItem[];
  unmappedEvidenceColumns: string[];
  summary: {
    totalApprentices: number;
    matchedWithExisting: number;
    newApprentices: number;
    evidencesUpdated: number;
    newEvidencesCreated: number;
  };
}

/**
 * Normalizes text for comparison (removes accents, extra spaces, lowercase)
 */
export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extracts a numeric index for an evidence from header text (e.g., "#9 - ...", "Evidencia 9", "EV09", "9")
 * Supports from 1 up to 50 evidences (well covering the requested 30 evidences).
 */
export function extractEvidenceNumberFromHeader(headerStr: string): number | null {
  const clean = headerStr.trim();

  // 1. Exact number: "9", "12", "30"
  if (/^\d{1,2}$/.test(clean)) {
    const n = parseInt(clean, 10);
    if (n >= 1 && n <= 50) return n;
  }

  // 2. Leading number with separator or hash: "#9 - ...", "9 - ...", "9. ...", "9) ...", "#9"
  const leadMatch = clean.match(/^(?:#|\b)?\s*(\d{1,2})\s*[-.:\)]/i) || clean.match(/^#\s*(\d{1,2})\b/i);
  if (leadMatch) {
    const n = parseInt(leadMatch[1], 10);
    if (n >= 1 && n <= 50) return n;
  }

  // 3. Keyword followed by number: "Evidencia 9", "Evid 9", "EV 9", "EV09", "E9", "Actividad 9", "AA9", "Evidencia #9"
  const kwMatch = clean.match(/(?:evidencia|evid|ev|actividad|aa|e|rap)\s*#?\s*0*(\d{1,2})\b/i);
  if (kwMatch) {
    const n = parseInt(kwMatch[1], 10);
    if (n >= 1 && n <= 50) return n;
  }

  // 4. Embedded EV pattern, e.g. "AA2-EV09", "GA1-EV9", "EV09"
  const embMatch = clean.match(/ev0*(\d{1,2})\b/i);
  if (embMatch) {
    const n = parseInt(embMatch[1], 10);
    if (n >= 1 && n <= 50) return n;
  }

  // 5. Hash symbol followed by number anywhere: "Taller #9"
  const hashMatch = clean.match(/#\s*0*(\d{1,2})\b/);
  if (hashMatch) {
    const n = parseInt(hashMatch[1], 10);
    if (n >= 1 && n <= 50) return n;
  }

  return null;
}

/**
 * Cleans the column header to produce a readable SENA evidence description
 */
export function cleanEvidenceNameFromHeader(headerStr: string, evNum: number): string {
  let clean = headerStr.trim();

  // Remove leading '#9 - ' or '9 - ' or '9. ' or '9) '
  clean = clean.replace(/^(?:#|\b)?\s*0*\d{1,2}\s*[-.:\)]\s*/, '').trim();

  // Remove leading 'Evidencia 9: ' or 'Evidencia 9 - ' or 'Evidencia #9 - '
  clean = clean.replace(/^(?:evidencia|evid|ev)\s*#?\s*0*\d{1,2}\s*[-.:\)]?\s*/i, '').trim();

  if (!clean || clean.length < 3) {
    return `Evidencia GA2-240202501-AA2-EV0${evNum}. Actividad de aprendizaje`;
  }
  return clean;
}

/**
 * Checks if a sample cell contains a recognizable qualification status
 */
export function isCellEvidenceStatus(val: any): boolean {
  if (val === undefined || val === null || val === '') return false;
  const str = String(val).trim().toUpperCase();
  const norm = normalizeText(str);
  return (
    str === 'SI' ||
    str === 'SÍ' ||
    str === 'S' ||
    str === 'A' ||
    str === 'NO' ||
    str === 'D' ||
    str === 'N' ||
    str === 'CORREGIR' ||
    str === 'C' ||
    str === 'POR CORREGIR' ||
    str === '-' ||
    str === 'NA' ||
    str === 'N/A' ||
    str === '1' ||
    str === '0' ||
    str === 'APROBADO' ||
    str === 'APROBO' ||
    str === 'NO APROBADO' ||
    str === '✓' ||
    str === '✔' ||
    norm.includes('aprob') ||
    norm.includes('correg') ||
    norm.includes('entreg')
  );
}

/**
 * Parses cell value to evidence status: 'SI' | 'NO' | 'CORREGIR' | '-'
 */
export function parseEvidenceStatusValue(val: any): EvidenceStatus {
  if (val === undefined || val === null) return 'NO';
  const str = String(val).trim().toUpperCase();
  if (!str) return 'NO';

  // Normalized string
  const norm = normalizeText(str);

  // 'CORREGIR' indicators (Must be checked before general strings)
  if (
    str === 'CORREGIR' ||
    str === 'CORRIGE' ||
    str === 'CORRECCION' ||
    str === 'CORRECCIÓN' ||
    str === 'POR CORREGIR' ||
    str === 'DEBE CORREGIR' ||
    str === 'PENDIENTE POR CORREGIR' ||
    str === 'AJUSTAR' ||
    str === 'REHACER' ||
    str === 'C' ||
    norm.includes('correg') ||
    norm.includes('ajust')
  ) {
    return 'CORREGIR';
  }

  // 'SI' indicators
  if (
    str === 'SI' ||
    str === 'SÍ' ||
    str === 'S' ||
    str === 'A' || // SENA calification 'A' = Aprobado
    str === 'APROBADO' ||
    str === 'APROBADA' ||
    str === 'APROBO' ||
    str === 'APROBÓ' ||
    str === 'ENTREGADO' ||
    str === 'ENTREGADA' ||
    str === 'ENTREGO' ||
    str === 'ENTREGÓ' ||
    str === 'CUMPLIO' ||
    str === 'CUMPLIÓ' ||
    str === 'CUMPLE' ||
    str === '1' ||
    str === 'TRUE' ||
    str === 'V' ||
    str === 'VERDADERO' ||
    str === 'OK' ||
    str === 'CORRECTO' ||
    str === 'PRESENTO' ||
    str === 'PRESENTÓ' ||
    str === '✓' ||
    str === '✔' ||
    norm.includes('aprob') ||
    norm.includes('entreg') ||
    norm.includes('cumpli')
  ) {
    return 'SI';
  }

  // '-' indicators (No aplica / Exonerado)
  if (
    str === '-' ||
    str === 'NA' ||
    str === 'N/A' ||
    str === 'NO APLICA' ||
    str === 'EXONERADO' ||
    str === 'EXONERADA' ||
    norm.includes('no aplica') ||
    norm.includes('exoner')
  ) {
    return '-';
  }

  // Everything else defaults to 'NO' (Incumplida / Deficiente / No Aprobado)
  return 'NO';
}


/**
 * Parses an Excel file and matches both apprentices and evidence statuses
 */
export async function parseExcelMatrix(
  file: File,
  currentEvidences: EvidenceItem[],
  existingApprentices: Apprentice[] = []
): Promise<ParsedExcelResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  
  // Prioritize matrix / calificaciones sheet if multiple sheets exist
  const sheetName =
    workbook.SheetNames.find((name) => {
      const norm = normalizeText(name);
      return (
        norm.includes('matriz') ||
        norm.includes('califica') ||
        norm.includes('aprendiz') ||
        norm.includes('evidencia') ||
        norm.includes('seguimiento') ||
        norm.includes('datos')
      );
    }) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to raw array of rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('El archivo Excel está vacío o no contiene filas legibles.');
  }

  // Find header row (inspect first 10 rows)
  let headerRowIndex = 0;
  let maxMatchedCols = 0;

  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    row.forEach((cell) => {
      const norm = normalizeText(String(cell));
      if (
        norm.includes('nombre') ||
        norm.includes('aprendiz') ||
        norm.includes('documento') ||
        norm.includes('cedula') ||
        norm.includes('identificacion') ||
        norm.includes('correo') ||
        norm.includes('email') ||
        norm.includes('evidencia') ||
        norm.startsWith('ev') ||
        norm.startsWith('aa') ||
        norm.startsWith('rap')
      ) {
        score++;
      }
    });

    if (score > maxMatchedCols) {
      maxMatchedCols = score;
      headerRowIndex = r;
    }
  }

  const headerRow = rawRows[headerRowIndex] || [];
  const columnMappings: ColumnMapping[] = [];
  const detectedEvidenceColumns: ParsedExcelResult['detectedEvidenceColumns'] = [];
  const unmappedEvidenceColumns: string[] = [];

  // Working copy of evidences so newly discovered evidences (e.g. #9 up to 30) can be added dynamically
  const workingEvidences: EvidenceItem[] = currentEvidences.map((e) => ({ ...e }));

  // Sample data rows for detecting columns with qualification status cells
  const sampleDataRows = rawRows.slice(headerRowIndex + 1, headerRowIndex + 15);

  // Match columns
  headerRow.forEach((colVal, colIndex) => {
    const headerStr = String(colVal || '').trim();
    const norm = normalizeText(headerStr);

    if (!headerStr) {
      columnMappings.push({ colIndex, headerName: `Columna ${colIndex + 1}`, type: 'ignore' });
      return;
    }

    // 1. Check Document
    if (
      norm.includes('documento') ||
      norm.includes('cedula') ||
      norm.includes('identificacion') ||
      norm === 'doc' ||
      norm === 'cc' ||
      norm === 'ti' ||
      norm === 'id' ||
      norm === 'dni' ||
      norm.includes('num_doc')
    ) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'documento' });
      return;
    }

    // 2. Check Name
    if (
      norm.includes('nombre') ||
      norm.includes('aprendiz') ||
      norm.includes('estudiante') ||
      norm.includes('alumno') ||
      norm.includes('nombres y apellidos') ||
      norm === 'nombre' ||
      norm === 'apellidos y nombres'
    ) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'nombre' });
      return;
    }

    // 3. Check Email
    if (norm.includes('correo') || norm.includes('email') || norm.includes('mail') || norm.includes('misena')) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'correo' });
      return;
    }

    // 4. Check Phone
    if (norm.includes('telefono') || norm.includes('celular') || norm.includes('tel') || norm.includes('movil') || norm.includes('phone')) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'telefono' });
      return;
    }

    // 5. Check Non-Evidence Metadata / Totals / List index
    if (
      norm.includes('total') ||
      norm.includes('presentada') ||
      norm.includes('pendiente') ||
      norm.includes('aprobada') ||
      norm.includes('porcentaje') ||
      norm === '%' ||
      norm.includes('estado general') ||
      norm.includes('resultado general') ||
      norm.includes('juicio') ||
      norm.includes('firma') ||
      norm.includes('observacion') ||
      norm.includes('observaciones') ||
      norm.includes('no. de lista') ||
      norm.includes('numero de lista') ||
      norm.includes('n°') ||
      norm === 'no.' ||
      (colIndex === 0 && (norm === 'no' || norm === '#'))
    ) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'ignore' });
      return;
    }

    // 6. Evidence Column Detection & Dynamic Creation (Recognizes up to 30+ Evidences)
    let matchedEvidence: EvidenceItem | undefined;
    let isNewEvidence = false;

    // A. Check by numeric indicator in header (e.g. "#9 - ...", "Evidencia 9", "EV09", "9", "AA1-EV09")
    const extractedNum = extractEvidenceNumberFromHeader(headerStr);
    if (extractedNum !== null) {
      matchedEvidence = workingEvidences.find((e) => e.numero === extractedNum);
      if (!matchedEvidence) {
        // Create new evidence for this number (e.g. 9, 10, ... up to 30)
        const cleanName = cleanEvidenceNameFromHeader(headerStr, extractedNum);
        const newEv: EvidenceItem = {
          id: `ev-${extractedNum}`,
          numero: extractedNum,
          nombre: cleanName,
          rap: extractedNum <= 15 ? 'RAP 1' : 'RAP 2',
          defaultEstado: 'NO',
          observacion: ''
        };
        workingEvidences.push(newEv);
        matchedEvidence = newEv;
        isNewEvidence = true;
      }
    }

    // B. Check by evidence name or code against existing evidences
    if (!matchedEvidence) {
      matchedEvidence = workingEvidences.find((e) => {
        const evNorm = normalizeText(e.nombre);
        return (evNorm.length > 5 && (norm.includes(evNorm) || evNorm.includes(norm)));
      });
    }

    // C. Check by keywords or if data cells predominantly contain qualification statuses
    if (!matchedEvidence) {
      const hasEvidenceKeywords =
        norm.includes('evidencia') ||
        norm.startsWith('ev') ||
        norm.startsWith('aa') ||
        norm.startsWith('rap') ||
        norm.includes('taller') ||
        norm.includes('informe') ||
        norm.includes('guia') ||
        norm.includes('foro') ||
        norm.includes('cuestionario') ||
        norm.includes('evaluacion') ||
        norm.includes('actividad') ||
        norm.includes('resultado');

      let statusCellCount = 0;
      let nonBlankCellCount = 0;
      sampleDataRows.forEach((row) => {
        const val = row?.[colIndex];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          nonBlankCellCount++;
          if (isCellEvidenceStatus(val)) {
            statusCellCount++;
          }
        }
      });

      const isStatusCol = nonBlankCellCount > 0 && statusCellCount / nonBlankCellCount >= 0.5;

      if (hasEvidenceKeywords || isStatusCol) {
        // Allocate next available evidence number (up to 30+)
        const usedNums = new Set(workingEvidences.map((e) => e.numero));
        let nextNum = 1;
        while (usedNums.has(nextNum)) {
          nextNum++;
        }
        const cleanName = cleanEvidenceNameFromHeader(headerStr, nextNum);
        const newEv: EvidenceItem = {
          id: `ev-${nextNum}`,
          numero: nextNum,
          nombre: cleanName,
          rap: nextNum <= 15 ? 'RAP 1' : 'RAP 2',
          defaultEstado: 'NO',
          observacion: ''
        };
        workingEvidences.push(newEv);
        matchedEvidence = newEv;
        isNewEvidence = true;
      }
    }

    if (matchedEvidence) {
      columnMappings.push({
        colIndex,
        headerName: headerStr,
        type: 'evidence',
        evidenceId: matchedEvidence.id,
        evidenceNumero: matchedEvidence.numero,
        evidenceNombre: matchedEvidence.nombre
      });
      detectedEvidenceColumns.push({
        headerName: headerStr,
        evidenceId: matchedEvidence.id,
        evidenceNumero: matchedEvidence.numero,
        evidenceNombre: matchedEvidence.nombre,
        isNew: isNewEvidence
      });
      return;
    }

    // Otherwise, mark as unmapped / ignored
    unmappedEvidenceColumns.push(headerStr);
    columnMappings.push({ colIndex, headerName: headerStr, type: 'ignore' });
  });

  // If no name column detected, pick first non-empty column
  let nameCol = columnMappings.find((c) => c.type === 'nombre');
  if (!nameCol && headerRow.length > 0) {
    const firstCol = columnMappings[0];
    if (firstCol) firstCol.type = 'nombre';
  }

  // Parse data rows
  const parsedApprentices: ParsedExcelApprentice[] = [];
  const existingDocsMap = new Map<string, Apprentice>();
  const existingNamesMap = new Map<string, Apprentice>();

  existingApprentices.forEach((app) => {
    if (app.documento) {
      const cleanDoc = app.documento.replace(/\D/g, '');
      if (cleanDoc) existingDocsMap.set(cleanDoc, app);
    }
    if (app.nombre) {
      existingNamesMap.set(normalizeText(app.nombre), app);
    }
  });

  let matchedWithExistingCount = 0;
  let newApprenticesCount = 0;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.every((c) => c === '' || c === undefined || c === null)) {
      continue;
    }

    let nombre = '';
    let documento = '';
    let correo = '';
    let telefono = '';
    const evidenciasStatus: Record<string, EvidenceStatus> = {};

    let totalSi = 0;
    let totalNo = 0;
    let totalCorregir = 0;
    let totalNa = 0;

    columnMappings.forEach((mapping) => {
      const cellVal = row[mapping.colIndex];
      const strVal = String(cellVal || '').trim();

      if (mapping.type === 'nombre') {
        nombre = strVal;
      } else if (mapping.type === 'documento') {
        documento = strVal.replace(/[^\d]/g, '');
      } else if (mapping.type === 'correo') {
        correo = strVal;
      } else if (mapping.type === 'telefono') {
        telefono = strVal;
      } else if (mapping.type === 'evidence' && mapping.evidenceId) {
        const status = parseEvidenceStatusValue(cellVal);
        evidenciasStatus[mapping.evidenceId] = status;
        if (status === 'SI') totalSi++;
        else if (status === 'NO') totalNo++;
        else if (status === 'CORREGIR') totalCorregir++;
        else totalNa++;
      }
    });

    // Fallback: If no dedicated name column was identified, look across cells
    if (!nombre && row.length > 0) {
      const textCell = row.find((c) => typeof c === 'string' && c.trim().length > 3 && !/^\d+$/.test(c.trim()));
      if (textCell) nombre = String(textCell).trim();
    }

    // Skip header-like repeats
    if (!nombre || normalizeText(nombre) === 'nombre' || normalizeText(nombre) === 'nombre del aprendiz') {
      continue;
    }

    // Match with existing apprentice
    const cleanDoc = documento.replace(/\D/g, '');
    let matchedExisting: Apprentice | undefined = undefined;
    if (cleanDoc && existingDocsMap.has(cleanDoc)) {
      matchedExisting = existingDocsMap.get(cleanDoc);
    } else if (nombre && existingNamesMap.has(normalizeText(nombre))) {
      matchedExisting = existingNamesMap.get(normalizeText(nombre));
    }

    if (matchedExisting) {
      matchedWithExistingCount++;
    } else {
      newApprenticesCount++;
    }

    // Generate clean email if empty
    const cleanEmail =
      correo ||
      (matchedExisting?.correo
        ? matchedExisting.correo
        : `${normalizeText(nombre).replace(/\s+/g, '.')}@misena.edu.co`);

    parsedApprentices.push({
      id: matchedExisting ? matchedExisting.id : `app-excel-${Date.now()}-${r}`,
      nombre,
      documento: documento || matchedExisting?.documento || '',
      correo: cleanEmail,
      telefono: telefono || matchedExisting?.telefono || '',
      evidenciasStatus,
      matchedWithExistingId: matchedExisting?.id,
      totalSi,
      totalNo,
      totalCorregir,
      totalNa
    });
  }

  // Sort all evidences by numero ascending (so #1, #2, ... #9, ... #30 are strictly ordered)
  const finalAllEvidences = [...workingEvidences].sort((a, b) => a.numero - b.numero);
  const newEvidencesCount = Math.max(0, finalAllEvidences.length - currentEvidences.length);

  return {
    fileName: file.name,
    sheetName,
    totalRows: rawRows.length,
    apprentices: parsedApprentices,
    columnMappings,
    detectedEvidenceColumns,
    allEvidences: finalAllEvidences,
    unmappedEvidenceColumns,
    summary: {
      totalApprentices: parsedApprentices.length,
      matchedWithExisting: matchedWithExistingCount,
      newApprentices: newApprenticesCount,
      evidencesUpdated: detectedEvidenceColumns.length,
      newEvidencesCreated: newEvidencesCount
    }
  };
}

/**
 * Exports the complete apprentice matrix with current evidence states to an Excel file (.xlsx)
 * Includes both the dynamic data matrix sheet and an instruction guide sheet.
 */
export function exportEvidenceMatrixExcel(
  apprentices: Apprentice[],
  evidences: EvidenceItem[],
  fileName = 'Matriz_Evidencias_SENA.xlsx'
) {
  // 1. Build Data Sheet (Matriz_Calificaciones)
  const headers = [
    'Documento',
    'Nombre del Aprendiz',
    'Correo Electrónico',
    'Teléfono',
    ...evidences.map((ev) => `#${ev.numero} - ${ev.nombre}`)
  ];

  const rows = apprentices.map((app) => {
    const evidenceCells = evidences.map((ev) => {
      const status = (app.evidenciasStatus && app.evidenciasStatus[ev.id]) || ev.defaultEstado || 'NO';
      return status;
    });

    return [
      app.documento || '',
      app.nombre || '',
      app.correo || '',
      app.telefono || '',
      ...evidenceCells
    ];
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 16 }, // Documento
    { wch: 38 }, // Nombre del Aprendiz
    { wch: 32 }, // Correo Electrónico
    { wch: 16 }, // Teléfono
    ...evidences.map(() => ({ wch: 18 })) // Evidences
  ];
  ws['!cols'] = colWidths;

  // 2. Build Guide & Instructions Sheet (Guia_Instrucciones)
  const guideData = [
    ['SERVICIO NACIONAL DE APRENDIZAJE - SENA'],
    ['GUÍA DE EDICIÓN Y ACTUALIZACIÓN DE LA MATRIZ DE EVIDENCIAS EN EXCEL'],
    [''],
    ['Instrucción General:', 'Puede editar los valores de las calificaciones de cada aprendiz en la hoja "Matriz_Calificaciones".'],
    ['Actualización Automática:', 'Al terminar, guarde el archivo y vuelva a cargarlo en el botón "Cargar Excel" de la aplicación.'],
    [''],
    ['VALORES ACEPTADOS EN LAS COLUMNAS DE EVIDENCIA:', 'SIGNIFICADO EN EL SISTEMA SENA:'],
    ['SI / A / APROBADO / PRESENTÓ / ENTREGÓ', 'Evidencia Aprobada (No genera llamado de atención para esta evidencia)'],
    ['NO / D / NO APROBADO / PENDIENTE / FALTA', 'Evidencia No Aprobada (Genera llamado de atención oficial)'],
    ['CORREGIR / C / POR CORREGIR / AJUSTAR', 'Evidencia Por Corregir (Indicador de ajuste pendiente)'],
    ['- / NA / NO APLICA / EXONERADO', 'No Aplica / Exonerado (No se computa como incumplimiento)'],
    [''],
    ['AGREGAR O MODIFICAR APRENDICES:', ''],
    ['- Para añadir un nuevo aprendiz:', 'Agregue una nueva fila al final con Documento, Nombre y sus calificaciones.'],
    ['- Para corregir un nombre o cédula:', 'Edite la celda correspondiente. El sistema actualizará el aprendiz en la aplicación.']
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 45 }, { wch: 65 }];

  // 3. Create Workbook and Append Sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Matriz_Calificaciones');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Guia_Instrucciones');

  XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
