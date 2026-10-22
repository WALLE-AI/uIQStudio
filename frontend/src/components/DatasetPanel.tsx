import React, { useState } from 'react';
import { 
  Plus, Search, Filter, HardDrive, ChevronRight, ChevronLeft, 
  CheckSquare, Square, PanelLeftClose, PanelLeftOpen, Layers
} from 'lucide-react';
import { SignalSample } from '../types/radio';

interface DatasetPanelProps {
  datasetList: SignalSample[];
  selectedFileId: string;
  setSelectedFileId: (id: string) => void;
  checkedFiles: Record<string, boolean>;
  setCheckedFiles: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onOpenUploadModal: () => void;
  onBatchTagModal: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const DatasetPanel: React.FC<DatasetPanelProps> = ({
  datasetList,
  selectedFileId,
  setSelectedFileId,
  checkedFiles,
  setCheckedFiles,
  onOpenUploadModal,
  onBatchTagModal,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '待标注' | '已标注'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtered samples
  const filteredFiles = datasetList.filter((f) => {
    const matchesSearch = 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.device.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.mod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    const matchesType = typeFilter === 'all' || f.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / itemsPerPage));
  const paginatedFiles = filteredFiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const completedCount = datasetList.filter((f) => f.status === '已标注').length;
  const progressPercent = datasetList.length > 0 
    ? ((completedCount / datasetList.length) * 100).toFixed(1)
    : '0.0';

  const selectedCount = Object.values(checkedFiles).filter(Boolean).length;
  const isAllChecked = paginatedFiles.length > 0 && paginatedFiles.every(f => checkedFiles[f.id]);

  const toggleSelectAll = () => {
    const newChecked = { ...checkedFiles };
    if (isAllChecked) {
      paginatedFiles.forEach(f => { delete newChecked[f.id]; });
    } else {
      paginatedFiles.forEach(f => { newChecked[f.id] = true; });
    }
    setCheckedFiles(newChecked);
  };

  // If collapsed: render ultra-compact vertical strip
  if (isCollapsed) {
    return (
      <aside className="w-12 bg-white border-r border-slate-200 flex flex-col items-center py-3 select-none shrink-0 justify-between">
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="展开样本目录 (Ctrl+B)"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
          
          <button
            onClick={onOpenUploadModal}
            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition cursor-pointer"
            title="上传新样本"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-slate-200" />

          <div 
            onClick={onToggleCollapse}
            className="text-[11px] font-mono font-bold text-slate-500 rotate-90 whitespace-nowrap cursor-pointer tracking-wider hover:text-blue-600 transition mt-6"
          >
            样本库 ({datasetList.length})
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <div className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded">
            {progressPercent}%
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
            title="展开"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // Expanded View: compact width w-64 (256px)
  return (
    <section className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden select-none transition-all duration-200">
      
      {/* Dataset Header Card */}
      <div className="p-2.5 border-b border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-slate-800">样本目录</span>
            <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
              {datasetList.length}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button 
              onClick={onOpenUploadModal}
              className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-xs cursor-pointer"
              title="上传数据"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition cursor-pointer"
                title="收起侧栏，释放画布空间"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Compact Search */}
        <div className="relative mt-1">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索样本、设备或调制..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px]"
          />
        </div>

        {/* Quick Filter Pill Tabs */}
        <div className="flex items-center justify-between gap-1 mt-1.5 text-[10px]">
          <div className="flex items-center gap-1">
            {(['all', '待标注', '已标注'] as const).map(st => (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                className={`px-1.5 py-0.5 rounded transition ${
                  statusFilter === st ? 'bg-slate-800 text-white font-medium' : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {st === 'all' ? '全部' : st}
              </button>
            ))}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px] text-slate-600 outline-none"
          >
            <option value="all">类型</option>
            <option value="无人机 (UAV)">无人机</option>
            <option value="民航客机">民航</option>
            <option value="Wi-Fi设备">Wi-Fi</option>
            <option value="LoRa终端">LoRa</option>
            <option value="SDR信号源">SDR</option>
            <option value="雷达">雷达</option>
          </select>
        </div>
      </div>

      {/* Batch Banner if checked */}
      {selectedCount > 0 && (
        <div className="px-2.5 py-1 bg-blue-50 border-b border-blue-200 flex items-center justify-between text-[11px] text-blue-700">
          <span>已选 {selectedCount} 项</span>
          <button
            onClick={onBatchTagModal}
            className="text-[11px] font-semibold underline hover:text-blue-900 cursor-pointer"
          >
            批量打标
          </button>
        </div>
      )}

      {/* Table Subheader */}
      <div className="px-2.5 py-1 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-[10px] font-semibold text-slate-500">
        <div className="flex items-center space-x-1.5">
          <button onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-800">
            {isAllChecked ? (
              <CheckSquare className="w-3 h-3 text-blue-600" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>
          <span>样本名称</span>
        </div>
        <span>状态 / 频点</span>
      </div>

      {/* Scrollable File List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {paginatedFiles.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-slate-400">
            暂无匹配信号样本
          </div>
        ) : (
          paginatedFiles.map((file) => {
            const isSelected = selectedFileId === file.id;
            const isChecked = !!checkedFiles[file.id];
            return (
              <div
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className={`px-2.5 py-2 flex items-center justify-between text-xs cursor-pointer transition ${
                  isSelected ? 'bg-blue-50/90 font-medium' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2 overflow-hidden pr-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCheckedFiles(prev => ({ ...prev, [file.id]: !prev[file.id] }));
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-3 h-3 text-blue-600" />
                    ) : (
                      <Square className="w-3 h-3" />
                    )}
                  </button>

                  <div className="overflow-hidden">
                    <div className={`truncate font-mono text-[11px] ${isSelected ? 'text-blue-700 font-bold' : 'text-slate-800'}`}>
                      {file.name}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5 truncate">
                      <span>{file.device}</span>
                      <span>·</span>
                      <span className="font-mono">{file.mod.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-1 py-0.2 rounded text-[9px] font-medium ${
                      file.status === '已标注'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {file.status}
                  </span>
                  <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                    {file.freq >= 1000 ? `${(file.freq / 1000).toFixed(1)}G` : `${file.freq}M`}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Strip */}
      <div className="p-1.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono text-slate-600">
          {currentPage}/{totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-40 cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress Footer */}
      <div className="p-2 border-t border-slate-200 bg-white">
        <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
          <span>标注进度</span>
          <span className="text-blue-600 font-bold font-mono">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
};
