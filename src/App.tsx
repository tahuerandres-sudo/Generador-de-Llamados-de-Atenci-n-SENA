import React, { useState, useEffect } from 'react';
import { ActiveTab, Apprentice, EvidenceItem, GeneralInfo, SignatureConfig, ProgramSlot } from './types';
import {
  INITIAL_APPRENTICES,
  INITIAL_EVIDENCES,
  INITIAL_GENERAL_INFO,
  INITIAL_SIGNATURE_CONFIG
} from './utils/sampleData';
import { getDefaultPrograms } from './utils/defaultPrograms';
import { Header } from './components/Header';
import { ProgramSelectorBar } from './components/ProgramSelectorBar';
import { CopyOptions } from './components/CopyProgramModal';
import { GeneralInfoForm } from './components/GeneralInfoForm';
import { EvidenceManager } from './components/EvidenceManager';
import { EvidenceMatrixView } from './components/EvidenceMatrixView';
import { ApprenticeManager } from './components/ApprenticeManager';
import { DocumentPreview } from './components/DocumentPreview';
import { SignatureModal } from './components/SignatureModal';
import { BulkDownloadModal } from './components/BulkDownloadModal';
import { ActiveApprenticesSheetModal } from './components/ActiveApprenticesSheetModal';
import { RotateCcw } from 'lucide-react';

const STORAGE_KEYS = {
  PROGRAMS: 'sena_atencion_programs_v2',
  ACTIVE_PROGRAM_ID: 'sena_atencion_active_program_id',
  GENERAL_INFO: 'sena_atencion_general_info',
  EVIDENCES: 'sena_atencion_evidences',
  APPRENTICES: 'sena_atencion_apprentices',
  SIGNATURE: 'sena_atencion_signature'
};

export default function App() {
  // 1. Five Program Slots
  const [programs, setPrograms] = useState<ProgramSlot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROGRAMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 5) {
          return parsed;
        }
      }
    } catch {}

    const defaults = getDefaultPrograms();
    // Check if there was existing standalone data in localStorage for active program (P2)
    try {
      const savedGen = localStorage.getItem(STORAGE_KEYS.GENERAL_INFO);
      const savedEv = localStorage.getItem(STORAGE_KEYS.EVIDENCES);
      const savedApp = localStorage.getItem(STORAGE_KEYS.APPRENTICES);
      const savedSig = localStorage.getItem(STORAGE_KEYS.SIGNATURE);

      if (savedGen || savedEv || savedApp) {
        return defaults.map((p) => {
          if (p.id === 2) {
            return {
              ...p,
              generalInfo: savedGen ? JSON.parse(savedGen) : p.generalInfo,
              evidences: savedEv ? JSON.parse(savedEv) : p.evidences,
              apprentices: savedApp ? JSON.parse(savedApp) : p.apprentices,
              signatureConfig: savedSig ? JSON.parse(savedSig) : p.signatureConfig
            };
          }
          return p;
        });
      }
    } catch {}

    return defaults;
  });

  // 2. Active Program ID (defaults to 2: Videojuegos y entornos interactivos)
  const [activeProgramId, setActiveProgramId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROGRAM_ID);
      const num = saved ? Number(saved) : 2;
      return num >= 1 && num <= 5 ? num : 2;
    } catch {
      return 2;
    }
  });

  const activeProgram = programs.find((p) => p.id === activeProgramId) || programs[1] || programs[0];

  // 3. States for currently active program
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo>(() => activeProgram.generalInfo);
  const [evidences, setEvidences] = useState<EvidenceItem[]>(() => activeProgram.evidences);
  const [apprentices, setApprentices] = useState<Apprentice[]>(() => activeProgram.apprentices);
  const [signatureConfig, setSignatureConfig] = useState<SignatureConfig>(() => activeProgram.signatureConfig);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('general');
  const [selectedApprentice, setSelectedApprentice] = useState<Apprentice | null>(() => apprentices[0] || null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isBulkDownloadOpen, setIsBulkDownloadOpen] = useState(false);
  const [isActiveSheetModalOpen, setIsActiveSheetModalOpen] = useState(false);

  // Automatically update the program slot in the programs array whenever active program data changes
  useEffect(() => {
    setPrograms((prev) =>
      prev.map((p) => {
        if (p.id === activeProgramId) {
          return {
            ...p,
            name: generalInfo.programa || p.name,
            codigoFicha: generalInfo.codigoFicha || p.codigoFicha,
            generalInfo,
            evidences,
            apprentices,
            signatureConfig
          };
        }
        return p;
      })
    );
  }, [generalInfo, evidences, apprentices, signatureConfig, activeProgramId]);

  // Persist programs and active program id
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(programs));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROGRAM_ID, String(activeProgramId));
      localStorage.setItem(STORAGE_KEYS.GENERAL_INFO, JSON.stringify(generalInfo));
      localStorage.setItem(STORAGE_KEYS.EVIDENCES, JSON.stringify(evidences));
      localStorage.setItem(STORAGE_KEYS.APPRENTICES, JSON.stringify(apprentices));
      localStorage.setItem(STORAGE_KEYS.SIGNATURE, JSON.stringify(signatureConfig));
    } catch {}
  }, [programs, activeProgramId, generalInfo, evidences, apprentices, signatureConfig]);

  // Keep selected apprentice synced if list changes
  useEffect(() => {
    if (apprentices.length > 0) {
      if (!selectedApprentice || !apprentices.some((a) => a.id === selectedApprentice.id)) {
        setSelectedApprentice(apprentices[0]);
      }
    } else {
      setSelectedApprentice(null);
    }
  }, [apprentices, selectedApprentice]);

  // Handle switching program slot
  const handleSelectProgram = (newId: number) => {
    if (newId === activeProgramId) return;

    // Snapshot current active state into programs list
    const updatedPrograms = programs.map((p) => {
      if (p.id === activeProgramId) {
        return {
          ...p,
          name: generalInfo.programa || p.name,
          codigoFicha: generalInfo.codigoFicha || p.codigoFicha,
          generalInfo,
          evidences,
          apprentices,
          signatureConfig
        };
      }
      return p;
    });

    const target = updatedPrograms.find((p) => p.id === newId);
    if (!target) return;

    setPrograms(updatedPrograms);
    setActiveProgramId(newId);
    setGeneralInfo(target.generalInfo);
    setEvidences(target.evidences);
    setApprentices(target.apprentices);
    setSignatureConfig(target.signatureConfig);
    setSelectedApprentice(target.apprentices[0] || null);
  };

  // Handle updating program name or ficha
  const handleUpdateProgramMeta = (id: number, data: { name: string; codigoFicha: string }) => {
    setPrograms((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            name: data.name,
            codigoFicha: data.codigoFicha,
            generalInfo: {
              ...p.generalInfo,
              programa: data.name,
              codigoFicha: data.codigoFicha
            }
          };
        }
        return p;
      })
    );

    if (id === activeProgramId) {
      setGeneralInfo((prev) => ({
        ...prev,
        programa: data.name,
        codigoFicha: data.codigoFicha
      }));
    }
  };

  // Handle resetting a program to defaults
  const handleResetProgram = (id: number) => {
    const defaults = getDefaultPrograms();
    const targetDefault = defaults.find((p) => p.id === id);
    if (!targetDefault) return;

    setPrograms((prev) => prev.map((p) => (p.id === id ? { ...targetDefault } : p)));

    if (id === activeProgramId) {
      setGeneralInfo(targetDefault.generalInfo);
      setEvidences(targetDefault.evidences);
      setApprentices(targetDefault.apprentices);
      setSignatureConfig(targetDefault.signatureConfig);
      setSelectedApprentice(targetDefault.apprentices[0] || null);
    }
  };

  // Handle copying data between programs
  const handleCopyBetweenPrograms = (sourceId: number, targetId: number, options: CopyOptions) => {
    const source = programs.find((p) => p.id === sourceId);
    if (!source) return;

    let updatedTargetSlot: ProgramSlot | null = null;

    setPrograms((prev) => {
      return prev.map((p) => {
        if (p.id === targetId) {
          const updatedGenInfo: GeneralInfo = options.copyGeneralInfo
            ? {
                ...source.generalInfo,
                programa: p.name,
                codigoFicha: p.codigoFicha
              }
            : p.generalInfo;

          const updatedEvidences = options.copyEvidences
            ? JSON.parse(JSON.stringify(source.evidences))
            : p.evidences;

          const updatedApprentices = options.copyApprentices
            ? JSON.parse(JSON.stringify(source.apprentices))
            : p.apprentices;

          const updatedSignatures = options.copySignatures
            ? JSON.parse(JSON.stringify(source.signatureConfig))
            : p.signatureConfig;

          const res: ProgramSlot = {
            ...p,
            generalInfo: updatedGenInfo,
            evidences: updatedEvidences,
            apprentices: updatedApprentices,
            signatureConfig: updatedSignatures
          };
          updatedTargetSlot = res;
          return res;
        }
        return p;
      });
    });

    if (targetId === activeProgramId && updatedTargetSlot) {
      const u = updatedTargetSlot as ProgramSlot;
      setGeneralInfo(u.generalInfo);
      setEvidences(u.evidences);
      setApprentices(u.apprentices);
      setSignatureConfig(u.signatureConfig);
      setSelectedApprentice(u.apprentices[0] || null);
    }
  };

  const handleResetToDefaultSample = () => {
    if (window.confirm('¿Desea restaurar todos los 5 programas a sus datos de ejemplo del formato SENA?')) {
      const defaults = getDefaultPrograms();
      setPrograms(defaults);
      setActiveProgramId(2);
      const p2 = defaults.find((p) => p.id === 2) || defaults[0];
      setGeneralInfo(p2.generalInfo);
      setEvidences(p2.evidences);
      setApprentices(p2.apprentices);
      setSignatureConfig(p2.signatureConfig);
      setSelectedApprentice(p2.apprentices[0] || null);
      localStorage.clear();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-black flex flex-col font-sans antialiased">
      {/* App Header */}
      <Header
        senaLogoUrl={generalInfo.senaLogoUrl}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        apprenticesCount={apprentices.length}
        evidencesCount={evidences.length}
        codigoFicha={generalInfo.codigoFicha}
        activeProgramId={activeProgramId}
        activeProgramName={activeProgram?.name || generalInfo.programa}
        onOpenBulkDownload={() => setIsBulkDownloadOpen(true)}
      />

      {/* Program Selector Bar (5 Programs) */}
      <ProgramSelectorBar
        programs={programs}
        activeProgramId={activeProgramId}
        onSelectProgram={handleSelectProgram}
        onUpdateProgramMeta={handleUpdateProgramMeta}
        onResetProgram={handleResetProgram}
        onCopyBetweenPrograms={handleCopyBetweenPrograms}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'general' && (
          <GeneralInfoForm
            generalInfo={generalInfo}
            setGeneralInfo={setGeneralInfo}
            signatureConfig={signatureConfig}
            setSignatureConfig={setSignatureConfig}
            onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
            onContinue={() => setActiveTab('evidencias')}
          />
        )}

        {activeTab === 'evidencias' && (
          <EvidenceManager
            evidences={evidences}
            setEvidences={setEvidences}
            onBack={() => setActiveTab('general')}
            onContinue={() => setActiveTab('matriz')}
          />
        )}

        {activeTab === 'matriz' && (
          <EvidenceMatrixView
            apprentices={apprentices}
            setApprentices={setApprentices}
            evidences={evidences}
            setEvidences={setEvidences}
            generalInfo={generalInfo}
            onSelectApprenticeForPreview={(app) => {
              setSelectedApprentice(app);
              setActiveTab('vista-previa');
            }}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'aprendices' && (
          <ApprenticeManager
            apprentices={apprentices}
            setApprentices={setApprentices}
            evidences={evidences}
            setEvidences={setEvidences}
            onSelectApprenticeForPreview={(app) => {
              setSelectedApprentice(app);
              setActiveTab('vista-previa');
            }}
            onBack={() => setActiveTab('matriz')}
            onContinue={() => setActiveTab('vista-previa')}
          />
        )}

        {activeTab === 'vista-previa' && (
          <DocumentPreview
            generalInfo={generalInfo}
            evidences={evidences}
            apprentices={apprentices}
            selectedApprentice={selectedApprentice}
            onSelectApprentice={setSelectedApprentice}
            signatureConfig={signatureConfig}
            onOpenBulkDownload={() => setIsBulkDownloadOpen(true)}
            onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-black mt-auto py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-black gap-3 font-semibold">
          <div className="flex items-center gap-2">
            <span className="font-black uppercase tracking-wider">Servicio Nacional de Aprendizaje - SENA</span>
            <span>•</span>
            <span className="text-slate-600">Generador Automatizado de Documentos PDF</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="reset-sample-data-btn"
              type="button"
              onClick={handleResetToDefaultSample}
              className="flex items-center gap-1.5 text-xs font-black uppercase text-black hover:text-emerald-600 transition underline"
              title="Restaurar ejemplo predeterminado"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar Datos de Ejemplo
            </button>
          </div>
        </div>
      </footer>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        signatureConfig={signatureConfig}
        onSave={setSignatureConfig}
      />

      {/* Bulk Download Modal */}
      <BulkDownloadModal
        isOpen={isBulkDownloadOpen}
        onClose={() => setIsBulkDownloadOpen(false)}
        apprentices={apprentices}
        generalInfo={generalInfo}
        evidences={evidences}
        signatureConfig={signatureConfig}
        onOpenActiveApprenticesSheetModal={() => setIsActiveSheetModalOpen(true)}
      />

      {/* Active Apprentices Sheet Modal */}
      <ActiveApprenticesSheetModal
        isOpen={isActiveSheetModalOpen}
        onClose={() => setIsActiveSheetModalOpen(false)}
        apprentices={apprentices}
        evidences={evidences}
        generalInfo={generalInfo}
      />
    </div>
  );
}
