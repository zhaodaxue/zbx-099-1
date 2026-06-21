import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { mockTrees } from '@/data/mockTrees';

const gingko = mockTrees[0];
const sophora = mockTrees[1];

function getState() {
  return useAppStore.getState();
}

function setState(partial: Partial<ReturnType<typeof getState>>) {
  useAppStore.setState(partial);
}

describe('zustand store - 初始化状态', () => {
  beforeEach(() => {
    setState({
      currentTreeId: mockTrees[0].id,
      selectedLiftPoints: [],
      swingCm: 0,
      animationProgress: 0,
      isAnimating: false,
      profileData: null,
      selectedSegmentIndex: null,
    });
    getState().recomputeCombinations();
    getState().recomputeProfile();
  });

  it('初始 currentTree 为古银杏树（第1棵）', () => {
    expect(getState().currentTreeId).toBe(gingko.id);
  });

  it('初始 swingCm = 0', () => {
    expect(getState().swingCm).toBe(0);
  });

  it('初始未选择吊点', () => {
    expect(getState().selectedLiftPoints).toEqual([]);
  });

  it('初始组合表 = 6 行（银杏树C(4,2)）', () => {
    expect(getState().combinations.length).toBe(6);
  });

  it('初始 profileData 为 null（未选吊点）', () => {
    expect(getState().profileData).toBeNull();
  });

  it('初始 selectedSegmentIndex 为 null', () => {
    expect(getState().selectedSegmentIndex).toBeNull();
  });
});

describe('zustand store - toggleLiftPoint 选择吊点', () => {
  beforeEach(() => {
    setState({
      currentTreeId: gingko.id,
      selectedLiftPoints: [],
      swingCm: 0,
      animationProgress: 0,
      isAnimating: false,
      profileData: null,
      selectedSegmentIndex: null,
    });
    getState().recomputeCombinations();
  });

  it('选1个吊点：长度=1，profile 仍 null', () => {
    getState().toggleLiftPoint('lp-1');
    expect(getState().selectedLiftPoints).toEqual(['lp-1']);
    expect(getState().profileData).toBeNull();
  });

  it('选2个吊点：profileData 非空且 40 段', () => {
    getState().toggleLiftPoint('lp-1');
    getState().toggleLiftPoint('lp-2');
    expect(getState().selectedLiftPoints).toEqual(['lp-1', 'lp-2']);
    expect(getState().profileData).not.toBeNull();
    expect(getState().profileData!.segments.length).toBe(40);
  });

  describe('场景5：第三吊点点击 - 仅保留最新两枚 + profile 重建', () => {
    it('连续选 A→B→C，最后应是 [B, C] 且 profile 对应新组合', () => {
      getState().toggleLiftPoint('lp-1');
      getState().toggleLiftPoint('lp-2');
      const profileAB = getState().profileData;
      expect(profileAB).not.toBeNull();

      getState().toggleLiftPoint('lp-3');
      expect(getState().selectedLiftPoints).toEqual(['lp-2', 'lp-3']);
      expect(getState().profileData).not.toBeNull();
      expect(getState().profileData).not.toBe(profileAB);
    });

    it('组合变为 [B, C] 后，原 A 吊点相关曲线信息不应残留（段数仍是 40）', () => {
      getState().toggleLiftPoint('lp-1');
      getState().toggleLiftPoint('lp-2');
      getState().toggleLiftPoint('lp-3');
      expect(getState().profileData!.segments.length).toBe(40);
    });
  });

  it('取消选择：选 A→B→再次选 B，最终是 [A]，profile 清空', () => {
    getState().toggleLiftPoint('lp-1');
    getState().toggleLiftPoint('lp-2');
    expect(getState().profileData).not.toBeNull();
    getState().toggleLiftPoint('lp-2');
    expect(getState().selectedLiftPoints).toEqual(['lp-1']);
    expect(getState().profileData).toBeNull();
  });
});

describe('zustand store - setSwingCm 摆动滑块', () => {
  beforeEach(() => {
    setState({
      currentTreeId: gingko.id,
      selectedLiftPoints: ['lp-1', 'lp-2'],
      swingCm: 0,
      animationProgress: 0,
      isAnimating: false,
      selectedSegmentIndex: null,
    });
    getState().recomputeCombinations();
    getState().recomputeProfile();
  });

  describe('场景3：摆动 0→30cm 组合与剖面同步刷新', () => {
    it('setSwingCm(30) → swingCm=30 + 组合重算 + profile 重算', () => {
      const c0 = getState().combinations;
      const p0 = getState().profileData;
      getState().setSwingCm(30);
      expect(getState().swingCm).toBe(30);
      expect(getState().combinations).not.toBe(c0);
      expect(getState().profileData).not.toBe(p0);
      expect(getState().profileData!.segments.length).toBe(40);
    });

    it('swing 30 的剖面非安全段 >= swing 0', () => {
      const p0 = getState().profileData!;
      getState().setSwingCm(30);
      const p30 = getState().profileData!;
      const unsafe0 = p0.segments.filter(s => s.status !== 'safe').length;
      const unsafe30 = p30.segments.filter(s => s.status !== 'safe').length;
      expect(unsafe30).toBeGreaterThanOrEqual(unsafe0);
    });

    it('表格状态与剖面一致：当 swing30 的 hasCollision 变 true 时，剖面碰撞段也增长', () => {
      const c0Coll = getState().combinations.filter(c => c.hasCollision).length;
      const p0Coll = getState().profileData!.segments.filter(s => s.status === 'collision').length;
      getState().setSwingCm(30);
      const c30Coll = getState().combinations.filter(c => c.hasCollision).length;
      const p30Coll = getState().profileData!.segments.filter(s => s.status === 'collision').length;
      if (c0Coll < c30Coll) {
        expect(p30Coll).toBeGreaterThanOrEqual(p0Coll);
      }
    });
  });
});

describe('zustand store - setCurrentTree 切换古树', () => {
  beforeEach(() => {
    setState({
      currentTreeId: gingko.id,
      selectedLiftPoints: ['lp-1', 'lp-2'],
      swingCm: 5,
      animationProgress: 0.5,
      isAnimating: true,
      selectedSegmentIndex: 10,
    });
    getState().recomputeProfile();
    expect(getState().profileData).not.toBeNull();
  });

  describe('场景4：已选两吊点并渲染剖面后 → 切换古树', () => {
    it('切换到古槐树后吊点清空', () => {
      getState().setCurrentTree(sophora.id);
      expect(getState().selectedLiftPoints).toEqual([]);
    });

    it('切换后 currentTreeId 更新', () => {
      getState().setCurrentTree(sophora.id);
      expect(getState().currentTreeId).toBe(sophora.id);
    });

    it('切换后 profileData = null（占位说明）', () => {
      getState().setCurrentTree(sophora.id);
      expect(getState().profileData).toBeNull();
    });

    it('切换后 isAnimating = false + animationProgress = 0', () => {
      getState().setCurrentTree(sophora.id);
      expect(getState().isAnimating).toBe(false);
      expect(getState().animationProgress).toBe(0);
    });

    it('切换后 selectedSegmentIndex = null', () => {
      getState().setCurrentTree(sophora.id);
      expect(getState().selectedSegmentIndex).toBeNull();
    });

    it('切换后组合表按新树重算（仍是 6 行）', () => {
      getState().setCurrentTree(sophora.id);
      expect(getState().combinations.length).toBe(6);
    });

    it('组合表对应古槐树吊点 ID 前缀（lp-5 到 lp-8）', () => {
      getState().setCurrentTree(sophora.id);
      const ids = new Set<string>();
      getState().combinations.forEach(c => {
        ids.add(c.pointA);
        ids.add(c.pointB);
      });
      expect(ids.has('lp-5')).toBe(true);
      expect(ids.has('lp-8')).toBe(true);
      expect(ids.has('lp-1')).toBe(false);
    });
  });
});

describe('zustand store - 场景联动：古银杏树 B(lp-2)+D(lp-4) 碰撞', () => {
  beforeEach(() => {
    setState({
      currentTreeId: gingko.id,
      selectedLiftPoints: [],
      swingCm: 0,
    });
    getState().recomputeCombinations();
  });

  it('组合表 B+D 行 hasCollision=true', () => {
    const combo = getState().combinations.find(
      c => (c.pointA === 'lp-2' && c.pointB === 'lp-4') ||
           (c.pointA === 'lp-4' && c.pointB === 'lp-2')
    );
    expect(combo).toBeDefined();
    expect(combo!.hasCollision).toBe(true);
  });

  it('选中 B+D 后，profile 中 collision 段 > 0', () => {
    getState().toggleLiftPoint('lp-2');
    getState().toggleLiftPoint('lp-4');
    expect(getState().profileData).not.toBeNull();
    const collisions = getState().profileData!.segments.filter(s => s.status === 'collision');
    expect(collisions.length).toBeGreaterThan(0);
  });
});

describe('zustand store - setSelectedSegmentIndex', () => {
  beforeEach(() => {
    setState({
      currentTreeId: gingko.id,
      selectedLiftPoints: ['lp-1', 'lp-2'],
      swingCm: 0,
      selectedSegmentIndex: null,
    });
    getState().recomputeProfile();
  });

  it('setSelectedSegmentIndex(5) → 值更新', () => {
    getState().setSelectedSegmentIndex(5);
    expect(getState().selectedSegmentIndex).toBe(5);
  });

  it('setSelectedSegmentIndex(null) 取消选中', () => {
    getState().setSelectedSegmentIndex(10);
    getState().setSelectedSegmentIndex(null);
    expect(getState().selectedSegmentIndex).toBeNull();
  });

  it('切换吊点后 selectedSegmentIndex 被清空', () => {
    getState().setSelectedSegmentIndex(5);
    getState().toggleLiftPoint('lp-3');
    expect(getState().selectedSegmentIndex).toBeNull();
  });
});
