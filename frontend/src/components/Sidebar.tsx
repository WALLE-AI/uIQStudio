import React from 'react';
import { 
  Layers, Database, BarChart2, Tag, Info, 
  ExternalLink
} from 'lucide-react';
import { ActiveNavType } from '../types/radio';

interface SidebarProps {
  activeNav: ActiveNavType;
  setActiveNav: (nav: ActiveNavType) => void;
  datasetCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  setActiveNav,
  datasetCount,
}) => {
  const navItems: { label: ActiveNavType; icon: React.ElementType; badge?: string }[] = [
    { label: '数据标注', icon: Layers, badge: '核心' },
    { label: '数据管理', icon: Database, badge: `${datasetCount}` },
    { label: '数据统计', icon: BarChart2 },
    { label: '标签体系', icon: Tag },
    { label: '关于', icon: Info },
  ];

  return (
    <aside className="w-48 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 z-10 select-none">
      <div className="py-3 px-2 space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
          功能模块
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.label;
          return (
            <button
              key={item.label}
              onClick={() => setActiveNav(item.label)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    isActive
                      ? 'bg-blue-700/80 text-white'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Technical Spec Box */}
      <div className="p-3 m-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-400">
        <div className="flex items-center justify-between font-mono text-[10px] text-slate-300 mb-1">
          <span>IQSTUDIO-v2.4</span>
          <span className="text-emerald-400">ONLINE</span>
        </div>
        <div className="text-[10px] text-slate-400 leading-relaxed">
          I/Q Baseband ViT + Transformer Text Encoder 跨模态对齐标注
        </div>
        <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
          <span>IEEE 802.11 / SDR</span>
          <ExternalLink className="w-3 h-3 text-slate-500" />
        </div>
      </div>
    </aside>
  );
};
