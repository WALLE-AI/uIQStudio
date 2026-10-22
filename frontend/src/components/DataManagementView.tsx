import React, { useState } from 'react';
import { 
  Database, Search, Filter, Trash2, CheckCircle2, AlertCircle, 
  Eye, Download, Plus, ArrowUpDown, ChevronLeft, ChevronRight, HardDrive
} from 'lucide-react';
import { SignalSample, AnnotationStatus } from '../types/radio';

interface DataManagementViewProps {
  datasetList: SignalSample[];
  onSelectSample: (id: string) => void;
  onDeleteSample: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onOpenUpload: () => void;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({
  datasetList,
  onSelectSample,
  onDeleteSample,
  onBatchDelete,
  onOpenUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AnnotationStatus>('all');
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<'name' | 'freq' | 'snr' | 'device'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filtered = datasetList.filter(s => {
    const matchSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.device.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.individualId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortBy === 'device') cmp = a.device.localeCompare(b.device);
    else if (sortBy === 'freq') cmp = a.freq - b.freq;
    else if (sortBy === 'snr') cmp = a.snr - b.snr;
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const selectedCount = Object.values(checkedIds).filter(Boolean).length;
  const isAllChecked = sorted.length > 0 && sorted.every(s => checkedIds[s.id]);

  const toggleAll = () => {
    const newChecked = { ...checkedIds };
    if (isAllChecked) {
      sorted.forEach(s => { delete newChecked[s.id]; });
    } else {
      sorted.forEach(s => { newChecked[s.id] = true; });
    }
    setCheckedIds(newChecked);
  };

  const handleBatchDeleteClick = () => {
    const toDelete = Object.keys(checkedIds).filter(id => checkedIds[id]);
    if (toDelete.length > 0) {
      onBatchDelete(toDelete);
      setCheckedIds({});
    }
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col p-6 overflow-y-auto select-none space-y-5">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-600" />
            <span>IQStudio 原始数据集管理仓库</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            浏览所有 IQ 基带切片序列、质量元数据、SEI 个体指纹标签与标注状态
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {selectedCount > 0 && (
            <button
              onClick={handleBatchDeleteClick}
              className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition flex items-center space-x-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除选中 ({selectedCount})</span>
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-1 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>上传新样本</span>
          </button>
        </div>
      </div>

      {/* Filter Bar Card */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索文件名、设备、个体ID或调制..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-1 text-xs">
            {(['all', '待标注', '已标注'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? '全部状态' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="text-slate-500 font-mono text-[11px]">
          共显示 <strong className="text-slate-800 font-bold">{sorted.length}</strong> / {datasetList.length} 条记录
        </div>
      </div>

      {/* Dataset Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={toggleAll}
                    className="rounded border-slate-300 text-blue-600"
                  />
                </th>
                <th className="py-3 px-3 cursor-pointer" onClick={() => toggleSort('name')}>
                  <div className="flex items-center space-x-1">
                    <span>文件名</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer" onClick={() => toggleSort('device')}>
                  <div className="flex items-center space-x-1">
                    <span>发射机设备 / 个体ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer" onClick={() => toggleSort('freq')}>
                  <div className="flex items-center space-x-1">
                    <span>中心频点 / 带宽</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">调制体制</th>
                <th className="py-3 px-3 cursor-pointer" onClick={() => toggleSort('snr')}>
                  <div className="flex items-center space-x-1">
                    <span>SNR / 距离</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">状态</th>
                <th className="py-3 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    暂无匹配的数据集样本
                  </td>
                </tr>
              ) : (
                sorted.map((sample) => {
                  const isChecked = !!checkedIds[sample.id];
                  return (
                    <tr
                      key={sample.id}
                      className={`hover:bg-slate-50 transition ${
                        isChecked ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setCheckedIds(prev => ({ ...prev, [sample.id]: e.target.checked }));
                          }}
                          className="rounded border-slate-300 text-blue-600"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-800 text-[11px]">{sample.name}</div>
                        <div className="text-[10px] text-slate-400">{sample.fileSize} · {sample.format}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{sample.device}</div>
                        <div className="text-[10px] font-mono text-blue-600">{sample.individualId} ({sample.type})</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <div>{sample.freq >= 1000 ? `${(sample.freq/1000).toFixed(3)} GHz` : `${sample.freq} MHz`}</div>
                        <div className="text-[10px] text-slate-400">BW: {sample.bw} MHz</div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px]">
                          {sample.mod}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="text-emerald-600 font-semibold">{sample.snr} dB</span>
                        <div className="text-[10px] text-slate-400">{sample.distance} m · {sample.environment}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            sample.status === '已标注'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {sample.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onSelectSample(sample.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                            title="打开标注工作室"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteSample(sample.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
