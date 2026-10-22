import React from 'react';
import { Radio, Settings, BookOpen, User, CheckCircle2 } from 'lucide-react';
import { WorkflowStepType } from '../types/radio';

interface HeaderProps {
  activeStep: WorkflowStepType;
  setActiveStep: (step: WorkflowStepType) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  totalCount: number;
  completedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeStep,
  setActiveStep,
  onOpenSettings,
  onOpenHelp,
  totalCount,
  completedCount,
}) => {
  const steps: { num: WorkflowStepType; label: string }[] = [
    { num: 1, label: '数据上传' },
    { num: 2, label: '数据预处理' },
    { num: 3, label: '数据浏览与标注' },
    { num: 4, label: '数据导出' },
  ];

  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-20 shrink-0 shadow-xs">
      {/* Brand Zone */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shadow-xs">
          <Radio className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base text-slate-900 tracking-tight">IQStudio</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono tracking-tight leading-none hidden sm:block">
            IQ Baseband + Text Multimodal Annotation Studio
          </p>
        </div>
      </div>

      {/* Step Stepper Navigation */}
      <nav className="flex items-center space-x-1.5 md:space-x-3 text-xs font-medium">
        {steps.map((step, idx) => {
          const isActive = activeStep === step.num;
          const isPast = activeStep > step.num;
          return (
            <React.Fragment key={step.num}>
              {idx > 0 && (
                <div
                  className={`w-4 md:w-8 h-[2px] transition-colors ${
                    isPast ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              )}
              <button
                onClick={() => setActiveStep(step.num)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full transition-all text-xs ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : isPast
                    ? 'text-blue-600 hover:bg-blue-50'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono ${
                    isActive
                      ? 'bg-white text-blue-600 font-bold'
                      : isPast
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isPast ? '✓' : step.num}
                </span>
                <span className="hidden sm:inline whitespace-nowrap">{step.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Actions & User Info */}
      <div className="flex items-center space-x-2.5 text-xs">
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 bg-slate-50 rounded-md border border-slate-200 text-[11px] text-slate-500 font-mono tabular-nums">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>进度 {completionPct}% ({completedCount}/{totalCount})</span>
        </div>

        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          title="系统设置"
        >
          <Settings className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">设置</span>
        </button>

        <button
          onClick={onOpenHelp}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          title="标注手册与指南"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">使用帮助</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-200" />

        <div className="flex items-center space-x-1.5 pl-1">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-slate-700 hidden sm:inline text-xs">admin</span>
        </div>
      </div>
    </header>
  );
};
