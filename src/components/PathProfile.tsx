import { useMemo } from 'react';
import { AlertTriangle, Activity, Layers } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { SegmentStatus, PathSegment, ObstacleProjection } from '@/types';

const STATUS_COLORS: Record<SegmentStatus, { fill: string; stroke: string; label: string }> = {
  safe: { fill: '#22c55e', stroke: '#16a34a', label: '安全' },
  warning: { fill: '#f59e0b', stroke: '#d97706', label: '擦边预警' },
  collision: { fill: '#ef4444', stroke: '#dc2626', label: '相交' },
};

const OBSTACLE_STATUS_OPACITY: Record<SegmentStatus, number> = {
  safe: 0.35,
  warning: 0.55,
  collision: 0.75,
};

export default function PathProfile() {
  const profileData = useAppStore(s => s.profileData);
  const selectedLiftPoints = useAppStore(s => s.selectedLiftPoints);
  const animationProgress = useAppStore(s => s.animationProgress);
  const selectedSegmentIndex = useAppStore(s => s.selectedSegmentIndex);
  const setSelectedSegmentIndex = useAppStore(s => s.setSelectedSegmentIndex);
  const swingCm = useAppStore(s => s.swingCm);

  const viewport = useMemo(() => {
    if (!profileData) {
      return {
        width: 1000,
        height: 300,
        padding: { left: 55, right: 20, top: 20, bottom: 35 },
        innerWidth: 925,
        innerHeight: 245,
      };
    }
    const width = 1000;
    const height = 300;
    const padding = { left: 55, right: 20, top: 20, bottom: 35 };
    return {
      width,
      height,
      padding,
      innerWidth: width - padding.left - padding.right,
      innerHeight: height - padding.top - padding.bottom,
    };
  }, [profileData]);

  const scales = useMemo(() => {
    if (!profileData) return null;
    const { innerWidth, innerHeight } = viewport;
    const xScale = (dist: number) => (dist / profileData.totalDistance) * innerWidth;
    const yScale = (h: number) => innerHeight - (h / profileData.maxHeight) * innerHeight;
    return { xScale, yScale };
  }, [profileData, viewport]);

  const xTicks = useMemo(() => {
    if (!profileData) return [];
    const ticks: number[] = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      ticks.push((profileData.totalDistance / count) * i);
    }
    return ticks;
  }, [profileData]);

  const yTicks = useMemo(() => {
    if (!profileData) return [];
    const ticks: number[] = [];
    const step = Math.ceil(profileData.maxHeight / 5);
    for (let i = 0; i <= 5; i++) {
      ticks.push(step * i);
    }
    return ticks;
  }, [profileData]);

  if (!profileData || selectedLiftPoints.length !== 2) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/60 rounded-2xl border border-slate-700/50 px-6 py-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80">
            <Activity className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-300">吊装路径剖面复盘</h2>
            <p className="text-xs text-slate-500 mt-0.5">Path Profile Review</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-800/40 rounded-lg px-4 py-3 border border-slate-700/30">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>请选择两个吊点以查看抬升曲线与障碍区间</span>
        </div>
      </div>
    );
  }

  if (!scales) return null;

  const { padding } = viewport;
  const { xScale, yScale } = scales;

  const renderSegment = (seg: PathSegment) => {
    const colors = STATUS_COLORS[seg.status];
    const x1 = padding.left + xScale(seg.startDistance);
    const y1 = padding.top + yScale(seg.startHeight);
    const x2 = padding.left + xScale(seg.endDistance);
    const y2 = padding.top + yScale(seg.endHeight);
    const isSelected = selectedSegmentIndex === seg.segmentIndex;

    return (
      <g key={seg.segmentIndex}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={colors.stroke}
          strokeWidth={isSelected ? 6 : 3.5}
          strokeLinecap="round"
          className={cn(
            'cursor-pointer transition-all duration-150',
            isSelected ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'hover:opacity-80'
          )}
          onClick={() => {
            setSelectedSegmentIndex(isSelected ? null : seg.segmentIndex);
            const panel = document.querySelector('[data-control-panel]');
            if (panel) {
              const evalSection = panel.querySelector('[data-eval-section]');
              if (evalSection) {
                evalSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }}
        />
        {isSelected && (
          <>
            <circle cx={x1} cy={y1} r={4.5} fill={colors.fill} stroke="#fff" strokeWidth={2} />
            <circle cx={x2} cy={y2} r={4.5} fill={colors.fill} stroke="#fff" strokeWidth={2} />
          </>
        )}
      </g>
    );
  };

  const renderObstacleProjection = (proj: ObstacleProjection) => {
    const colors = STATUS_COLORS[proj.status];
    const opacity = OBSTACLE_STATUS_OPACITY[proj.status];
    const x = padding.left + xScale(proj.startDistance);
    const y = padding.top + yScale(Math.min(proj.topHeight, profileData.maxHeight));
    const w = xScale(proj.endDistance) - xScale(proj.startDistance);
    const h = yScale(Math.max(proj.bottomHeight, 0)) - yScale(Math.min(proj.topHeight, profileData.maxHeight));

    return (
      <g key={proj.obstacleId}>
        <rect
          x={x}
          y={y}
          width={Math.max(w, 2)}
          height={Math.max(h, 1)}
          fill={colors.fill}
          opacity={opacity}
          rx={2}
          stroke={colors.stroke}
          strokeWidth={1}
          strokeDasharray="3 2"
        />
        <text
          x={x + w / 2}
          y={y - 5}
          fill={colors.fill}
          fontSize={10}
          fontWeight={600}
          textAnchor="middle"
          className="select-none pointer-events-none"
        >
          {proj.obstacleName}
        </text>
      </g>
    );
  };

  const progressDistance = animationProgress * profileData.totalDistance;
  const progressX = padding.left + xScale(progressDistance);
  const progressSeg = profileData.segments.find(
    s => s.startProgress <= animationProgress && s.endProgress > animationProgress
  );
  const progressHeight = progressSeg
    ? progressSeg.startHeight + (progressSeg.endHeight - progressSeg.startHeight) *
      ((animationProgress - progressSeg.startProgress) / (progressSeg.endProgress - progressSeg.startProgress))
    : profileData.startPos.y;
  const progressY = padding.top + yScale(progressHeight);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 px-5 py-3.5 overflow-hidden">
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/15">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-200">吊装路径剖面复盘</h2>
            <p className="text-[10px] text-slate-500">横轴：行进距离(m) · 纵轴：土球中心离地高度(m)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {swingCm > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-sky-400 bg-sky-500/10 px-2 py-1 rounded-md border border-sky-500/20">
              <Layers className="w-3 h-3" />
              <span>风载 +{swingCm}cm</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {(['safe', 'warning', 'collision'] as SegmentStatus[]).map(status => (
              <div key={status} className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: STATUS_COLORS[status].fill }}
                />
                <span className="text-[10px] text-slate-400">{STATUS_COLORS[status].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <svg
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="safeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
            </linearGradient>
            <clipPath id="chartArea">
              <rect x={padding.left} y={padding.top} width={viewport.innerWidth} height={viewport.innerHeight} />
            </clipPath>
          </defs>

          {yTicks.map(tick => {
            const y = padding.top + yScale(tick);
            return (
              <g key={`yt-${tick}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={viewport.width - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  opacity={0.5}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  fill="#94a3b8"
                  fontSize={10}
                  textAnchor="end"
                  className="select-none"
                >
                  {tick.toFixed(0)}
                </text>
              </g>
            );
          })}

          {xTicks.map(tick => {
            const x = padding.left + xScale(tick);
            return (
              <g key={`xt-${tick}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={viewport.height - padding.bottom}
                  stroke="#334155"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  opacity={0.5}
                />
                <text
                  x={x}
                  y={viewport.height - padding.bottom + 18}
                  fill="#94a3b8"
                  fontSize={10}
                  textAnchor="middle"
                  className="select-none"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          <line
            x1={padding.left}
            y1={viewport.height - padding.bottom}
            x2={viewport.width - padding.right}
            y2={viewport.height - padding.bottom}
            stroke="#64748b"
            strokeWidth={1.5}
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={viewport.height - padding.bottom}
            stroke="#64748b"
            strokeWidth={1.5}
          />

          <text
            x={viewport.width / 2}
            y={viewport.height - 5}
            fill="#64748b"
            fontSize={10}
            textAnchor="middle"
            className="select-none"
          >
            行进距离（m）→
          </text>
          <text
            x={12}
            y={padding.top + viewport.innerHeight / 2}
            fill="#64748b"
            fontSize={10}
            textAnchor="middle"
            transform={`rotate(-90, 12, ${padding.top + viewport.innerHeight / 2})`}
            className="select-none"
          >
            高度（m）↑
          </text>

          <g clipPath="url(#chartArea)">
            {profileData.obstacleProjections.map(renderObstacleProjection)}
            {profileData.segments.map(renderSegment)}
          </g>

          <g>
            <line
              x1={progressX}
              y1={padding.top - 5}
              x2={progressX}
              y2={viewport.height - padding.bottom + 5}
              stroke="#38bdf8"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.85}
            />
            <circle
              cx={progressX}
              cy={progressY}
              r={6}
              fill="#38bdf8"
              stroke="#fff"
              strokeWidth={2}
              className="drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]"
            />
            <rect
              x={progressX + 10}
              y={progressY - 18}
              width={58}
              height={20}
              rx={4}
              fill="#0ea5e9"
              opacity={0.9}
            />
            <text
              x={progressX + 39}
              y={progressY - 4}
              fill="#fff"
              fontSize={10}
              fontWeight={700}
              textAnchor="middle"
              className="select-none pointer-events-none"
            >
              {(animationProgress * 100).toFixed(0)}%
            </text>
          </g>
        </svg>

        {selectedSegmentIndex !== null && profileData.segments[selectedSegmentIndex] && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-lg px-3 py-2 text-[11px] text-slate-200 shadow-xl flex items-center gap-4">
            <span className="font-semibold text-slate-300">
              区段 {selectedSegmentIndex + 1}/{profileData.segments.length}
            </span>
            <span>
              距离: {profileData.segments[selectedSegmentIndex].startDistance.toFixed(1)}
              —{profileData.segments[selectedSegmentIndex].endDistance.toFixed(1)}m
            </span>
            <span className={cn(
              'font-semibold',
              profileData.segments[selectedSegmentIndex].status === 'safe' && 'text-emerald-400',
              profileData.segments[selectedSegmentIndex].status === 'warning' && 'text-amber-400',
              profileData.segments[selectedSegmentIndex].status === 'collision' && 'text-red-400'
            )}>
              {STATUS_COLORS[profileData.segments[selectedSegmentIndex].status].label}
            </span>
            {profileData.segments[selectedSegmentIndex].minClearance > 0 && (
              <span className="text-slate-400">
                净空: {profileData.segments[selectedSegmentIndex].minClearance.toFixed(2)}m
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
