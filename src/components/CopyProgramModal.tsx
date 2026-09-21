import React, { useState } from 'react';
import { X, Copy, ArrowRight, Check } from 'lucide-react';
import { ProgramSlot } from '../types';

interface CopyProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: ProgramSlot[];
  activeProgramId: number;
  onCopy: (sourceId: number, targetId: number, options: CopyOptions) => void;
}

export interface CopyOptions {
  copyGeneralInfo: boolean;
  copyEvidences: boolean;
  copyApprentices: boolean;
  copySignatures: boolean;
}

export const CopyProgramModal: React.FC<CopyProgramModalProps> = ({
  isOpen,
  onClose,
  programs,
  activeProgramId,
  onCopy
}) => {
  const [sourceId, setSourceId] = useState<number>(activeProgramId);
  const [targetId, setTargetId] = useState<number>(() => {
    const other = programs.find((p) => p.id !== activeProgramId);
    return other ? other.id : 1;
  });

  const [copyGeneralInfo, setCopyGeneralInfo] = useState(true);
  const [copyEvidences, setCopyEvidences] = useState(true);
  const [copyApprentices, setCopyApprentices] = useState(false);
  const [copySignatures, setCopySignatures] = useState(true);

  if (!isOpen) return null;

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceId === targetId) {
      alert('El programa de origen y destino deben ser diferentes.');
      return;
    }

    if (!copyGeneralInfo && !copyEvidences && !copyApprentices && !copySignatures) {
      alert('Debe seleccionar al menos un elemento para copiar.');
      return;
    }

    const source = programs.find((p) => p.id === sourceId);
    const target = programs.find((p) => p.id === targetId);

    if (
      window.confirm(
        `¿Está seguro de copiar datos de "P${sourceId}: ${source?.name}" a "P${targetId}: ${target?.name}"? Los datos seleccionados en el programa destino se reemplazarán.`
      )
    ) {
      onCopy(sourceId, targetId, {
        copyGeneralInfo,
        copyEvidences,
        copyApprentices,
        copySignatures
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-black text-white p-4 flex items-center justify-between border-b-2 border-black">
          <div className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-emerald-400" />
            <span className="font-black text-sm uppercase tracking-wider">
              Copiar Datos Entre Programas
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-rose-400 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleExecute} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 p-3.5 border-2 border-black">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                Desde (Origen):
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(Number(e.target.value))}
                className="w-full text-xs font-bold p-2 border-2 border-black bg-white focus:outline-hidden"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    P{p.id}: {p.name.slice(0, 26)}... (Ficha {p.codigoFicha})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="block text-[11px] font-black uppercase text-slate-700 mb-1 flex items-center gap-1">
                <ArrowRight className="h-3 w-3 text-emerald-600 inline" />
                Hacia (Destino):
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(Number(e.target.value))}
                className="w-full text-xs font-bold p-2 border-2 border-black bg-white focus:outline-hidden"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === sourceId}>
                    P{p.id}: {p.name.slice(0, 26)}... (Ficha {p.codigoFicha})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-800 mb-2">
              Seleccione los elementos a copiar:
            </label>
            <div className="space-y-2 border-2 border-slate-300 p-3 bg-white">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyGeneralInfo}
                  onChange={(e) => setCopyGeneralInfo(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded-none border-2 border-black"
                />
                <span>Datos del Programa (Instructor, Competencia, RAPs, etc.)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyEvidences}
                  onChange={(e) => setCopyEvidences(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded-none border-2 border-black"
                />
                <span>Lista de Evidencias (Códigos, Nombres, RAPs)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyApprentices}
                  onChange={(e) => setCopyApprentices(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded-none border-2 border-black"
                />
                <span>Lista de Aprendices (Nombres, Documentos, Correos)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copySignatures}
                  onChange={(e) => setCopySignatures(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded-none border-2 border-black"
                />
                <span>Configuración de Firmas</span>
              </label>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 italic">
              * Nota: El nombre del programa y código de ficha de destino se mantendrán intactos.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t-2 border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase border-2 border-black bg-white hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-black uppercase border-2 border-black bg-emerald-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 transition flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              Copiar Ahora
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
