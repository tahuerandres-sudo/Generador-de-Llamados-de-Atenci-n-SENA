import React, { useState, useMemo } from 'react';
import { Apprentice, EvidenceItem, GeneralInfo } from '../types';
import {
  getActiveApprenticesDetails,
  getAllApprenticesDetails,
  groupEvidencesByGuia,
  buildPlanillaTitle,
  exportActiveApprenticesStyledHtmlExcel,
  exportActiveApprenticesStandardXlsx,
  exportActiveApprenticesPdf,
  getEvidenceRapLabel,
  ApprenticeEvidenceDetail
} from '../utils/activeApprenticesSheet';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Users,
  Award,
  Printer,
  Copy,
  Check,
  Eye,
  ListFilter
} from 'lucide-react';

interface ActiveApprenticesSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  apprentices: Apprentice[];
  evidences: EvidenceItem[];
  generalInfo: GeneralInfo;
}

export const ActiveApprenticesSheetModal: React.FC<ActiveApprenticesSheetModalProps> = ({
  isOpen,
  onClose,
  apprentices,
  evidences,
  generalInfo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailColumns, setShowDetailColumns] = useState(false);
  const [filterMode, setFilterMode] = useState<'ACTIVE_ONLY' | 'ALL'>('ACTIVE_ONLY');
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedApprenticeDetail, setSelectedApprenticeDetail] = useState<ApprenticeEvidenceDetail | null>(null);

  // Group evidences by Guía
  const guiaGroups = useMemo(() => groupEvidencesByGuia(evidences), [evidences]);
  const title = useMemo(() => buildPlanillaTitle(generalInfo), [generalInfo]);

  // Compute stats and details for all apprentices using standardized helper
  const allDetails = useMemo(() => {
    return getAllApprenticesDetails(apprentices, evidences);
  }, [apprentices, evidences]);

  const activeApprenticesCount = useMemo(() => {
    return allDetails.filter((d) => d.presentedCount > 0 || d.correctingCount > 0).length;
  }, [allDetails]);

  const zeroApprenticesCount = useMemo(() => {
    return allDetails.length - activeApprenticesCount;
  }, [allDetails, activeApprenticesCount]);

  // Filter list
  const filteredDetails = useMemo(() => {
    let list = filterMode === 'ACTIVE_ONLY'
      ? allDetails.filter((d) => d.presentedCount > 0 || d.correctingCount > 0)
      : allDetails;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (d) =>
          d.apprentice.nombre?.toLowerCase().includes(term) ||
          d.apprentice.documento?.toLowerCase().includes(term) ||
          String(d.originalIndex) === term
      );
    }

    return list;
  }, [allDetails, filterMode, searchTerm]);

  // PDF Export handler
  const handleDownloadPdf = async (targetMode?: 'ACTIVE_ONLY' | 'ALL') => {
    try {
      setIsGeneratingPdf(true);
      const mode = targetMode || filterMode;
      await exportActiveApprenticesPdf(apprentices, evidences, generalInfo, {
        filterMode: mode
      });
    } catch (err) {
      console.error('Error generando PDF de planilla:', err);
      alert('Error al generar la planilla en PDF. Por favor verifique los datos e intente de nuevo.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  const handleCopySummary = () => {
    const textLines = filteredDetails.map((item) => {
      const pres = item.presentedEvidences.map((e) => `#${e.numero}`).join(', ') || 'Ninguna';
      const miss = item.missingEvidences.map((e) => `#${e.numero}`).join(', ') || 'Ninguna';
      return `No. ${item.originalIndex} - ${item.apprentice.nombre}: Presentadas (${item.presentedCount}): [${pres}] | Faltantes (${item.missingCount}): [${miss}]`;
    });

    navigator.clipboard.writeText(
      `${title}\nTotal en reporte: ${filteredDetails.length}\n\n` + textLines.join('\n')
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white p-4 border-b-4 border-black flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-400 text-black p-2 border-2 border-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                  Planilla de Seguimiento - Aprendices con Evidencias
                </h2>
                <span className="bg-emerald-400 text-black text-[10px] font-black uppercase px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  Estilo SENA
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono">
                Solo aprendices que han presentado al menos una evidencia • Detalle de aprobadas y faltantes
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleDownloadPdf()}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase bg-red-600 hover:bg-red-500 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
              title={`Descargar la planilla oficial en formato PDF (${filterMode === 'ACTIVE_ONLY' ? 'Solo Aprendices Activos' : 'Todos los Aprendices'})`}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span>Descargar en PDF (.pdf)</span>
            </button>

            <button
              onClick={() => exportActiveApprenticesStyledHtmlExcel(apprentices, evidences, generalInfo)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-0.5 active:translate-y-0.5"
              title="Descargar archivo Excel con colores idénticos a la plantilla oficial"
            >
              <Download className="h-4 w-4" />
              <span>Excel con Colores (.xls)</span>
            </button>

            <button
              onClick={() => exportActiveApprenticesStandardXlsx(apprentices, evidences, generalInfo)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase bg-amber-300 hover:bg-amber-200 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-0.5 active:translate-y-0.5"
              title="Descargar libro de trabajo Excel estándar de dos hojas (.xlsx)"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition border border-transparent hover:border-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Subheader: Stats and Controls */}
        <div className="bg-slate-100 p-3 sm:p-4 border-b-2 border-black flex flex-wrap items-center justify-between gap-3">
          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold">
            <div className="bg-white px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600" />
              <span>Total en Ficha: <strong>{apprentices.length}</strong></span>
            </div>

            <div className="bg-emerald-100 text-emerald-950 px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>Han presentado (&ge;1): <strong>{activeApprenticesCount}</strong></span>
              <span className="text-[10px] bg-emerald-300 px-1 py-0.2 border border-black font-black">
                {apprentices.length > 0 ? Math.round((activeApprenticesCount / apprentices.length) * 100) : 0}%
              </span>
            </div>

            <div className="bg-rose-100 text-rose-950 px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>Sin Entregas (0): <strong>{zeroApprenticesCount}</strong></span>
              <span className="text-[10px] bg-rose-200 text-rose-800 px-1 py-0.2 border border-black font-bold">
                Excluidos de esta planilla
              </span>
            </div>
          </div>

          {/* Controls: Search, View Options */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nombre o #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-hidden"
              />
            </div>

            {/* Toggle Active Only vs All */}
            <div className="flex items-center border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <button
                type="button"
                onClick={() => setFilterMode('ACTIVE_ONLY')}
                className={`px-2.5 py-1 text-xs font-bold uppercase transition ${
                  filterMode === 'ACTIVE_ONLY' ? 'bg-black text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Mostrar únicamente aprendices con al menos 1 evidencia presentada"
              >
                Solo con entregas ({activeApprenticesCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 text-xs font-bold uppercase transition ${
                  filterMode === 'ALL' ? 'bg-black text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Mostrar listado completo de la ficha"
              >
                Todos ({apprentices.length})
              </button>
            </div>

            {/* Toggle detail columns */}
            <button
              type="button"
              onClick={() => setShowDetailColumns(!showDetailColumns)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition ${
                showDetailColumns ? 'bg-amber-300 text-black' : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
              title="Mostrar u ocultar columnas de texto con el detalle de evidencias presentadas y faltantes"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{showDetailColumns ? 'Ocultar Detalle' : 'Ver Detalle'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold uppercase bg-white hover:bg-slate-100 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition"
              title="Copiar resumen al portapapeles"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Legend bar */}
        <div className="bg-slate-50 px-4 py-2 border-b border-black flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
          <span className="font-bold uppercase text-[11px] text-black">Convenciones:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-4 bg-[#92d050] border border-black inline-block text-[9px] font-black text-center leading-4 text-black">SI</span>
            <span>Entregó / Aprobó</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-4 bg-[#fce4d6] border border-black inline-block text-[9px] font-black text-center leading-4 text-[#9c0006]">NO</span>
            <span>No entregó / Falta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-8 h-4 bg-[#fff2cc] border border-black inline-block text-[8px] font-black text-center leading-4 text-[#b25900]">CORR</span>
            <span>Por corregir</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-4 bg-[#70d6ff] border border-black inline-block"></span>
            <span>100% Evidencias aprobadas</span>
          </div>
          <span className="ml-auto text-xs text-slate-500 font-mono">
            Mostrando {filteredDetails.length} aprendices
          </span>
        </div>

        {/* MAIN SPREADSHEET TABLE PREVIEW */}
        <div className="flex-1 overflow-auto p-4 bg-slate-200">
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-block min-w-full">
            <table className="w-full border-collapse text-xs">
              <thead>
                {/* ROW 1: Title Banner & Guías */}
                <tr>
                  <th
                    colSpan={2}
                    className="border-2 border-black bg-white p-3 text-center text-sm sm:text-base font-black uppercase tracking-tight text-black"
                  >
                    {title}
                  </th>
                  {guiaGroups.map((g) => (
                    <th
                      key={g.guiaNumber}
                      colSpan={g.evidences.length}
                      className="border-2 border-black bg-white p-2.5 text-center text-xs sm:text-sm font-black uppercase text-black"
                    >
                      {g.guiaTitle}
                    </th>
                  ))}
                  <th
                    colSpan={2 + (showDetailColumns ? 2 : 0)}
                    className="border-2 border-black bg-indigo-50 p-2.5 text-center text-xs font-black uppercase text-indigo-950"
                  >
                    SEGUIMIENTO
                  </th>
                </tr>

                {/* ROW 2: Column Headers (No. de lista, NOMBRE, Evidence names) */}
                <tr className="bg-white">
                  <th
                    rowSpan={3}
                    className="border-2 border-black p-2 text-center font-black text-xs uppercase w-16 bg-white"
                  >
                    No. De<br />lista
                  </th>
                  <th
                    rowSpan={3}
                    className="border-2 border-black p-2 text-left font-black text-xs uppercase min-w-[240px] max-w-[320px] bg-white"
                  >
                    NOMBRE
                  </th>
                  {evidences.map((ev) => {
                    const rapLabel = getEvidenceRapLabel(ev, generalInfo);
                    return (
                      <th
                        key={ev.id}
                        className="border-2 border-black p-1.5 text-center text-[10px] font-bold leading-tight min-w-[110px] max-w-[130px] bg-white"
                      >
                        <span className="inline-block px-1.5 py-0.5 mb-1 text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 rounded border border-emerald-300">
                          {rapLabel}
                        </span>
                        <div>{ev.nombre}</div>
                      </th>
                    );
                  })}
                  <th
                    rowSpan={3}
                    className="border-2 border-black p-1.5 text-center text-[10px] font-black uppercase w-16 bg-emerald-100 text-emerald-950"
                  >
                    TOTAL<br />PRES.
                  </th>
                  <th
                    rowSpan={3}
                    className="border-2 border-black p-1.5 text-center text-[10px] font-black uppercase w-16 bg-rose-100 text-rose-950"
                  >
                    TOTAL<br />PEND.
                  </th>
                  {showDetailColumns && (
                    <>
                      <th
                        rowSpan={3}
                        className="border-2 border-black p-1.5 text-left text-[10px] font-black uppercase min-w-[200px] bg-emerald-50 text-emerald-950"
                      >
                        EVIDENCIAS PRESENTADAS<br />(APROBADAS)
                      </th>
                      <th
                        rowSpan={3}
                        className="border-2 border-black p-1.5 text-left text-[10px] font-black uppercase min-w-[200px] bg-rose-50 text-rose-950"
                      >
                        EVIDENCIAS NO PRESENTADAS<br />(PENDIENTES)
                      </th>
                    </>
                  )}
                </tr>

                {/* ROW 3: Evidence Dates */}
                <tr className="bg-white">
                  {evidences.map((ev) => (
                    <th
                      key={`date-${ev.id}`}
                      className="border-2 border-black p-1 text-center text-[10px] font-bold uppercase text-slate-800 bg-white"
                    >
                      {ev.fechaEntrega?.trim() || '-'}
                    </th>
                  ))}
                </tr>

                {/* ROW 4: ENTREGÓ/APROBÓ (SI O NO) */}
                <tr className="bg-white">
                  {evidences.map((ev) => (
                    <th
                      key={`sub-${ev.id}`}
                      className="border-2 border-black p-1 text-center text-[8.5px] font-bold uppercase text-slate-600 bg-white leading-tight"
                    >
                      ENTREGÓ/APROBÓ<br />(SI O NO)
                    </th>
                  ))}
                </tr>
              </thead>

              {/* DATA ROWS */}
              <tbody>
                {filteredDetails.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2 + evidences.length + 2 + (showDetailColumns ? 2 : 0)}
                      className="p-8 text-center text-slate-500 font-bold border-2 border-black bg-white"
                    >
                      No se encontraron aprendices con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredDetails.map((item) => {
                    const { originalIndex, apprentice, allApproved, presentedCount, missingCount, presentedEvidences, missingEvidences } = item;

                    return (
                      <tr
                        key={apprentice.id}
                        className="hover:bg-slate-50 transition cursor-pointer"
                        onClick={() => setSelectedApprenticeDetail(item)}
                      >
                        {/* No. de lista */}
                        <td className="border-2 border-black p-1.5 text-center font-mono font-bold text-xs bg-white">
                          {originalIndex}
                        </td>

                        {/* Apprentice Name (Highlighted in light blue if 100% approved like Daniel Vasquez / Daniel Arango in image) */}
                        <td
                          className={`border-2 border-black p-2 font-medium text-xs whitespace-normal ${
                            allApproved
                              ? 'bg-[#70d6ff] font-bold text-black'
                              : 'bg-white text-black'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span>{apprentice.nombre}</span>
                            {allApproved && (
                              <Award className="h-3.5 w-3.5 text-blue-900 shrink-0" title="Todas las evidencias aprobadas" />
                            )}
                          </div>
                        </td>

                        {/* Evidence Status Cells */}
                        {evidences.map((ev) => {
                          const status = item.statuses[ev.id];
                          if (status === 'SI') {
                            return (
                              <td
                                key={ev.id}
                                className="border-2 border-black p-1.5 text-center font-black text-xs bg-[#92d050] text-black"
                              >
                                SI
                              </td>
                            );
                          }
                          if (status === 'CORREGIR') {
                            return (
                              <td
                                key={ev.id}
                                className="border-2 border-black p-1 text-center font-black text-[10px] bg-[#fff2cc] text-[#b25900]"
                              >
                                CORREGIR
                              </td>
                            );
                          }
                          if (status === 'NO') {
                            return (
                              <td
                                key={ev.id}
                                className="border-2 border-black p-1.5 text-center font-black text-xs bg-[#fce4d6] text-[#9c0006]"
                              >
                                NO
                              </td>
                            );
                          }
                          return (
                            <td
                              key={ev.id}
                              className="border-2 border-black p-1 text-center text-xs text-slate-400 bg-white"
                            >
                              -
                            </td>
                          );
                        })}

                        {/* Totals columns (Always visible, matching PDF) */}
                        <td className="border-2 border-black p-1.5 text-center font-bold text-xs bg-emerald-50 text-emerald-950">
                          {presentedCount}
                        </td>
                        <td className={`border-2 border-black p-1.5 text-center font-bold text-xs bg-rose-50 ${
                          missingCount > 0 ? 'text-[#9c0006]' : 'text-slate-600'
                        }`}>
                          {missingCount}
                        </td>

                        {/* Optional detailed evidence list columns */}
                        {showDetailColumns && (
                          <>
                            <td className="border-2 border-black p-1.5 text-[10.5px] leading-tight text-emerald-900 bg-white">
                              {presentedEvidences.length > 0 ? (
                                <ul className="list-disc list-inside space-y-0.5">
                                  {presentedEvidences.map((e) => (
                                    <li key={e.id} className="truncate">
                                      <strong>#{e.numero}:</strong> {e.nombre}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-slate-400 italic">Ninguna</span>
                              )}
                            </td>
                            <td className="border-2 border-black p-1.5 text-[10.5px] leading-tight text-rose-900 bg-white">
                              {missingEvidences.length > 0 ? (
                                <ul className="list-disc list-inside space-y-0.5">
                                  {missingEvidences.map((e) => (
                                    <li key={e.id} className="truncate text-rose-700 font-medium">
                                      <strong>#{e.numero}:</strong> {e.nombre}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-emerald-700 font-bold">¡Al día! Ninguna pendiente</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="bg-slate-100 p-3 sm:p-4 border-t-4 border-black flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-700 font-medium">
            💡 <strong>Exportación:</strong> Puedes descargar la planilla en <strong>PDF (.pdf)</strong> para imprimir o archivar, o en <strong>Excel con Colores (.xls)</strong> manteniendo el formato oficial SENA.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleDownloadPdf()}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase bg-red-600 hover:bg-red-500 text-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
              title={`Descargar la planilla oficial en formato PDF (${filterMode === 'ACTIVE_ONLY' ? 'Solo Aprendices Activos' : 'Todos los Aprendices'})`}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span>Descargar en PDF (.pdf)</span>
            </button>

            <button
              onClick={() => exportActiveApprenticesStyledHtmlExcel(apprentices, evidences, generalInfo)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase bg-[#92d050] hover:bg-[#82bd45] text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-0.5 active:translate-y-0.5"
            >
              <Download className="h-4 w-4" />
              <span>Planilla con Colores (.xls)</span>
            </button>

            <button
              onClick={() => exportActiveApprenticesStandardXlsx(apprentices, evidences, generalInfo)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase bg-white hover:bg-slate-100 text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-0.5 active:translate-y-0.5"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Libro Completo (.xlsx)</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-black uppercase bg-slate-200 hover:bg-slate-300 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Selected Apprentice Quick Drawer / Modal */}
        {selectedApprenticeDetail && (
          <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white border-4 border-black p-5 max-w-lg w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between mb-3 border-b-2 border-black pb-2">
                <div>
                  <span className="text-[10px] font-black uppercase bg-slate-200 px-2 py-0.5 border border-black font-mono">
                    Posición #{selectedApprenticeDetail.originalIndex}
                  </span>
                  <h3 className="text-base font-black uppercase text-black mt-1">
                    {selectedApprenticeDetail.apprentice.nombre}
                  </h3>
                  <p className="text-xs text-slate-600 font-mono">
                    Documento: {selectedApprenticeDetail.apprentice.documento || 'No registrado'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedApprenticeDetail(null)}
                  className="p-1 hover:bg-slate-200 border border-black"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-bold">
                <div className="p-2 bg-emerald-100 border-2 border-black">
                  <div className="text-[10px] text-emerald-900 uppercase">Presentadas</div>
                  <div className="text-xl font-black text-emerald-800">
                    {selectedApprenticeDetail.presentedCount} / {selectedApprenticeDetail.totalEvidences}
                  </div>
                </div>
                <div className="p-2 bg-rose-100 border-2 border-black">
                  <div className="text-[10px] text-rose-900 uppercase">Pendientes (Llamado)</div>
                  <div className="text-xl font-black text-rose-800">
                    {selectedApprenticeDetail.missingCount}
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto text-xs pr-1">
                <div>
                  <h4 className="font-black uppercase text-emerald-800 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Evidencias Entregadas ({selectedApprenticeDetail.presentedEvidences.length}):
                  </h4>
                  {selectedApprenticeDetail.presentedEvidences.length > 0 ? (
                    <div className="space-y-1">
                      {selectedApprenticeDetail.presentedEvidences.map((e) => (
                        <div key={e.id} className="p-1.5 bg-emerald-50 border border-emerald-300 text-emerald-950 font-medium">
                          <strong>#{e.numero}:</strong> {e.nombre}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No ha entregado evidencias aún.</p>
                  )}
                </div>

                <div>
                  <h4 className="font-black uppercase text-rose-800 flex items-center gap-1 mb-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Evidencias No Entregadas ({selectedApprenticeDetail.missingEvidences.length}):
                  </h4>
                  {selectedApprenticeDetail.missingEvidences.length > 0 ? (
                    <div className="space-y-1">
                      {selectedApprenticeDetail.missingEvidences.map((e) => (
                        <div key={e.id} className="p-1.5 bg-rose-50 border border-rose-300 text-rose-950 font-medium">
                          <strong>#{e.numero}:</strong> {e.nombre}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-emerald-700 font-bold">¡Felicitaciones! Tiene todas las evidencias entregadas.</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedApprenticeDetail(null)}
                className="w-full mt-4 py-2 bg-black text-white text-xs font-black uppercase border-2 border-black hover:bg-slate-800 transition"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
