import React, { useState, useEffect } from 'react';
import { X, Check, Edit2 } from 'lucide-react';
import { ProgramSlot } from '../types';

interface EditProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: ProgramSlot | null;
  onSave: (updated: { name: string; codigoFicha: string }) => void;
}

export const EditProgramModal: React.FC<EditProgramModalProps> = ({
  isOpen,
  onClose,
  program,
  onSave
}) => {
  const [name, setName] = useState('');
  const [codigoFicha, setCodigoFicha] = useState('');

  useEffect(() => {
    if (program) {
      setName(program.name);
      setCodigoFicha(program.codigoFicha || program.generalInfo.codigoFicha || '');
    }
  }, [program]);

  if (!isOpen || !program) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      codigoFicha: codigoFicha.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-black text-white p-4 flex items-center justify-between border-b-2 border-black">
          <div className="flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-emerald-400" />
            <span className="font-black text-sm uppercase tracking-wider">
              Editar Programa {program.id}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1">
              Nombre del Programa de Formación:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs font-bold border-2 border-black focus:outline-hidden focus:bg-emerald-50"
              placeholder="Ej: Desarrollo de videojuegos y entornos interactivos"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1">
              Código de Ficha:
            </label>
            <input
              type="text"
              value={codigoFicha}
              onChange={(e) => setCodigoFicha(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-bold border-2 border-black focus:outline-hidden focus:bg-emerald-50"
              placeholder="Ej: 3466175"
            />
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
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
