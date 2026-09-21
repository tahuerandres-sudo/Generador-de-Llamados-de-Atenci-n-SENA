import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { Apprentice, EvidenceItem, GeneralInfo, SignatureConfig } from '../types';
import { getSenaLogoDataUrl } from './senaLogo';

/**
 * Draws the complete 2-page vertical (Portrait) SENA Llamado de Atención document for a single apprentice
 */
export async function buildApprenticePdf(
  doc: jsPDF,
  apprentice: Apprentice,
  generalInfo: GeneralInfo,
  evidences: EvidenceItem[],
  signatureConfig: SignatureConfig,
  logoDataUrl: string,
  startPageNumber = 1
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth(); // ~215.9 mm for portrait letter
  const pageHeight = doc.internal.pageSize.getHeight(); // ~279.4 mm for portrait letter
  const marginLeft = 14;
  const marginRight = 14;
  const marginTop = 12;
  const contentWidth = pageWidth - marginLeft - marginRight; // ~187.9 mm

  const page1RowsCount = 6; // up to 6 evidences on page 1

  // -------------------------------------------------------------
  // PAGE 1 (Portrait)
  // -------------------------------------------------------------
  if (startPageNumber > 1) {
    doc.addPage('letter', 'portrait');
  }

  drawPage1(doc, {
    marginLeft,
    marginTop,
    contentWidth,
    generalInfo,
    apprentice,
    evidences: evidences.slice(0, page1RowsCount),
    logoDataUrl
  });

  // -------------------------------------------------------------
  // PAGE 2 (Portrait)
  // -------------------------------------------------------------
  doc.addPage('letter', 'portrait');

  drawPage2(doc, {
    marginLeft,
    marginTop: 16,
    contentWidth,
    pageHeight,
    generalInfo,
    apprentice,
    allEvidences: evidences,
    page1RowsCount,
    signatureConfig
  });
}

// -------------------------------------------------------------
// HELPER: DRAW PAGE 1 (Portrait)
// -------------------------------------------------------------
function drawPage1(
  doc: jsPDF,
  opts: {
    marginLeft: number;
    marginTop: number;
    contentWidth: number;
    generalInfo: GeneralInfo;
    apprentice: Apprentice;
    evidences: EvidenceItem[];
    logoDataUrl: string;
  }
) {
  const { marginLeft, marginTop, contentWidth, generalInfo, apprentice, evidences, logoDataUrl } = opts;
  const left = marginLeft;
  let currY = marginTop;

  // 1. SENA Official Logo (centered, sharp, proportional)
  if (logoDataUrl) {
    try {
      const logoWidth = 18;
      const logoHeight = 19.7;
      const logoX = left + (contentWidth - logoWidth) / 2;
      // Auto detect or default format
      const isPng = logoDataUrl.startsWith('data:image/png') || !logoDataUrl.startsWith('data:image/jpeg');
      doc.addImage(logoDataUrl, isPng ? 'PNG' : 'JPEG', logoX, currY, logoWidth, logoHeight);
      currY += logoHeight + 2;
    } catch {
      currY += 14;
    }
  } else {
    currY += 14;
  }

  // 2. Title: "LLAMADO DE ATENCION"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('LLAMADO DE ATENCION', left + contentWidth / 2, currY + 1, { align: 'center' });
  currY += 5;

  // 3. Header Information Box (Table)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);

  // Row 1: Nombre del Programa | Codigo de la Ficha
  const colProgLabel = 36;
  const colProgVal = 82;
  const colFichaLabel = 32;
  const colFichaVal = contentWidth - colProgLabel - colProgVal - colFichaLabel;
  const r1H = 6.5;

  doc.rect(left, currY, contentWidth, r1H);
  doc.line(left + colProgLabel, currY, left + colProgLabel, currY + r1H);
  doc.line(left + colProgLabel + colProgVal, currY, left + colProgLabel + colProgVal, currY + r1H);
  doc.line(left + colProgLabel + colProgVal + colFichaLabel, currY, left + colProgLabel + colProgVal + colFichaLabel, currY + r1H);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Nombre del Programa:', left + 1.5, currY + 4.4);
  doc.setFont('helvetica', 'normal');
  doc.text(generalInfo.programa || '', left + colProgLabel + 2, currY + 4.4, { maxWidth: colProgVal - 4 });

  doc.setFont('helvetica', 'bold');
  doc.text('Codigo de la Ficha:', left + colProgLabel + colProgVal + 1.5, currY + 4.4);
  doc.setFont('helvetica', 'bold');
  doc.text(generalInfo.codigoFicha || '', left + colProgLabel + colProgVal + colFichaLabel + 2, currY + 4.4);
  currY += r1H;

  // Row 2: Nombre del Aprendiz | Correo
  const colAppLabel = 36;
  const colAppVal = 82;
  const colAppEmail = contentWidth - colAppLabel - colAppVal;
  const r2H = 6.5;

  doc.rect(left, currY, contentWidth, r2H);
  doc.line(left + colAppLabel, currY, left + colAppLabel, currY + r2H);
  doc.line(left + colAppLabel + colAppVal, currY, left + colAppLabel + colAppVal, currY + r2H);

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre del Aprendiz:', left + 1.5, currY + 4.4);
  doc.setFont('helvetica', 'normal');
  const apprenticeDisplay = apprentice.documento
    ? `${apprentice.nombre} (C.C. ${apprentice.documento})`
    : apprentice.nombre;
  doc.text(apprenticeDisplay, left + colAppLabel + 2, currY + 4.4, { maxWidth: colAppVal - 4 });
  doc.text(apprentice.correo || '', left + colAppLabel + colAppVal + 2, currY + 4.4, { maxWidth: colAppEmail - 4 });
  currY += r2H;

  // Row 3: Instructor asignado a la ficha académica
  const colInstLabel = 58;
  const r3H = 6.5;
  doc.rect(left, currY, contentWidth, r3H);
  doc.line(left + colInstLabel, currY, left + colInstLabel, currY + r3H);

  doc.setFont('helvetica', 'bold');
  doc.text('Instructor asignado a la ficha académica:', left + 1.5, currY + 4.4);
  doc.setFont('helvetica', 'normal');
  doc.text(generalInfo.nombreInstructorAsignado || '', left + colInstLabel + 2, currY + 4.4);
  currY += r3H;

  // Row 4: Motivo
  const colMotivoLabel = 26;
  const r4H = 7.5;
  doc.rect(left, currY, contentWidth, r4H);
  doc.line(left + colMotivoLabel, currY, left + colMotivoLabel, currY + r4H);

  doc.setFont('helvetica', 'bold');
  doc.text('Motivo', left + 1.5, currY + 4.8);
  doc.setFont('helvetica', 'normal');
  doc.text(generalInfo.motivo || '', left + colMotivoLabel + 2, currY + 4.8, {
    maxWidth: contentWidth - colMotivoLabel - 4
  });
  currY += r4H;

  // Row 5: Instructor que hace el llamado de atencion
  const colInst2Label = 62;
  const r5H = 6.5;
  doc.rect(left, currY, contentWidth, r5H);
  doc.line(left + colInst2Label, currY, left + colInst2Label, currY + r5H);

  doc.setFont('helvetica', 'bold');
  doc.text('Instructor que hace el llamado de atencion:', left + 1.5, currY + 4.4);
  doc.setFont('helvetica', 'normal');
  doc.text(generalInfo.nombreInstructorLlamado || '', left + colInst2Label + 2, currY + 4.4);
  currY += r5H;

  // Row 6: Competencia
  const colCompLabel = 26;
  const r6H = 13;
  doc.rect(left, currY, contentWidth, r6H);
  doc.line(left + colCompLabel, currY, left + colCompLabel, currY + r6H);

  doc.setFont('helvetica', 'bold');
  doc.text('Competencia:', left + 1.5, currY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(generalInfo.competencia || '', left + colCompLabel + 2, currY + 4.2, {
    maxWidth: contentWidth - colCompLabel - 4,
    lineHeightFactor: 1.25
  });
  currY += r6H;

  // Row 7: Resultados de Aprendizaje
  const colRaLabel = 26;
  const r7H = 34;
  doc.rect(left, currY, contentWidth, r7H);
  doc.line(left + colRaLabel, currY, left + colRaLabel, currY + r7H);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Resultados de', left + 1.5, currY + 4.5);
  doc.text('Aprendizaje:', left + 1.5, currY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);

  const raListText = Array.isArray(generalInfo.resultadosAprendizaje)
    ? generalInfo.resultadosAprendizaje.join('\n\n')
    : (generalInfo.resultadosAprendizaje || '');

  doc.text(raListText, left + colRaLabel + 2, currY + 4.2, {
    maxWidth: contentWidth - colRaLabel - 4,
    lineHeightFactor: 1.25
  });
  currY += r7H;

  // Row 8: Observaciones que hace el aprendiz
  const colObsLabel = 54;
  const r8H = 9;
  doc.rect(left, currY, contentWidth, r8H);
  doc.line(left + colObsLabel, currY, left + colObsLabel, currY + r8H);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Observaciones que hace el aprendiz:', left + 1.5, currY + 5.5);
  doc.setFont('helvetica', 'normal');
  const obsText = apprentice.observacionAprendizEspecifica || generalInfo.observacionesAprendiz || '';
  if (obsText) {
    doc.text(obsText, left + colObsLabel + 2, currY + 5.5, {
      maxWidth: contentWidth - colObsLabel - 4
    });
  }
  currY += r8H + 3.5;

  // 4. Evidence Table Page 1 (Rows 1 to 6)
  const colN = 8;
  const colEv = 96;
  const colSi = 13;
  const colNo = 13;
  const colObs = contentWidth - colN - colEv - colSi - colNo; // ~57.9 mm

  const page1Evidences = evidences.slice(0, 6);

  if (page1Evidences.length > 0) {
    drawEvidenceTableHeader(doc, left, currY, contentWidth, colN, colEv, colSi, colNo, colObs);
    currY += 8.5;

    for (let i = 0; i < page1Evidences.length; i++) {
      const ev = page1Evidences[i];
      const rowH = 7.5;
      doc.rect(left, currY, contentWidth, rowH);
      doc.line(left + colN, currY, left + colN, currY + rowH);
      doc.line(left + colN + colEv, currY, left + colN + colEv, currY + rowH);
      doc.line(left + colN + colEv + colSi, currY, left + colN + colEv + colSi, currY + rowH);
      doc.line(left + colN + colEv + colSi + colNo, currY, left + colN + colEv + colSi + colNo, currY + rowH);

      const rowNum = i + 1;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(`${rowNum}`, left + colN / 2, currY + 4.8, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.text(ev.nombre || '', left + colN + 2, currY + 4.5, {
        maxWidth: colEv - 4,
        lineHeightFactor: 1.15
      });

      // Status
      const appStatus = (apprentice.evidenciasStatus && apprentice.evidenciasStatus[ev.id]) || ev.defaultEstado || 'NO';
      if (appStatus === 'SI') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('SI', left + colN + colEv + colSi / 2, currY + 4.8, { align: 'center' });
      } else if (appStatus === 'CORREGIR') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text('CORR', left + colN + colEv + colSi + colNo / 2, currY + 4.8, { align: 'center' });
      } else if (appStatus === 'NO') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('NO', left + colN + colEv + colSi + colNo / 2, currY + 4.8, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text('-', left + colN + colEv + colSi + colNo / 2, currY + 4.8, { align: 'center' });
      }

      // Observation
      const obs = ev.observacion || (appStatus === 'CORREGIR' ? 'Debe corregir y presentar ajustes' : '');
      if (obs) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.text(obs, left + colN + colEv + colSi + colNo + 2, currY + 4.5, {
          maxWidth: colObs - 4,
          lineHeightFactor: 1.15
        });
      }

      currY += rowH;
    }
  }
}

// -------------------------------------------------------------
// HELPER: DRAW PAGE 2 (Portrait)
// -------------------------------------------------------------
function drawPage2(
  doc: jsPDF,
  opts: {
    marginLeft: number;
    marginTop: number;
    contentWidth: number;
    pageHeight: number;
    generalInfo: GeneralInfo;
    apprentice: Apprentice;
    allEvidences: EvidenceItem[];
    page1RowsCount: number;
    signatureConfig: SignatureConfig;
  }
) {
  const {
    marginLeft,
    marginTop,
    contentWidth,
    generalInfo,
    apprentice,
    allEvidences,
    page1RowsCount,
    signatureConfig
  } = opts;

  const left = marginLeft;
  let currY = marginTop;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);

  // Remaining evidence rows (rows 7 onwards - ONLY render actual evidences, no blank filler rows)
  const colN = 8;
  const colEv = 96;
  const colSi = 13;
  const colNo = 13;
  const colObs = contentWidth - colN - colEv - colSi - colNo; // ~57.9 mm

  const page2Evidences = allEvidences.slice(page1RowsCount);
  const rowH = page2Evidences.length > 18 ? 4.6 : (page2Evidences.length > 12 ? 5.2 : 6.8);
  const textOffset = rowH < 5.5 ? 3.3 : 4.5;
  const nameOffset = rowH < 5.5 ? 3.3 : 4.3;

  if (page2Evidences.length > 0) {
    drawEvidenceTableHeader(doc, left, currY, contentWidth, colN, colEv, colSi, colNo, colObs);
    currY += 8.5;

    for (let idx = 0; idx < page2Evidences.length; idx++) {
      const rowNum = page1RowsCount + idx + 1;
      const ev = page2Evidences[idx];

      doc.rect(left, currY, contentWidth, rowH);
      doc.line(left + colN, currY, left + colN, currY + rowH);
      doc.line(left + colN + colEv, currY, left + colN + colEv, currY + rowH);
      doc.line(left + colN + colEv + colSi, currY, left + colN + colEv + colSi, currY + rowH);
      doc.line(left + colN + colEv + colSi + colNo, currY, left + colN + colEv + colSi + colNo, currY + rowH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(rowH < 5.5 ? 6 : 7);
      doc.text(`${rowNum}`, left + colN / 2, currY + textOffset, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(rowH < 5.5 ? 5.8 : 6.8);
      doc.text(ev.nombre || '', left + colN + 2, currY + nameOffset, {
        maxWidth: colEv - 4,
        lineHeightFactor: 1.15
      });

      const appStatus = (apprentice.evidenciasStatus && apprentice.evidenciasStatus[ev.id]) || ev.defaultEstado || 'NO';
      if (appStatus === 'SI') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(rowH < 5.5 ? 6.5 : 7.2);
        doc.text('SI', left + colN + colEv + colSi / 2, currY + textOffset, { align: 'center' });
      } else if (appStatus === 'CORREGIR') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(rowH < 5.5 ? 5.5 : 6.2);
        doc.text('CORR', left + colN + colEv + colSi + colNo / 2, currY + textOffset, { align: 'center' });
      } else if (appStatus === 'NO') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(rowH < 5.5 ? 6.5 : 7.2);
        doc.text('NO', left + colN + colEv + colSi + colNo / 2, currY + textOffset, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text('-', left + colN + colEv + colSi + colNo / 2, currY + textOffset, { align: 'center' });
      }

      const obs = ev.observacion || (appStatus === 'CORREGIR' ? 'Debe corregir y presentar ajustes' : '');
      if (obs) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(rowH < 5.5 ? 5.2 : 6);
        doc.text(obs, left + colN + colEv + colSi + colNo + 2, currY + nameOffset, {
          maxWidth: colObs - 4,
          lineHeightFactor: 1.15
        });
      }

      currY += rowH;
    }

    currY += page2Evidences.length > 18 ? 4 : 8;
  }

  // -------------------------------------------------------------
  // JUICIO (Evaluation Judgment Section)
  // -------------------------------------------------------------
  const juicioH = 16;
  const colJuicioLabel = 22;
  const colJuicioDesc = 68;
  const colJuicioResLabel = 54;
  const colAprobo = 21.9;
  const colNoAprobo = contentWidth - colJuicioLabel - colJuicioDesc - colJuicioResLabel - colAprobo; // ~22 mm

  doc.rect(left, currY, contentWidth, juicioH);
  doc.line(left + colJuicioLabel, currY, left + colJuicioLabel, currY + juicioH);
  doc.line(left + colJuicioLabel + colJuicioDesc, currY, left + colJuicioLabel + colJuicioDesc, currY + juicioH);
  doc.line(left + colJuicioLabel + colJuicioDesc + colJuicioResLabel, currY, left + colJuicioLabel + colJuicioDesc + colJuicioResLabel, currY + juicioH);
  doc.line(left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo, currY, left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo, currY + juicioH);

  // Sub-header for Aprobó / No Aprobó
  const subHeaderH = 6;
  doc.line(
    left + colJuicioLabel + colJuicioDesc + colJuicioResLabel,
    currY + subHeaderH,
    left + contentWidth,
    currY + subHeaderH
  );

  // Label: JUICIO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('JUICIO', left + colJuicioLabel / 2, currY + 9, { align: 'center' });

  // Description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.text(
    generalInfo.juicioTexto || 'Para superar los resultados de aprendizaje a evaluar debe aprobar todas las evidencias',
    left + colJuicioLabel + 2,
    currY + 5.5,
    { maxWidth: colJuicioDesc - 4, lineHeightFactor: 1.2 }
  );

  // JUICIO DEL RESULTADO(S) DE APRENDIZAJE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('JUICIO DEL RESULTADO(S)', left + colJuicioLabel + colJuicioDesc + colJuicioResLabel / 2, currY + 6.5, {
    align: 'center'
  });
  doc.text('DE APRENDIZAJE', left + colJuicioLabel + colJuicioDesc + colJuicioResLabel / 2, currY + 11, {
    align: 'center'
  });

  // APROBÓ / NO APROBÓ headers
  doc.setFontSize(6.5);
  doc.text('APROBÓ', left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo / 2, currY + 4.2, {
    align: 'center'
  });
  doc.text(
    'NO APROBÓ',
    left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo + colNoAprobo / 2,
    currY + 4.2,
    { align: 'center' }
  );

  // 'x' marking
  const effectiveJuicio = apprentice.juicioEspecifico || generalInfo.juicioResultado || 'NO_APROBO';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  if (effectiveJuicio === 'APROBO') {
    doc.text('x', left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo / 2, currY + 12, {
      align: 'center'
    });
  } else {
    doc.text(
      'x',
      left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo + colNoAprobo / 2,
      currY + 12,
      { align: 'center' }
    );
  }

  currY += juicioH + 24;

  // -------------------------------------------------------------
  // SIGNATURES SECTION (Portrait 4 columns)
  // -------------------------------------------------------------
  const totalSigCols = 4;
  const sigColGap = 3.5;
  const actualSigWidth = (contentWidth - (totalSigCols - 1) * sigColGap) / totalSigCols; // ~44.3 mm

  // 1. Instructor Signature & Name
  const sig1X = left;
  const sigLineY = currY + 14;

  // Render Uploaded Signature or drawn signature if present
  if (signatureConfig.instructorSignatureData) {
    try {
      const sigImgWidth = Math.min(36, actualSigWidth - 4);
      const sigImgHeight = 13;
      const sigImgX = sig1X + (actualSigWidth - sigImgWidth) / 2;
      doc.addImage(signatureConfig.instructorSignatureData, 'PNG', sigImgX, sigLineY - 14, sigImgWidth, sigImgHeight);
    } catch {
      // fallback to text
    }
  } else if (signatureConfig.instructorSignatureType === 'text') {
    doc.setFont('times', 'italic');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 50, 110);
    const textSig = signatureConfig.instructorName || generalInfo.nombreInstructorLlamado || '';
    doc.text(textSig, sig1X + actualSigWidth / 2, sigLineY - 3, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // Horizontal Signature Lines
  doc.setLineWidth(0.35);
  doc.setDrawColor(0, 0, 0);

  // Line 1: Instructor
  doc.line(sig1X, sigLineY, sig1X + actualSigWidth, sigLineY);
  // Line 2: Aprendiz
  const sig2X = sig1X + actualSigWidth + sigColGap;
  doc.line(sig2X, sigLineY, sig2X + actualSigWidth, sigLineY);
  // Line 3: Coordinador
  const sig3X = sig2X + actualSigWidth + sigColGap;
  doc.line(sig3X, sigLineY, sig3X + actualSigWidth, sigLineY);
  // Line 4: Subdirector / Comité
  const sig4X = sig3X + actualSigWidth + sigColGap;
  doc.line(sig4X, sigLineY, sig4X + actualSigWidth, sigLineY);

  // Texts under lines
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  // Under line 1: Instructor name & title
  const instName = signatureConfig.instructorName || generalInfo.nombreInstructorLlamado || '';
  doc.text(instName, sig1X + actualSigWidth / 2, sigLineY + 3.8, { align: 'center', maxWidth: actualSigWidth });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.text('PRIMER LLAMADO INSTRUCTOR', sig1X + actualSigWidth / 2, sigLineY + 7.8, {
    align: 'center',
    maxWidth: actualSigWidth
  });

  // Under line 2: Firma Aprendiz
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMA APRENDIZ', sig2X + actualSigWidth / 2, sigLineY + 7.8, { align: 'center' });

  // Under line 3: Segundo llamado coordinador academico
  doc.setFont('helvetica', 'bold');
  doc.text('SEGUNDO LLAMADO', sig3X + actualSigWidth / 2, sigLineY + 5.5, { align: 'center' });
  doc.text('COORDINADOR ACADEMICO', sig3X + actualSigWidth / 2, sigLineY + 9.5, {
    align: 'center',
    maxWidth: actualSigWidth
  });

  // Under line 4: Tercer llamado subdirector – comité evaluacion
  doc.setFont('helvetica', 'bold');
  doc.text('TERCER LLAMADO SUBDIRECTOR –', sig4X + actualSigWidth / 2, sigLineY + 5.5, {
    align: 'center',
    maxWidth: actualSigWidth
  });
  doc.text('COMITÉ EVALUACION', sig4X + actualSigWidth / 2, sigLineY + 9.5, { align: 'center' });
}

// -------------------------------------------------------------
// HELPER: EVIDENCE TABLE HEADER (Portrait)
// -------------------------------------------------------------
function drawEvidenceTableHeader(
  doc: jsPDF,
  left: number,
  currY: number,
  contentWidth: number,
  colN: number,
  colEv: number,
  colSi: number,
  colNo: number,
  colObs: number
) {
  const headerH = 8.5;

  doc.rect(left, currY, contentWidth, headerH);
  doc.line(left + colN, currY, left + colN, currY + headerH);
  doc.line(left + colN + colEv, currY, left + colN + colEv, currY + headerH);
  doc.line(left + colN + colEv + colSi + colNo, currY, left + colN + colEv + colSi + colNo, currY + headerH);

  // Subdivisions in Aprobó/Presentó (horizontal divider between title and SI/NO)
  doc.line(left + colN + colEv, currY + 4.5, left + colN + colEv + colSi + colNo, currY + 4.5);
  doc.line(left + colN + colEv + colSi, currY + 4.5, left + colN + colEv + colSi, currY + headerH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('N°', left + colN / 2, currY + 5.5, { align: 'center' });
  doc.text('EVIDENCIAS', left + colN + colEv / 2, currY + 5.5, { align: 'center' });

  // APROBÓ / PRESENTÓ EVIDENCIA cleanly centered and stacked on 2 lines
  doc.setFontSize(4.8);
  doc.text('APROBÓ / PRESENTÓ', left + colN + colEv + (colSi + colNo) / 2, currY + 2.3, {
    align: 'center'
  });
  doc.text('EVIDENCIA', left + colN + colEv + (colSi + colNo) / 2, currY + 3.9, {
    align: 'center'
  });

  doc.setFontSize(6.8);
  doc.text('SI', left + colN + colEv + colSi / 2, currY + 7.3, { align: 'center' });
  doc.text('NO', left + colN + colEv + colSi + colNo / 2, currY + 7.3, { align: 'center' });

  doc.setFontSize(7.2);
  doc.text('OBSERVACIONES', left + colN + colEv + colSi + colNo + colObs / 2, currY + 5.5, { align: 'center' });
}

/**
 * Generate a single apprentice PDF in vertical (portrait) orientation
 */
export async function generateSingleApprenticePdf(
  apprentice: Apprentice,
  generalInfo: GeneralInfo,
  evidences: EvidenceItem[],
  signatureConfig: SignatureConfig
): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const logoUrl = generalInfo.senaLogoUrl || (await getSenaLogoDataUrl());
  await buildApprenticePdf(doc, apprentice, generalInfo, evidences, signatureConfig, logoUrl, 1);

  const cleanName = apprentice.nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Llamado_Atencion_${generalInfo.codigoFicha || 'SENA'}_${cleanName}.pdf`;

  const blob = doc.output('blob');
  return { blob, filename };
}

/**
 * Generate a single merged PDF in vertical (portrait) orientation with all apprentice attention calls
 */
export async function generateAllApprenticesCombinedPdf(
  apprentices: Apprentice[],
  generalInfo: GeneralInfo,
  evidences: EvidenceItem[],
  signatureConfig: SignatureConfig,
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const logoUrl = generalInfo.senaLogoUrl || (await getSenaLogoDataUrl());

  for (let i = 0; i < apprentices.length; i++) {
    const apprentice = apprentices[i];
    const startPage = i === 0 ? 1 : doc.getNumberOfPages() + 1;
    await buildApprenticePdf(doc, apprentice, generalInfo, evidences, signatureConfig, logoUrl, startPage);
    if (onProgress) {
      onProgress(i + 1, apprentices.length);
    }
  }

  const filename = `Llamados_Atencion_Ficha_${generalInfo.codigoFicha || 'SENA'}_TODOS.pdf`;
  const blob = doc.output('blob');
  return { blob, filename };
}

/**
 * Generate a ZIP file with all individual portrait PDFs
 */
export async function generateAllApprenticesZip(
  apprentices: Apprentice[],
  generalInfo: GeneralInfo,
  evidences: EvidenceItem[],
  signatureConfig: SignatureConfig,
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();
  const folder = zip.folder(`Llamados_Atencion_Ficha_${generalInfo.codigoFicha || 'SENA'}`);
  const logoUrl = generalInfo.senaLogoUrl || (await getSenaLogoDataUrl());

  for (let i = 0; i < apprentices.length; i++) {
    const apprentice = apprentices[i];
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    await buildApprenticePdf(doc, apprentice, generalInfo, evidences, signatureConfig, logoUrl, 1);

    const cleanName = apprentice.nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfFilename = `${String(i + 1).padStart(2, '0')}_Llamado_${cleanName}.pdf`;

    const pdfBlob = doc.output('blob');
    if (folder) {
      folder.file(pdfFilename, pdfBlob);
    }

    if (onProgress) {
      onProgress(i + 1, apprentices.length);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filename = `Llamados_Atencion_Ficha_${generalInfo.codigoFicha || 'SENA'}_Archivos.zip`;
  return { blob: zipBlob, filename };
}
