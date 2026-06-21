import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import React from 'react';
import PathProfile from '@/components/PathProfile';
import { useAppStore } from '@/store/useAppStore';
import { mockTrees } from '@/data/mockTrees';

const gingko = mockTrees[0];

function initStore(patch: Partial<ReturnType<typeof useAppStore.getState>> = {}) {
  useAppStore.setState({
    trees: mockTrees,
    currentTreeId: gingko.id,
    selectedLiftPoints: [],
    swingCm: 0,
    animationProgress: 0,
    isAnimating: false,
    profileData: null,
    selectedSegmentIndex: null,
    combinations: [],
    canvasRef: null,
    ...patch,
  });
  if (useAppStore.getState().selectedLiftPoints.length === 2) {
    useAppStore.getState().recomputeProfile();
  }
  useAppStore.getState().recomputeCombinations();
}

function setStoreState(patch: Partial<ReturnType<typeof useAppStore.getState>>) {
  act(() => {
    useAppStore.setState(patch);
  });
}

function getChartSvg(container: HTMLElement) {
  const all = Array.from(container.querySelectorAll('svg'));
  return all.find(s => (s.getAttribute('viewBox') || '').includes('1000')) || null;
}

describe('PathProfile 组件 - 占位说明', () => {
  beforeEach(() => {
    initStore();
  });

  it('未选吊点 → 显示占位说明「请选择两个吊点」', () => {
    render(<PathProfile />);
    expect(screen.getByText(/请选择两个吊点以查看抬升曲线与障碍区间/)).toBeInTheDocument();
  });

  it('未选吊点 → 不渲染 SVG（只有 icon SVG）', () => {
    const { container } = render(<PathProfile />);
    const allSvgs = container.querySelectorAll('svg');
    let chartSvgCount = 0;
    allSvgs.forEach(svg => {
      const vb = svg.getAttribute('viewBox') || '';
      if (vb.includes('1000') && vb.includes('300')) chartSvgCount++;
    });
    expect(chartSvgCount).toBe(0);
  });

  it('只选 1 个吊点 → 仍然显示占位说明', () => {
    initStore({ selectedLiftPoints: ['lp-1'] });
    render(<PathProfile />);
    expect(screen.getByText(/请选择两个吊点以查看抬升曲线与障碍区间/)).toBeInTheDocument();
  });
});

describe('PathProfile 组件 - 剖面渲染', () => {
  beforeEach(() => {
    initStore({ selectedLiftPoints: ['lp-1', 'lp-2'] });
  });

  it('选两吊点 → 渲染 SVG (viewBox 1000x300)', () => {
    const { container } = render(<PathProfile />);
    const chartSvg = Array.from(container.querySelectorAll('svg')).find(
      svg => (svg.getAttribute('viewBox') || '').includes('1000')
    );
    expect(chartSvg).toBeTruthy();
  });

  it('SVG 内 40 条路径段 line 元素（在 clipPath g 内）', () => {
    const { container } = render(<PathProfile />);
    const chartSvg = Array.from(container.querySelectorAll('svg')).find(
      svg => (svg.getAttribute('viewBox') || '').includes('1000')
    )!;
    const clippedG = chartSvg.querySelector('g[clip-path]');
    expect(clippedG).not.toBeNull();
    const lines = clippedG!.querySelectorAll('line');
    expect(lines.length).toBe(40);
  });

  it('路径段颜色只包含 safe/warning/collision 三种 stroke', () => {
    const { container } = render(<PathProfile />);
    const chartSvg = Array.from(container.querySelectorAll('svg')).find(
      svg => (svg.getAttribute('viewBox') || '').includes('1000')
    )!;
    const clippedG = chartSvg.querySelector('g[clip-path]')!;
    const lines = Array.from(clippedG.querySelectorAll('line'));
    const colors = new Set(lines.map(l => l.getAttribute('stroke') || ''));
    colors.forEach(c => {
      expect(['#16a34a', '#d97706', '#dc2626']).toContain(c);
    });
  });

  it('障碍物投影矩形 ≥ 1 个', () => {
    const { container } = render(<PathProfile />);
    const chartSvg = Array.from(container.querySelectorAll('svg')).find(
      svg => (svg.getAttribute('viewBox') || '').includes('1000')
    )!;
    const clippedG = chartSvg.querySelector('g[clip-path]')!;
    const rects = clippedG.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThanOrEqual(1);
  });

  it('坐标轴刻度显示（X轴至少3个，Y轴至少3个数字）', () => {
    const { container } = render(<PathProfile />);
    const chartSvg = Array.from(container.querySelectorAll('svg')).find(
      svg => (svg.getAttribute('viewBox') || '').includes('1000')
    )!;
    const texts = Array.from(chartSvg.querySelectorAll('text'));
    const numeric = texts.filter(t => /^\d+(\.\d+)?$/.test(t.textContent || ''));
    expect(numeric.length).toBeGreaterThanOrEqual(6);
  });

  it('图例区显示三个状态文字', () => {
    render(<PathProfile />);
    expect(screen.getByText('安全')).toBeInTheDocument();
    expect(screen.getByText('擦边预警')).toBeInTheDocument();
    expect(screen.getByText('相交')).toBeInTheDocument();
  });
});

describe('PathProfile 组件 - 场景1：吊点B(lp-2)+吊点D(lp-4) 碰撞', () => {
  beforeEach(() => {
    initStore({ selectedLiftPoints: ['lp-2', 'lp-4'] });
  });

  it('剖面图有相交段（红色 stroke #dc2626）', () => {
    const { container } = render(<PathProfile />);
    const chartSvg = Array.from(container.querySelectorAll('svg')).find(
      svg => (svg.getAttribute('viewBox') || '').includes('1000')
    )!;
    const clippedG = chartSvg.querySelector('g[clip-path]')!;
    const redLines = Array.from(clippedG.querySelectorAll('line')).filter(
      l => l.getAttribute('stroke') === '#dc2626'
    );
    expect(redLines.length).toBeGreaterThan(0);
  });

  it('剖面图有琥珀预警段或红色相交段（不能全绿）', () => {
    const { container } = render(<PathProfile />);
    const chartSvg = Array.from(container.querySelectorAll('svg')).find(
      svg => (svg.getAttribute('viewBox') || '').includes('1000')
    )!;
    const clippedG = chartSvg.querySelector('g[clip-path]')!;
    const greenLines = Array.from(clippedG.querySelectorAll('line')).filter(
      l => l.getAttribute('stroke') === '#16a34a'
    );
    expect(greenLines.length).toBeLessThan(40);
  });
});

describe('PathProfile 组件 - 场景3：摆动幅度 0→30cm 刷新', () => {
  it('swing0 → swing30 剖面重渲染，非绿色段可能增加', () => {
    initStore({ selectedLiftPoints: ['lp-1', 'lp-2'], swingCm: 0 });
    const { container, rerender } = render(<PathProfile />);

    const countNonGreen = () => {
      const svg = Array.from(container.querySelectorAll('svg')).find(
        s => (s.getAttribute('viewBox') || '').includes('1000')
      )!;
      const clippedG = svg.querySelector('g[clip-path]')!;
      return Array.from(clippedG.querySelectorAll('line')).filter(
        l => l.getAttribute('stroke') !== '#16a34a'
      ).length;
    };
    const nonGreen0 = countNonGreen();

    useAppStore.setState({ swingCm: 30 });
    useAppStore.getState().recomputeProfile();
    rerender(<PathProfile />);
    const nonGreen30 = countNonGreen();
    expect(nonGreen30).toBeGreaterThanOrEqual(nonGreen0);
  });

  it('swingCm > 0 时显示风载标签', () => {
    initStore({ selectedLiftPoints: ['lp-1', 'lp-2'], swingCm: 15 });
    render(<PathProfile />);
    expect(screen.getByText(/风载 \+15cm/)).toBeInTheDocument();
  });

  it('swingCm = 0 时不显示风载标签', () => {
    initStore({ selectedLiftPoints: ['lp-1', 'lp-2'], swingCm: 0 });
    render(<PathProfile />);
    expect(screen.queryByText(/风载 \+/)).toBeNull();
  });
});

describe('PathProfile 组件 - 场景6：选中态与区段信息浮层', () => {
  beforeEach(() => {
    initStore({ selectedLiftPoints: ['lp-1', 'lp-2'], swingCm: 0 });
  });

  it('初始未选中 → 不显示「区段 X/40」浮层', () => {
    render(<PathProfile />);
    expect(screen.queryByText(/区段 \d+\/\d+/)).toBeNull();
  });

  it('点击某段 → store 更新 selectedSegmentIndex', () => {
    const { container } = render(<PathProfile />);
    const chartSvg = getChartSvg(container)!;
    const clippedG = chartSvg.querySelector('g[clip-path]')!;
    const allGs = Array.from(clippedG.querySelectorAll('g'));
    const segmentGs = allGs.filter(g => g.querySelector('line'));
    expect(segmentGs.length).toBeGreaterThan(5);
    act(() => {
      fireEvent.click(segmentGs[5].querySelector('line')!);
    });
    expect(useAppStore.getState().selectedSegmentIndex).toBe(5);
  });

  it('通过 store 设置 selectedSegmentIndex=5 → 显示区段浮层（区段 6/40）', () => {
    render(<PathProfile />);
    setStoreState({ selectedSegmentIndex: 5 });
    expect(screen.getByText(/区段 6\/40/)).toBeInTheDocument();
  });

  it('区段浮层包含「距离: X—Ym」信息', () => {
    render(<PathProfile />);
    setStoreState({ selectedSegmentIndex: 10 });
    const infoBar = screen.getByText(/区段 11\/40/).parentElement!;
    expect(infoBar.innerHTML).toMatch(/距离:/);
    expect(infoBar.innerHTML).toMatch(/—/);
    expect(infoBar.innerHTML).toMatch(/m/);
  });

  it('区段浮层包含状态标签（安全/擦边预警/相交）', () => {
    render(<PathProfile />);
    setStoreState({ selectedSegmentIndex: 10 });
    const status = useAppStore.getState().profileData!.segments[10].status;
    const labelMap: Record<string, string> = {
      safe: '安全',
      warning: '擦边预警',
      collision: '相交',
    };
    const infoBar = screen.getByText(/区段 \d+\/\d+/).closest('div')!;
    expect(within(infoBar).getByText(labelMap[status])).toBeInTheDocument();
  });

  it('safe 段净空信息显示（minClearance > 0）', () => {
    render(<PathProfile />);
    const profile = useAppStore.getState().profileData!;
    const safeIdx = profile.segments.findIndex(s => s.status === 'safe' && s.minClearance > 0);
    if (safeIdx >= 0) {
      setStoreState({ selectedSegmentIndex: safeIdx });
      expect(screen.getByText(/净空:/)).toBeInTheDocument();
    }
  });
});

describe('PathProfile 组件 - 动画进度线', () => {
  beforeEach(() => {
    initStore({ selectedLiftPoints: ['lp-1', 'lp-2'], animationProgress: 0 });
  });

  it('animationProgress=0 → 青色进度线和圆点存在', () => {
    const { container } = render(<PathProfile />);
    const chartSvg = Array.from(container.querySelectorAll('svg')).find(
      s => (s.getAttribute('viewBox') || '').includes('1000')
    )!;
    const cyanLine = Array.from(chartSvg.querySelectorAll('line')).find(
      l => l.getAttribute('stroke') === '#38bdf8'
    );
    expect(cyanLine).toBeTruthy();
    const cyanCircle = Array.from(chartSvg.querySelectorAll('circle')).find(
      c => c.getAttribute('fill') === '#38bdf8'
    );
    expect(cyanCircle).toBeTruthy();
  });

  it('animationProgress=0 → 百分比标签显示 0%', () => {
    render(<PathProfile />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('animationProgress=0.5 → 百分比显示 50%', () => {
    render(<PathProfile />);
    setStoreState({ animationProgress: 0.5 });
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('animationProgress=1 → 百分比显示 100%', () => {
    render(<PathProfile />);
    setStoreState({ animationProgress: 1 });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('PathProfile 组件 - 场景4：切换古树 → 占位说明', () => {
  it('选了吊点B+D渲染剖面后，切到古槐树 → 回到占位', () => {
    initStore({ selectedLiftPoints: ['lp-2', 'lp-4'] });
    const { container, rerender } = render(<PathProfile />);
    expect(screen.queryByText(/请选择两个吊点/)).toBeNull();
    const hasChartBefore = Array.from(container.querySelectorAll('svg')).some(
      s => (s.getAttribute('viewBox') || '').includes('1000')
    );
    expect(hasChartBefore).toBe(true);

    act(() => {
      useAppStore.getState().setCurrentTree(mockTrees[1].id);
    });
    rerender(<PathProfile />);
    expect(screen.getByText(/请选择两个吊点以查看抬升曲线与障碍区间/)).toBeInTheDocument();
    const hasChartAfter = Array.from(container.querySelectorAll('svg')).some(
      s => (s.getAttribute('viewBox') || '').includes('1000')
    );
    expect(hasChartAfter).toBe(false);
  });
});

describe('PathProfile 组件 - 场景5：第三吊点替换旧组合', () => {
  it('选 A+B → 再选 C → profileData 已重建（非旧引用）', () => {
    initStore({ selectedLiftPoints: ['lp-1', 'lp-2'] });
    const pAB = useAppStore.getState().profileData;
    expect(pAB).not.toBeNull();

    act(() => {
      useAppStore.getState().toggleLiftPoint('lp-3');
    });
    expect(useAppStore.getState().selectedLiftPoints).toEqual(['lp-2', 'lp-3']);
    expect(useAppStore.getState().profileData).not.toBeNull();
    expect(useAppStore.getState().profileData).not.toBe(pAB);
  });
});
