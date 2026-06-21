import { useMemo } from 'react';
import { TreeDeciduous, Wind, Download, Play, AlertTriangle, CheckCircle, XCircle, Gauge } from 'lucide-react';
import { useAppStore, getCurrentTree } from '@/store/useAppStore';
import { getLiftPointById } from '@/utils/liftingMath';
import { cn } from '@/lib/utils';

export default function ControlPanel() {
  const trees = useAppStore(s => s.trees);
  const currentTreeId = useAppStore(s => s.currentTreeId);
  const selectedLiftPoints = useAppStore(s => s.selectedLiftPoints);
  const swingCm = useAppStore(s => s.swingCm);
  const combinations = useAppStore(s => s.combinations);
  const isAnimating = useAppStore(s => s.isAnimating);
  const setCurrentTree = useAppStore(s => s.setCurrentTree);
  const toggleLiftPoint = useAppStore(s => s.toggleLiftPoint);
  const setSwingCm = useAppStore(s => s.setSwingCm);
  const setIsAnimating = useAppStore(s => s.setIsAnimating);
  const canvasRef = useAppStore(s => s.canvasRef);

  const currentTree = getCurrentTree();

  const currentCombination = useMemo(() => {
    if (!currentTree || selectedLiftPoints.length !== 2) return null;
    const [a, b] = selectedLiftPoints;
    return combinations.find(
      c => (c.pointA === a && c.pointB === b) || (c.pointA === b && c.pointB === a)
    );
  }, [combinations, selectedLiftPoints, currentTree]);

  const handleExportPNG = () => {
    if (!canvasRef) return;
    try {
      const dataUrl = canvasRef.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `吊装方案_${currentTree?.name ?? '方案'}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  return (
    <div data-control-panel className="absolute top-0 right-0 h-full w-96 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700/50 overflow-y-auto z-20">
      <div className="p-5 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/20">
            <TreeDeciduous className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">古树移栽吊装路径复盘</h1>
            <p className="text-xs text-slate-400">Lifting Path Review System</p>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2.5">
            <TreeDeciduous className="w-4 h-4 text-emerald-400" />
            选择古树
          </label>
          <div className="space-y-2">
            {trees.map(tree => {
              const active = tree.id === currentTreeId;
              return (
                <button
                  key={tree.id}
                  onClick={() => setCurrentTree(tree.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl border transition-all duration-200',
                    active
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  )}
                >
                  <div className="font-medium text-sm">{tree.name}</div>
                  <div className="text-xs mt-1 opacity-70">
                    土球 {tree.soilBall.diameter}m · {tree.soilBall.weight}t · {tree.liftPoints.length} 吊点
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {currentTree && (
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2.5">
              <Gauge className="w-4 h-4 text-amber-400" />
              选择吊点（已选 {selectedLiftPoints.length}/2）
            </label>
            <div className="grid grid-cols-2 gap-2">
              {currentTree.liftPoints.map(lp => {
                const selected = selectedLiftPoints.includes(lp.id);
                return (
                  <button
                    key={lp.id}
                    onClick={() => toggleLiftPoint(lp.id)}
                    className={cn(
                      'text-left px-3 py-2.5 rounded-lg border transition-all duration-200 text-xs',
                      selected
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:border-slate-600 hover:text-slate-300'
                    )}
                  >
                    <div className="font-semibold mb-0.5">{lp.name}</div>
                    <div className="opacity-80">额定 {lp.ratedTonnage} t</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2.5">
            <Wind className="w-4 h-4 text-sky-400" />
            摆动幅度（风载模拟）
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={swingCm}
              onChange={e => setSwingCm(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">0 cm</span>
              <span className="text-sky-400 font-bold text-sm">{swingCm} cm</span>
              <span className="text-slate-500">30 cm</span>
            </div>
          </div>
        </div>

        {currentCombination && currentTree && (
          <div data-eval-section className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-3">
            <div className="text-sm font-semibold text-slate-200">当前方案评估</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-400 mb-1">预估峰值吨位</div>
                <div className={cn(
                  'text-lg font-bold',
                  currentCombination.tonnageInsufficient ? 'text-red-400' : 'text-emerald-400'
                )}>
                  {currentCombination.peakTonnage} t
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-1">碰撞检测</div>
                <div className="text-lg font-bold flex items-center gap-1.5">
                  {currentCombination.hasCollision ? (
                    <>
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400">相交</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-400">安全</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {(currentCombination.hasCollision || currentCombination.tonnageInsufficient) && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  {currentCombination.tonnageInsufficient && '吊点额定吨位不足。'}
                  {currentCombination.hasCollision && ' 需调整吊点或清障。'}
                </span>
              </div>
            )}
            <button
              onClick={() => setIsAnimating(true)}
              disabled={isAnimating}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold hover:from-sky-400 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isAnimating ? '吊装中…' : '播放吊装动画'}
            </button>
          </div>
        )}

        {currentTree && (
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2.5">
              <Gauge className="w-4 h-4 text-violet-400" />
              吊点组合吨位对比
            </div>
            <div className="rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-800/80">
                  <tr className="text-slate-400">
                    <th className="text-left px-3 py-2 font-medium">组合</th>
                    <th className="text-right px-3 py-2 font-medium">峰值(t)</th>
                    <th className="text-center px-3 py-2 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {combinations.map((c, idx) => {
                    const lpA = getLiftPointById(currentTree, c.pointA);
                    const lpB = getLiftPointById(currentTree, c.pointB);
                    const isSelected = selectedLiftPoints.length === 2 &&
                      ((c.pointA === selectedLiftPoints[0] && c.pointB === selectedLiftPoints[1]) ||
                       (c.pointA === selectedLiftPoints[1] && c.pointB === selectedLiftPoints[0]));
                    const isBad = c.tonnageInsufficient || c.hasCollision;
                    return (
                      <tr
                        key={idx}
                        className={cn(
                          'border-t border-slate-700/40 transition-colors',
                          isSelected ? 'bg-emerald-500/10' : 'hover:bg-slate-800/40'
                        )}
                      >
                        <td className="px-3 py-2 text-slate-300">
                          <div className="font-medium">{lpA?.name?.slice(0, 6)}</div>
                          <div className="text-slate-500">+ {lpB?.name?.slice(0, 6)}</div>
                        </td>
                        <td className={cn(
                          'px-3 py-2 text-right font-bold tabular-nums',
                          c.tonnageInsufficient ? 'text-red-400' : 'text-slate-200'
                        )}>
                          {c.peakTonnage}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isBad ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              风险
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle className="w-3 h-3" />
                              可行
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={handleExportPNG}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
        >
          <Download className="w-4 h-4" />
          导出当前方案 PNG 截图
        </button>

        <div className="pt-2 text-[10px] text-slate-600 leading-relaxed">
          操作提示：鼠标左键旋转视角，右键平移，滚轮缩放。选择两个吊点查看吊索与吨位计算。
        </div>
      </div>
    </div>
  );
}
