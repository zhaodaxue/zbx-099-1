import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import React from 'react';
import ControlPanel from '@/components/ControlPanel';
import PathProfile from '@/components/PathProfile';
import { useAppStore } from '@/store/useAppStore';
import { mockTrees } from '@/data/mockTrees';
import { computeAllCombinations } from '@/utils/liftingMath';

function setupStore(patch: Partial<ReturnType<typeof useAppStore.getState>> = {}) {
  useAppStore.setState({
    trees: mockTrees,
    currentTreeId: mockTrees[0].id,
    selectedLiftPoints: [],
    swingCm: 0,
    animationProgress: 0,
    isAnimating: false,
    combinations: computeAllCombinations(mockTrees[0], 0),
    profileData: null,
    selectedSegmentIndex: null,
    canvasRef: null,
    ...patch,
  });
  if (useAppStore.getState().selectedLiftPoints.length === 2) {
    useAppStore.getState().recomputeProfile();
  }
}

function setStore(patch: Partial<ReturnType<typeof useAppStore.getState>>) {
  act(() => {
    useAppStore.setState(patch);
  });
}

function renderBoth() {
  return render(
    <div>
      <ControlPanel />
      <PathProfile />
    </div>
  );
}

describe('集成：场景1 - 古银杏树（太平街）吊点B + 吊点D → 碰撞风险', () => {
  beforeEach(() => setupStore());

  it('组合表中 B+D 行显示「风险」标签', () => {
    renderBoth();
    const rows = screen.getAllByRole('row');
    const bodyRows = rows.slice(1);
    const bName = '吊点B-南侧';
    const dName = '吊点D-北侧';
    let targetRow: HTMLElement | null = null;
    for (const row of bodyRows) {
      if (row.textContent?.includes(bName) && row.textContent?.includes(dName)) {
        targetRow = row;
        break;
      }
    }
    expect(targetRow).not.toBeNull();
    expect(within(targetRow!).getByText('风险')).toBeInTheDocument();
  });

  it('点击吊点B、吊点D → 当前方案评估卡片出现「相交」+「需调整吊点或清障」提示', () => {
    const { container } = renderBoth();
    const btns = screen.getAllByRole('button');
    const btnB = btns.find(b => b.textContent?.includes('吊点B-南侧'))!;
    const btnD = btns.find(b => b.textContent?.includes('吊点D-北侧'))!;
    fireEvent.click(btnB);
    fireEvent.click(btnD);
    expect(screen.getByText('当前方案评估')).toBeInTheDocument();
    const evalCard = document.querySelector('[data-eval-section]') as HTMLElement;
    expect(evalCard).not.toBeNull();
    expect(within(evalCard).getByText('相交')).toBeInTheDocument();
    expect(within(evalCard).getByText(/需调整吊点或清障/)).toBeInTheDocument();
  });

  it('点击吊点B、吊点D → 剖面图 SVG 存在相交色段（#dc2626 线）', () => {
    const { container } = renderBoth();
    const btns = screen.getAllByRole('button');
    fireEvent.click(btns.find(b => b.textContent?.includes('吊点B-南侧'))!);
    fireEvent.click(btns.find(b => b.textContent?.includes('吊点D-北侧'))!);
    const chartSvg = Array.from(container.querySelectorAll('svg')).find(
      s => (s.getAttribute('viewBox') || '').includes('1000')
    );
    expect(chartSvg).toBeTruthy();
    const clippedG = chartSvg!.querySelector('g[clip-path]');
    expect(clippedG).not.toBeNull();
    const redLines = Array.from(clippedG!.querySelectorAll('line')).filter(
      l => l.getAttribute('stroke') === '#dc2626'
    );
    expect(redLines.length).toBeGreaterThan(0);
  });

  it('评估卡片峰值吨位与组合表 B+D 行一致', () => {
    const { container } = renderBoth();
    const btns = screen.getAllByRole('button');
    fireEvent.click(btns.find(b => b.textContent?.includes('吊点B-南侧'))!);
    fireEvent.click(btns.find(b => b.textContent?.includes('吊点D-北侧'))!);
    const comboRow = screen.getAllByRole('row').slice(1).find(
      r => r.textContent?.includes('吊点B-南侧') && r.textContent?.includes('吊点D-北侧')
    )!;
    const peakInTable = comboRow.textContent!.match(/\d+\.\d+/)?.[0];
    const evalCard = document.querySelector('[data-eval-section]') as HTMLElement;
    expect(evalCard).not.toBeNull();
    const allNums = evalCard.textContent!.match(/\d+\.\d+/g) || [];
    const peakInEval = allNums.find(n => {
      const num = parseFloat(n);
      return num > 10 && num < 100;
    });
    expect(peakInTable).toBe(peakInEval);
  });
});

describe('集成：场景2 - 古槐树（公园北路）— 吨位临界', () => {
  beforeEach(() => {
    setupStore({ currentTreeId: mockTrees[1].id });
    useAppStore.setState({ combinations: computeAllCombinations(mockTrees[1], 0) });
  });

  it('组合表共 6 行（不含表头）', () => {
    renderBoth();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.length).toBe(6);
  });

  it('组合表 6 行中除吊点E(lp-5)+吊点G(lp-7)外均标「风险」（吨位不足）', () => {
    renderBoth();
    const bodyRows = screen.getAllByRole('row').slice(1);
    const eName = '吊点E-东北';
    const gName = '吊点G-东南';
    const egRow = bodyRows.find(
      r => (r.textContent?.includes(eName) && r.textContent?.includes(gName))
    );
    const otherRows = bodyRows.filter(r => r !== egRow);
    otherRows.forEach(row => {
      expect(within(row).getByText('风险')).toBeInTheDocument();
    });
  });

  it('任选一个吨位不足组合（吊点E+吊点F），选择后评估卡片峰值吨位标红 + 吨位不足提示', () => {
    renderBoth();
    const btns = screen.getAllByRole('button');
    const btnE = btns.find(b => b.textContent?.includes('吊点E-东北'))!;
    const btnF = btns.find(b => b.textContent?.includes('吊点F-西南'))!;
    fireEvent.click(btnE);
    fireEvent.click(btnF);
    const evalCard = document.querySelector('[data-eval-section]') as HTMLElement;
    expect(evalCard).not.toBeNull();
    const peakEl = evalCard.querySelector('.text-red-400');
    expect(peakEl).not.toBeNull();
    expect(peakEl!.textContent).toMatch(/\d+\.\d+\s*t/);
    expect(screen.getByText(/吊点额定吨位不足/)).toBeInTheDocument();
  });

  it('选吊点F+吊点H → 组合表中该行「风险」+ 评估卡片吨位不足', () => {
    renderBoth();
    const btns = screen.getAllByRole('button');
    fireEvent.click(btns.find(b => b.textContent?.includes('吊点F-西南'))!);
    fireEvent.click(btns.find(b => b.textContent?.includes('吊点H-西北'))!);
    const rows = screen.getAllByRole('row').slice(1);
    const fhRow = rows.find(
      r => r.textContent?.includes('吊点F-西南') && r.textContent?.includes('吊点H-西北')
    )!;
    expect(within(fhRow).getByText('风险')).toBeInTheDocument();
    expect(screen.getByText(/吊点额定吨位不足/)).toBeInTheDocument();
  });
});

describe('集成：场景3 - 摆动幅度 0→30cm 同步刷新', () => {
  beforeEach(() => setupStore());

  it('滑杆从 0→30 后，组合表 hasCollision 行数不变或增加', () => {
    renderBoth();
    const getRiskCount = () => {
      const rows = screen.getAllByRole('row').slice(1);
      const riskRows = rows.filter(r => r.textContent?.includes('风险'));
      return riskRows.length;
    };
    const r0 = getRiskCount();
    const slider = screen.getByRole('slider') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '30' } });
    fireEvent.input(slider, { target: { value: '30' } });
    const r30 = getRiskCount();
    expect(r30).toBeGreaterThanOrEqual(r0);
  });

  it('滑杆 0→30 后，剖面图非绿色段数不变或增加', () => {
    const { container } = renderBoth();
    const btns = screen.getAllByRole('button');
    fireEvent.click(btns.find(b => b.textContent?.includes('吊点A-东侧'))!);
    fireEvent.click(btns.find(b => b.textContent?.includes('吊点B-南侧'))!);
    const countNonGreen = () => {
      const svg = Array.from(container.querySelectorAll('svg')).find(
        s => (s.getAttribute('viewBox') || '').includes('1000')
      );
      if (!svg) return -1;
      const clipped = svg.querySelector('g[clip-path]');
      if (!clipped) return -1;
      return Array.from(clipped.querySelectorAll('line')).filter(
        l => l.getAttribute('stroke') !== '#16a34a'
      ).length;
    };
    const n0 = countNonGreen();
    expect(n0).toBeGreaterThanOrEqual(0);
    const slider = screen.getByRole('slider') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '30' } });
    fireEvent.input(slider, { target: { value: '30' } });
    const n30 = countNonGreen();
    expect(n30).toBeGreaterThanOrEqual(n0);
  });

  it('表格状态与剖面一致：当 swing30 时，若某组合 hasCollision=true，其剖面碰撞段>0', () => {
    setupStore({ selectedLiftPoints: ['lp-2', 'lp-4'], swingCm: 30 });
    const { container } = renderBoth();
    const combos = useAppStore.getState().combinations;
    const combo = combos.find(
      c => (c.pointA === 'lp-2' && c.pointB === 'lp-4') ||
           (c.pointA === 'lp-4' && c.pointB === 'lp-2')
    )!;
    const profile = useAppStore.getState().profileData;
    if (combo.hasCollision) {
      expect(profile).not.toBeNull();
      const collisions = profile!.segments.filter(s => s.status === 'collision');
      expect(collisions.length).toBeGreaterThan(0);
    }
  });

  it('滑块变化后风载提示出现', () => {
    setupStore({ selectedLiftPoints: ['lp-1', 'lp-2'] });
    renderBoth();
    expect(screen.queryByText(/风载 \+/)).toBeNull();
    const slider = screen.getByRole('slider') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '20' } });
    fireEvent.input(slider, { target: { value: '20' } });
    expect(screen.getByText(/风载 \+20cm/)).toBeInTheDocument();
  });
});

describe('集成：场景4 - 已选吊点并渲染剖面 → 切换古树', () => {
  it('切树后：吊点清空、组合表按新树重算、剖面回到占位', () => {
    setupStore({ selectedLiftPoints: ['lp-2', 'lp-4'] });
    const { container } = renderBoth();
    expect(screen.getByText(/已选\s*2\s*\/\s*2/)).toBeInTheDocument();

    const treeBtns = screen.getAllByRole('button').filter(
      b => b.textContent?.includes('古银杏树') || b.textContent?.includes('古槐树')
    );
    expect(treeBtns.length).toBe(2);
    fireEvent.click(treeBtns.find(b => b.textContent?.includes('古槐树'))!);

    expect(screen.getByText(/已选\s*0\s*\/\s*2/)).toBeInTheDocument();
    expect(screen.getByText(/请选择两个吊点以查看抬升曲线与障碍区间/)).toBeInTheDocument();
    const gingkoBtns = screen.getAllByRole('button').filter(
      b => b.textContent?.includes('吊点A') || b.textContent?.includes('吊点B')
    );
    expect(gingkoBtns.length).toBe(0);
    const sophoraBtns = screen.getAllByRole('button').filter(
      b => b.textContent?.includes('吊点E') || b.textContent?.includes('吊点F')
    );
    expect(sophoraBtns.length).toBeGreaterThan(0);
  });
});

describe('集成：场景5 - 第三吊点替换 + profile 重建无残留', () => {
  it('连续点击 A→B→C → 最终是 [B,C]，profileData 不是 A+B 时的引用', () => {
    setupStore();
    renderBoth();
    const btns = screen.getAllByRole('button');
    const btnA = btns.find(b => b.textContent?.includes('吊点A-东侧'))!;
    const btnB = btns.find(b => b.textContent?.includes('吊点B-南侧'))!;
    const btnC = btns.find(b => b.textContent?.includes('吊点C-西侧'))!;
    fireEvent.click(btnA);
    fireEvent.click(btnB);
    const profileAB = useAppStore.getState().profileData;
    expect(profileAB).not.toBeNull();
    fireEvent.click(btnC);
    expect(useAppStore.getState().selectedLiftPoints).toEqual(['lp-2', 'lp-3']);
    expect(useAppStore.getState().profileData).not.toBe(profileAB);
    expect(useAppStore.getState().profileData).not.toBeNull();
    expect(useAppStore.getState().profileData!.segments.length).toBe(40);
  });
});

describe('集成：场景6 - 选中剖面段 → 区段信息浮层展示', () => {
  beforeEach(() => setupStore({ selectedLiftPoints: ['lp-1', 'lp-2'] }));

  it('点击第 15 段 → 浮层显示「区段 15/40」/「区段 16/40」+ 距离区间 + 状态标签', () => {
    const { container } = renderBoth();
    const chartSvg = Array.from(container.querySelectorAll('svg')).find(
      s => (s.getAttribute('viewBox') || '').includes('1000')
    )!;
    const clipped = chartSvg.querySelector('g[clip-path]')!;
    const allGs = Array.from(clipped.querySelectorAll('g'));
    const segmentGs = allGs.filter(g => g.querySelector('line'));
    expect(segmentGs.length).toBe(40);
    const targetLine = segmentGs[14].querySelector('line')!;
    fireEvent.click(targetLine);
    const segmentIdx = useAppStore.getState().selectedSegmentIndex;
    expect(segmentIdx).not.toBeNull();
    const infoBarText = screen.getByText(/区段 \d+\/\d+/).textContent!;
    const expectedIdx = segmentIdx! + 1;
    expect(infoBarText).toContain(`${expectedIdx}/40`);
    const profile = useAppStore.getState().profileData!;
    const seg = profile.segments[segmentIdx!];
    expect(seg.startDistance.toFixed(1)).toBeTruthy();
    const infoRoot = screen.getByText(/区段 \d+\/\d+/).closest('div')!;
    expect(infoRoot.innerHTML).toMatch(/距离:/);
    expect(infoRoot.innerHTML).toMatch(/—/);
    const statusLabel = seg.status === 'safe' ? '安全' :
                       seg.status === 'warning' ? '擦边预警' : '相交';
    expect(infoRoot.textContent).toContain(statusLabel);
  });

  it('选中后，再点击同一段 → 取消选中（区段浮层消失）', () => {
    const { container } = renderBoth();
    const chartSvg = Array.from(container.querySelectorAll('svg')).find(
      s => (s.getAttribute('viewBox') || '').includes('1000')
    )!;
    const clipped = chartSvg.querySelector('g[clip-path]')!;
    const allGs = Array.from(clipped.querySelectorAll('g'));
    const segmentGs = allGs.filter(g => g.querySelector('line'));
    fireEvent.click(segmentGs[10].querySelector('line')!);
    expect(screen.getByText(/区段 \d+\/\d+/)).toBeInTheDocument();
    fireEvent.click(segmentGs[10].querySelector('line')!);
    expect(useAppStore.getState().selectedSegmentIndex).toBeNull();
    expect(screen.queryByText(/区段 \d+\/\d+/)).toBeNull();
  });
});
