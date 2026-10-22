import React, { useState } from 'react';
import { 
  Tag as TagIcon, Plus, Trash2, Edit2, Check, Hash, 
  Layers, Search, ShieldCheck
} from 'lucide-react';
import { SignalSample } from '../types/radio';
import { PRESET_TAG_CATEGORIES } from '../data/mockSignals';

interface TagSystemViewProps {
  datasetList: SignalSample[];
}

export const TagSystemView: React.FC<TagSystemViewProps> = ({ datasetList }) => {
  const [categories, setCategories] = useState<Record<string, string[]>>(PRESET_TAG_CATEGORIES);
  const [newTagInput, setNewTagInput] = useState<Record<string, string>>({});
  const [activeCategoryInput, setActiveCategoryInput] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [searchTag, setSearchTag] = useState('');

  // Count tag occurrences in current dataset
  const tagUsageMap: Record<string, number> = {};
  datasetList.forEach(sample => {
    sample.tags.forEach(t => {
      tagUsageMap[t] = (tagUsageMap[t] || 0) + 1;
    });
  });

  const handleAddTagToCategory = (catName: string) => {
    const val = (newTagInput[catName] || '').trim();
    if (val && !categories[catName]?.includes(val)) {
      setCategories(prev => ({
        ...prev,
        [catName]: [...prev[catName], val]
      }));
      setNewTagInput(prev => ({ ...prev, [catName]: '' }));
    }
  };

  const handleRemoveTag = (catName: string, tagToRemove: string) => {
    setCategories(prev => ({
      ...prev,
      [catName]: prev[catName].filter(t => t !== tagToRemove)
    }));
  };

  const handleAddCategory = () => {
    const trimmed = activeCategoryInput.trim();
    if (trimmed && !categories[trimmed]) {
      setCategories(prev => ({ ...prev, [trimmed]: [] }));
      setActiveCategoryInput('');
      setShowAddCategory(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col p-6 overflow-y-auto select-none space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <TagIcon className="w-5 h-5 text-blue-600" />
            <span>IQStudio 射频信号分层标签本体体系 (Taxonomy & Ontology)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            定义用于对比学习与多标签分类的无线电信号多粒度语义标签词表与知识图谱
          </p>
        </div>

        <button
          onClick={() => setShowAddCategory(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>新建标签维度分类</span>
        </button>
      </div>

      {/* Add Category Input */}
      {showAddCategory && (
        <div className="p-3 bg-white border border-blue-200 rounded-xl shadow-xs flex items-center space-x-2">
          <input
            type="text"
            autoFocus
            value={activeCategoryInput}
            onChange={(e) => setActiveCategoryInput(e.target.value)}
            placeholder="输入分类名称 (如：信道传播特征、天线极化方式)..."
            className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAddCategory}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium cursor-pointer"
          >
            确认创建
          </button>
          <button
            onClick={() => setShowAddCategory(false)}
            className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-xs cursor-pointer"
          >
            取消
          </button>
        </div>
      )}

      {/* Categories Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(categories).map(([catName, tagList]) => (
          <div key={catName} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-xs text-slate-800">{catName}</span>
                <span className="text-[10px] text-slate-400 font-mono">({tagList.length} 个标签)</span>
              </div>
            </div>

            {/* Tag List */}
            <div className="flex flex-wrap gap-2 min-h-[48px]">
              {tagList.map((tag) => {
                const count = tagUsageMap[tag] || 0;
                return (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-100 text-slate-700 font-medium group hover:bg-slate-200 transition"
                  >
                    <span>{tag}</span>
                    {count > 0 && (
                      <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1 py-0.2 rounded">
                        {count}
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveTag(catName, tag)}
                      className="text-slate-400 hover:text-red-500 ml-1 cursor-pointer"
                      title="删除标签"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>

            {/* Inline add tag input */}
            <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
              <input
                type="text"
                value={newTagInput[catName] || ''}
                onChange={(e) => setNewTagInput({ ...newTagInput, [catName]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTagToCategory(catName)}
                placeholder={`在「${catName}」中新增标签...`}
                className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => handleAddTagToCategory(catName)}
                className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition cursor-pointer shrink-0"
              >
                添加
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
