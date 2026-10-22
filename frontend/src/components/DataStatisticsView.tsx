import React from 'react';
import { 
  BarChart2, PieChart, Activity, TrendingUp, CheckCircle2, 
  Layers, Radio, Cpu
} from 'lucide-react';
import { SignalSample } from '../types/radio';

interface DataStatisticsViewProps {
  datasetList: SignalSample[];
}

export const DataStatisticsView: React.FC<DataStatisticsViewProps> = ({ datasetList }) => {
  const total = datasetList.length;
  const labeled = datasetList.filter(s => s.status === '已标注').length;
  const pending = total - labeled;
  const completionRate = total > 0 ? ((labeled / total) * 100).toFixed(1) : '0';

  // Average SNR
  const avgSnr = total > 0 
    ? (datasetList.reduce((acc, cur) => acc + cur.snr, 0) / total).toFixed(1) 
    : '0';

  // Modulation count mapping
  const modCounts: Record<string, number> = {};
  datasetList.forEach(s => {
    modCounts[s.mod] = (modCounts[s.mod] || 0) + 1;
  });

  // Type count mapping
  const typeCounts: Record<string, number> = {};
  datasetList.forEach(s => {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  });

  // Environment mapping
  const envCounts: Record<string, number> = {};
  datasetList.forEach(s => {
    envCounts[s.environment] = (envCounts[s.environment] || 0) + 1;
  });

  return (
    <div className="flex-1 bg-slate-50 flex flex-col p-6 overflow-y-auto select-none space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-blue-600" />
          <span>IQStudio 数据集统计与质量监控看板</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          多模态配对样本分布、物理层信噪比直方图、调制类型分布与标注质检进度
        </p>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: '总采集样本', val: `${total}`, unit: '条', desc: 'IQ基带序列' },
          { label: '已完成标注', val: `${labeled}`, unit: '条', desc: '文本图谱配对' },
          { label: '标注覆盖率', val: `${completionRate}%`, unit: '', desc: '完成进度' },
          { label: '平均信噪比 (SNR)', val: `${avgSnr}`, unit: 'dB', desc: '信号质量' },
          { label: '调制样式种类', val: `${Object.keys(modCounts).length}`, unit: '类', desc: '物理层覆盖' },
          { label: '设备实体种类', val: `${Object.keys(typeCounts).length}`, unit: '类', desc: '多源异构设备' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-slate-500 font-medium">{kpi.label}</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {kpi.val} <span className="text-xs font-normal text-slate-400">{kpi.unit}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{kpi.desc}</div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Chart 1: Modulation Distribution Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">调制样式分布 (Modulation Schemes)</span>
            <span className="text-[11px] font-mono text-slate-400">{Object.keys(modCounts).length} 种调制</span>
          </div>

          <div className="space-y-3">
            {Object.entries(modCounts).map(([modName, count]) => {
              const pct = ((count / total) * 100).toFixed(1);
              return (
                <div key={modName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-slate-700 font-medium">{modName}</span>
                    <span className="font-mono text-slate-500">{count} 条 ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Device Categories Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">信号辐射源类型分布 (Signal Categories)</span>
            <span className="text-[11px] font-mono text-slate-400">无人机/民航/IoT</span>
          </div>

          <div className="space-y-3">
            {Object.entries(typeCounts).map(([typeName, count]) => {
              const pct = ((count / total) * 100).toFixed(1);
              return (
                <div key={typeName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{typeName}</span>
                    <span className="font-mono text-slate-500">{count} 条 ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 3: SNR Distribution Histogram */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">信噪比 (SNR) 区间直方图</span>
            <span className="text-[11px] font-mono text-slate-400">10 dB ~ 35 dB</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center pt-2">
            {[
              { range: '10-15 dB', count: datasetList.filter(s => s.snr >= 10 && s.snr < 15).length, color: 'bg-amber-400' },
              { range: '15-20 dB', count: datasetList.filter(s => s.snr >= 15 && s.snr < 20).length, color: 'bg-blue-400' },
              { range: '20-25 dB', count: datasetList.filter(s => s.snr >= 20 && s.snr < 25).length, color: 'bg-blue-600' },
              { range: '25-35 dB', count: datasetList.filter(s => s.snr >= 25).length, color: 'bg-emerald-500' },
            ].map((bin, i) => {
              const heightPct = Math.max(15, (bin.count / total) * 100);
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className="h-32 w-full flex items-end justify-center bg-slate-50 rounded-lg p-2">
                    <div
                      className={`${bin.color} w-10 rounded-t transition-all duration-500 flex items-center justify-center text-[10px] text-white font-mono font-bold`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {bin.count}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 mt-2">{bin.range}</div>
                  <div className="text-[10px] text-slate-400">{bin.count} 样本</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 4: Environment & Propagation Conditions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">采集场景与视距条件分布</span>
            <span className="text-[11px] font-mono text-slate-400">室内/室外/城市/野外</span>
          </div>

          <div className="space-y-3">
            {Object.entries(envCounts).map(([envName, count]) => {
              const pct = ((count / total) * 100).toFixed(1);
              return (
                <div key={envName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{envName}环境</span>
                    <span className="font-mono text-slate-500">{count} 条 ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-600">
            <span>视距传输 (LOS): <strong className="text-slate-900">{datasetList.filter(s => s.losCondition.includes('LOS') && !s.losCondition.includes('NLOS')).length}</strong> 条</span>
            <span>非视距传输 (NLOS): <strong className="text-slate-900">{datasetList.filter(s => s.losCondition.includes('NLOS')).length}</strong> 条</span>
          </div>
        </div>

      </div>

    </div>
  );
};
