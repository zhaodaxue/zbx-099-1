import Scene3D from '@/components/Scene3D';
import ControlPanel from '@/components/ControlPanel';
import PathProfile from '@/components/PathProfile';

export default function Home() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-slate-950 flex flex-col">
      <div className="flex-1 min-h-0 relative">
        <Scene3D />
        <ControlPanel />

        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-700/50 px-4 py-3 text-xs text-slate-400 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span>土球（含重心）</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span>目标树坑</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-500/60"></span>
            <span>障碍物（半透明）</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400"></span>
            <span>吊点（可选）</span>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 h-[190px] px-4 py-3 z-10" style={{ marginTop: 0 }}>
        <PathProfile />
      </div>
    </div>
  );
}
