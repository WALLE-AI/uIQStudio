import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DatasetPanel } from './components/DatasetPanel';
import { VisualizationPanel } from './components/VisualizationPanel';
import { AnnotationPanel } from './components/AnnotationPanel';
import { DataUploadModal } from './components/DataUploadModal';
import { DataPreprocessingView } from './components/DataPreprocessingView';
import { DataExportModal } from './components/DataExportModal';
import { DataStatisticsView } from './components/DataStatisticsView';
import { TagSystemView } from './components/TagSystemView';
import { BatchProcessingModal } from './components/BatchProcessingModal';
import { DataManagementView } from './components/DataManagementView';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { SignalSample, WorkflowStepType, ActiveNavType, AnnotationStatus } from './types/radio';
import { INITIAL_DATASET } from './data/mockSignals';

const STORAGE_KEY = 'iqstudio_dataset_v2';

export default function App() {
  // Main Dataset state with localStorage recovery
  const [datasetList, setDatasetList] = useState<SignalSample[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_DATASET;
  });

  // Current selected file ID
  const [selectedFileId, setSelectedFileId] = useState<string>(() => {
    return INITIAL_DATASET[0]?.id || '1';
  });

  // Selected file checkboxes for batch ops
  const [checkedFiles, setCheckedFiles] = useState<Record<string, boolean>>({});

  // Navigation & Step state
  const [activeStep, setActiveStep] = useState<WorkflowStepType>(3); // 1: Upload, 2: Preprocess, 3: Annotate, 4: Export
  const [activeNav, setActiveNav] = useState<ActiveNavType>('数据标注');

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Panel collapse states for spacious responsive workspace
  const [isDatasetCollapsed, setIsDatasetCollapsed] = useState(false);
  const [isAnnotationCollapsed, setIsAnnotationCollapsed] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(datasetList));
    } catch {
      // Ignore
    }
  }, [datasetList]);

  // Handle active navigation changes
  const handleNavChange = (nav: ActiveNavType) => {
    setActiveNav(nav);
    if (nav === '关于') {
      setShowHelpModal(true);
    }
  };

  // Handle workflow step changes
  const handleStepChange = (step: WorkflowStepType) => {
    setActiveStep(step);
    if (step === 1) {
      setShowUploadModal(true);
    } else if (step === 2) {
      setActiveNav('数据标注');
    } else if (step === 3) {
      setActiveNav('数据标注');
    } else if (step === 4) {
      setShowExportModal(true);
    }
  };

  // Current active sample object & index
  const currentIndex = datasetList.findIndex(f => f.id === selectedFileId);
  const currentFile = (currentIndex !== -1 ? datasetList[currentIndex] : datasetList[0]) || INITIAL_DATASET[0];

  // Update a sample
  const handleUpdateSample = useCallback((updated: Partial<SignalSample>) => {
    setDatasetList(prev => prev.map(sample => {
      if (sample.id === currentFile.id) {
        return { ...sample, ...updated };
      }
      return sample;
    }));
  }, [currentFile.id]);

  // Navigation handlers
  const handleNextFile = useCallback(() => {
    if (currentIndex < datasetList.length - 1) {
      setSelectedFileId(datasetList[currentIndex + 1].id);
    }
  }, [currentIndex, datasetList]);

  const handlePrevFile = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedFileId(datasetList[currentIndex - 1].id);
    }
  }, [currentIndex, datasetList]);

  // Keyboard navigation & save shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          handleNextFile();
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextFile();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevFile();
      } else if (e.key === 'Escape') {
        setShowUploadModal(false);
        setShowExportModal(false);
        setShowBatchModal(false);
        setShowSettingsModal(false);
        setShowHelpModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextFile, handlePrevFile]);

  // Upload new samples
  const handleAddSamples = (newSamples: SignalSample[]) => {
    setDatasetList(prev => [...newSamples, ...prev]);
    if (newSamples.length > 0) {
      setSelectedFileId(newSamples[0].id);
    }
    setActiveStep(2); // Direct to step 2 preprocessing
  };

  // Delete sample
  const handleDeleteSample = (id: string) => {
    setDatasetList(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (selectedFileId === id && filtered.length > 0) {
        setSelectedFileId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Batch delete
  const handleBatchDelete = (ids: string[]) => {
    const set = new Set(ids);
    setDatasetList(prev => {
      const filtered = prev.filter(s => !set.has(s.id));
      if (filtered.length > 0 && set.has(selectedFileId)) {
        setSelectedFileId(filtered[0].id);
      }
      return filtered;
    });
    setCheckedFiles({});
  };

  // Batch update
  const handleBatchApply = (updates: {
    status?: AnnotationStatus;
    addTags?: string[];
    environment?: '室内' | '室外' | '城市' | '郊区' | '野外';
    antenna?: string;
  }) => {
    const checkedIdsList = Object.keys(checkedFiles).filter(id => checkedFiles[id]);
    const targetSet = checkedIdsList.length > 0 ? new Set(checkedIdsList) : null;

    setDatasetList(prev => prev.map(s => {
      if (targetSet && !targetSet.has(s.id)) return s;

      const newTags = updates.addTags 
        ? Array.from(new Set([...s.tags, ...updates.addTags]))
        : s.tags;

      return {
        ...s,
        ...(updates.status ? { status: updates.status } : {}),
        tags: newTags,
        ...(updates.environment ? { environment: updates.environment } : {}),
        ...(updates.antenna ? { antenna: updates.antenna } : {}),
        updatedAt: new Date().toLocaleTimeString(),
      };
    }));
  };

  // Reset to factory defaults
  const handleResetToDefaults = () => {
    setDatasetList(INITIAL_DATASET);
    setSelectedFileId(INITIAL_DATASET[0].id);
    setCheckedFiles({});
    localStorage.removeItem(STORAGE_KEY);
  };

  // Switch to specific sample from Search / Table
  const handleSelectSampleFromExternal = (id: string) => {
    setSelectedFileId(id);
    setActiveNav('数据标注');
    setActiveStep(3);
  };

  const completedCount = datasetList.filter(s => s.status === '已标注').length;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 text-slate-800 font-sans overflow-hidden select-none">
      
      {/* 1. TOP NAVBAR */}
      <Header
        activeStep={activeStep}
        setActiveStep={handleStepChange}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
        totalCount={datasetList.length}
        completedCount={completedCount}
      />

      {/* 2. MAIN APPLICATION WORKSPACE */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeNav={activeNav}
          setActiveNav={handleNavChange}
          datasetCount={datasetList.length}
        />

        {/* Dynamic Center Work Area depending on Active View */}
        {activeNav === '数据管理' ? (
          <DataManagementView
            datasetList={datasetList}
            onSelectSample={handleSelectSampleFromExternal}
            onDeleteSample={handleDeleteSample}
            onBatchDelete={handleBatchDelete}
            onOpenUpload={() => setShowUploadModal(true)}
          />
        ) : activeNav === '数据统计' ? (
          <DataStatisticsView datasetList={datasetList} />
        ) : activeNav === '标签体系' ? (
          <TagSystemView datasetList={datasetList} />
        ) : activeStep === 2 ? (
          <DataPreprocessingView
            datasetList={datasetList}
            onCompletePreprocessing={() => {
              setActiveStep(3);
              setActiveNav('数据标注');
            }}
          />
        ) : (
          /* Core Studio: File Browser + Visualization Stage + Annotation Inspector */
          <div className="flex flex-1 overflow-hidden">
            {/* 3. Left File Browser Panel */}
            <DatasetPanel
              datasetList={datasetList}
              selectedFileId={selectedFileId}
              setSelectedFileId={setSelectedFileId}
              checkedFiles={checkedFiles}
              setCheckedFiles={setCheckedFiles}
              onOpenUploadModal={() => setShowUploadModal(true)}
              onBatchTagModal={() => setShowBatchModal(true)}
              isCollapsed={isDatasetCollapsed}
              onToggleCollapse={() => setIsDatasetCollapsed(prev => !prev)}
            />

            {/* 4. Center High-Fidelity Signal DSP Viewport */}
            <VisualizationPanel
              currentFile={currentFile}
              currentIndex={currentIndex !== -1 ? currentIndex : 0}
              totalFiles={datasetList.length}
              onPrev={handlePrevFile}
              onNext={handleNextFile}
              isDatasetCollapsed={isDatasetCollapsed}
              onToggleDatasetCollapse={() => setIsDatasetCollapsed(prev => !prev)}
              isAnnotationCollapsed={isAnnotationCollapsed}
              onToggleAnnotationCollapse={() => setIsAnnotationCollapsed(prev => !prev)}
            />

            {/* 5. Right Annotation Forms & Parameter Inspector */}
            <AnnotationPanel
              currentFile={currentFile}
              onUpdateSample={handleUpdateSample}
              onSaveAndNext={handleNextFile}
              onPrev={handlePrevFile}
              canPrev={currentIndex > 0}
              onOpenBatchModal={() => setShowBatchModal(true)}
              isCollapsed={isAnnotationCollapsed}
              onToggleCollapse={() => setIsAnnotationCollapsed(prev => !prev)}
            />
          </div>
        )}

      </div>

      {/* MODALS */}
      <DataUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onAddSamples={handleAddSamples}
      />

      <DataExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        datasetList={datasetList}
      />

      <BatchProcessingModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        selectedIds={Object.keys(checkedFiles).filter(k => checkedFiles[k])}
        totalSamples={datasetList.length}
        onBatchApply={handleBatchApply}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onResetToDefaults={handleResetToDefaults}
      />

      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

    </div>
  );
}
