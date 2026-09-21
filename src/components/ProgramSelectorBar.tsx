import React, { useState } from 'react';
import { Users, Layers, Edit2, Copy, RotateCcw, GraduationCap } from 'lucide-react';
import { ProgramSlot } from '../types';
import { EditProgramModal } from './EditProgramModal';
import { CopyProgramModal, CopyOptions } from './CopyProgramModal';

interface ProgramSelectorBarProps {
  programs: ProgramSlot[];
  activeProgramId: number;
  onSelectProgram: (id: number) => void;
  onUpdateProgramMeta: (id: number, data: { name: string; codigoFicha: string }) => void;
  onResetProgram: (id: number) => void;
  onCopyBetweenPrograms: (sourceId: number, targetId: number, options: CopyOptions) => void;
}

export const ProgramSelectorBar: React.FC<ProgramSelectorBarProps> = ({
  programs,
  activeProgramId,
  onSelectProgram,
  onUpdateProgramMeta,
  onResetProgram,
  onCopyBetweenPrograms
}) => {
  const [editingProgram, setEditingProgram] = useState<ProgramSlot | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  const activeProgram = programs.find((p) => p.id === activeProgramId) || programs[0];

  const handleResetClick = () => {
    if (!activeProgram) return;
    if (
      window.confirm(
        `¿Desea restablecer el "Programa ${activeProgram.id}: ${activeProgram.name}" a sus valores de ejemplo predeterminados?`
      )
    ) {
      onResetProgram(activeProgram.id);
    }
  };

  return (
    <section className="bg-[#0b1325] border-b-4 border-black text-white w-full shadow-inner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Top bar: Title, Badge and Action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-black border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              <GraduationCap className="h-3.5 w-3.5" />
              {programs.length} PROGRAMAS DISPONIBLES
            </span>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100">
              SELECCIONAR PROGRAMA DE FORMACIÓN A TRABAJAR:
            </h2>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsCopyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition"
              title="Copiar datos, evidencias o aprendices entre programas"
            >
              <Copy className="h-3.5 w-3.5 text-emerald-400" />
              <span>Copiar entre programas</span>
            </button>

            <button
              type="button"
              onClick={handleResetClick}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 transition"
              title={`Restablecer P${activeProgram?.id || 1} a valores predeterminados`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restablecer P{activeProgram?.id || 1}</span>
            </button>
          </div>
        </div>

        {/* 5 Program Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 my-2">
          {programs.map((prog) => {
            const isActive = prog.id === activeProgramId;
            const currentFicha = prog.codigoFicha || prog.generalInfo.codigoFicha || 'S/N';
            const apprenticeCount = prog.apprentices.length;
            const evidenceCount = prog.evidences.length;

            if (isActive) {
              return (
                <div
                  key={prog.id}
                  onClick={() => onSelectProgram(prog.id)}
                  className="bg-emerald-400 border-3 border-black p-2.5 text-left transition cursor-pointer flex flex-col justify-between min-h-[112px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative"
                  title="Programa actualmente seleccionado"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1">
                        <span className="bg-black text-white text-[9px] font-black uppercase px-1.5 py-0.5 border border-black">
                          PROGRAMA {prog.id}
                        </span>
                        <span className="bg-black text-emerald-400 text-[9px] font-black uppercase px-1.5 py-0.5 border border-black flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                          ACTIVO
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProgram(prog);
                        }}
                        className="text-black hover:bg-black/10 p-1 transition"
                        title="Editar nombre y ficha"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>

                    <h3 className="text-black font-black text-xs leading-snug line-clamp-2 my-1">
                      {prog.name}
                    </h3>

                    <p className="text-black text-[11px] font-mono font-bold">
                      Ficha: {currentFicha}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] font-bold text-black border-t border-black/30 pt-1.5 mt-2">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-black" />
                      {apprenticeCount} aprendices
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-black" />
                      {evidenceCount} evid.
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={prog.id}
                onClick={() => onSelectProgram(prog.id)}
                className="bg-[#0e1a32] border-2 border-slate-700/80 hover:border-slate-400 hover:bg-[#132240] p-2.5 text-left transition cursor-pointer flex flex-col justify-between min-h-[112px] group"
                title={`Cambiar a Programa ${prog.id}: ${prog.name}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="bg-slate-800 text-slate-300 text-[9px] font-black uppercase px-1.5 py-0.5 border border-slate-700">
                      PROGRAMA {prog.id}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProgram(prog);
                      }}
                      className="text-slate-400 hover:text-white p-1 transition opacity-70 group-hover:opacity-100"
                      title="Editar nombre y ficha"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>

                  <h3 className="text-white font-bold text-xs leading-snug line-clamp-2 my-1 group-hover:text-emerald-300 transition">
                    {prog.name}
                  </h3>

                  <p className="text-emerald-400 text-[11px] font-mono font-bold">
                    Ficha: {currentFicha}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10.5px] text-slate-400 border-t border-slate-800/80 pt-1.5 mt-2">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {apprenticeCount} aprendices
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    {evidenceCount} evid.
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom strip: Active Program details and sync status */}
        <div className="bg-[#060c18] border border-slate-800/90 px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              PROGRAMA ACTIVO:
            </span>
            <span className="text-emerald-400 font-black">
              Programa {activeProgram.id}: {activeProgram.name}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-mono">
              Ficha: {activeProgram.codigoFicha || activeProgram.generalInfo.codigoFicha || 'S/N'}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              {activeProgram.generalInfo.competencia ? 'Transversal Inglés' : 'Sin competencia'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-bold shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>Sincronizado en tiempo real con Datos del Programa</span>
          </div>
        </div>
      </div>

      {/* Edit Program Name & Ficha Modal */}
      <EditProgramModal
        isOpen={!!editingProgram}
        onClose={() => setEditingProgram(null)}
        program={editingProgram}
        onSave={(updated) => {
          if (editingProgram) {
            onUpdateProgramMeta(editingProgram.id, updated);
          }
        }}
      />

      {/* Copy between programs Modal */}
      <CopyProgramModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        programs={programs}
        activeProgramId={activeProgramId}
        onCopy={onCopyBetweenPrograms}
      />
    </section>
  );
};
