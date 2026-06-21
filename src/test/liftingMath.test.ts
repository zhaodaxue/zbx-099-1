import { describe, it, expect } from 'vitest';
import {
  horizontalDistance,
  computePointToBoxClearance,
  sphereIntersectsBox,
  computeSegmentClearanceStatus,
  computeProfileData,
  computeAllCombinations,
  computeLiftHeight,
  computeBallPosition,
} from '@/utils/liftingMath';
import type { Vec3 } from '@/types';
import { mockTrees } from '@/data/mockTrees';

const TOL = 1e-6;
const gingko = mockTrees[0];
const sophora = mockTrees[1];

describe('liftingMath - 基础几何函数', () => {
  describe('horizontalDistance', () => {
    it('应忽略Y轴，仅计算XZ平面距离', () => {
      const a: Vec3 = { x: 0, y: 999, z: 0 };
      const b: Vec3 = { x: 3, y: 0, z: 4 };
      expect(horizontalDistance(a, b)).toBeCloseTo(5, 5);
    });
    it('相同XZ坐标返回0', () => {
      const a: Vec3 = { x: 2, y: 5, z: 3 };
      expect(horizontalDistance(a, { ...a, y: 888 })).toBe(0);
    });
  });

  describe('sphereIntersectsBox', () => {
    it('球在盒外不相交', () => {
      expect(
        sphereIntersectsBox({ x: 100, y: 100, z: 100 }, 1, { x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 })
      ).toBe(false);
    });
    it('球在盒内必相交', () => {
      expect(
        sphereIntersectsBox({ x: 0, y: 0, z: 0 }, 1, { x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 4 })
      ).toBe(true);
    });
    it('施工围挡直接命中', () => {
      const obs = gingko.obstacles[0];
      expect(sphereIntersectsBox(obs.position, 2, obs.position, obs.size)).toBe(true);
    });
  });

  describe('computePointToBoxClearance', () => {
    it('球在盒外返回正净空', () => {
      const cl = computePointToBoxClearance(
        { x: 10, y: 0, z: 0 }, 1, { x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 4 }
      );
      expect(cl).toBeGreaterThan(0);
      expect(cl).toBeCloseTo(7, TOL);
    });
    it('球在盒内返回负净空', () => {
      const cl = computePointToBoxClearance(
        { x: 0, y: 0, z: 0 }, 1, { x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 4 }
      );
      expect(cl).toBeLessThan(0);
    });
  });

  describe('computeLiftHeight', () => {
    it('无吊点时默认 >= 2m', () => {
      const h = computeLiftHeight(
        gingko.soilBall.centerOfMass, { x: 10, y: 5, z: 6 },
        gingko.obstacles, gingko.soilBall.diameter / 2
      );
      expect(h).toBeGreaterThanOrEqual(2);
    });
  });

  describe('computeBallPosition', () => {
    it('progress=0 在起点，progress=1 在终点', () => {
      const s = { x: 0, y: 1.2, z: 0 };
      const t = { x: 10, y: 3, z: 6 };
      const p0 = computeBallPosition(s, t, 0, 5);
      const p1 = computeBallPosition(s, t, 1, 5);
      expect(p0.x).toBeCloseTo(0, TOL);
      expect(p0.z).toBeCloseTo(0, TOL);
      expect(p1.x).toBeCloseTo(10, TOL);
      expect(p1.z).toBeCloseTo(6, TOL);
    });
    it('progress=0.5 抬升至峰值（正弦）', () => {
      const s = { x: 0, y: 1.2, z: 0 };
      const t = { x: 10, y: 3, z: 6 };
      const p = computeBallPosition(s, t, 0.5, 5);
      expect(p.y).toBeCloseTo(6.2, TOL);
    });
  });
});

describe('liftingMath - 组合评估 (场景1/场景2/场景3 计算层)', () => {

  describe('场景1：古银杏树 - 吊点B(lp-2) + 吊点D(lp-4) 应出现碰撞风险', () => {
    it('组合表中B+D行 hasCollision 为 true', () => {
      const combos = computeAllCombinations(gingko, 0);
      const combo = combos.find(
        c => (c.pointA === 'lp-2' && c.pointB === 'lp-4') ||
             (c.pointA === 'lp-4' && c.pointB === 'lp-2')
      );
      expect(combo).toBeDefined();
      expect(combo!.hasCollision).toBe(true);
    });
  });

  describe('场景2：古槐树（吨位临界）- 6种组合评估', () => {
    it('组合表应为 6 行（C(4,2)）', () => {
      const combos = computeAllCombinations(sophora, 0);
      expect(combos.length).toBe(6);
    });

    it('含吊点H(lp-8)的所有组合均吨位不足（14t 远小于 32t 重）', () => {
      const combos = computeAllCombinations(sophora, 0);
      const withH = combos.filter(c => c.pointA === 'lp-8' || c.pointB === 'lp-8');
      expect(withH.length).toBe(3);
      withH.forEach(c => expect(c.tonnageInsufficient).toBe(true));
    });

    it('吊点F(lp-6 16t) + 吊点H(lp-8 14t)：峰值吨位 > 两者最小额定 14t', () => {
      const combos = computeAllCombinations(sophora, 0);
      const fh = combos.find(
        c => (c.pointA === 'lp-6' && c.pointB === 'lp-8') ||
             (c.pointA === 'lp-8' && c.pointB === 'lp-6')
      );
      expect(fh).toBeDefined();
      expect(fh!.tonnageInsufficient).toBe(true);
      expect(fh!.peakTonnage).toBeGreaterThan(14);
    });
  });

  describe('场景3：摆动幅度 0→30cm，组合表刷新', () => {
    it('相同组合 swing0 和 swing30 的 hasCollision/tonnageInsufficient 可能变化', () => {
      const c0 = computeAllCombinations(gingko, 0);
      const c30 = computeAllCombinations(gingko, 30);
      expect(c0.length).toBe(c30.length);
      const totalColl0 = c0.filter(c => c.hasCollision).length;
      const totalColl30 = c30.filter(c => c.hasCollision).length;
      expect(totalColl30).toBeGreaterThanOrEqual(totalColl0);
    });
  });
});

describe('liftingMath - 剖面计算 (computeProfileData)', () => {
  const lpA = gingko.liftPoints[0];
  const lpB = gingko.liftPoints[1];

  it('不传入吊点位置时，使用默认抬升高度，仍返回 profile（40 段）', () => {
    const profile = computeProfileData(gingko);
    expect(profile).not.toBeNull();
    expect(profile!.segments.length).toBe(40);
  });

  describe('选中两个吊点时', () => {
    const profile = computeProfileData(gingko, lpA.position, lpB.position);

    it('应返回非空', () => expect(profile).not.toBeNull());
    it('段数 = 40（采样粒度）', () => expect(profile!.segments.length).toBe(40));
    it('段索引连续 0-39', () => {
      profile!.segments.forEach((s, i) => expect(s.segmentIndex).toBe(i));
    });
    it('startDistance 单调递增', () => {
      for (let i = 1; i < profile!.segments.length; i++) {
        expect(profile!.segments[i].startDistance)
          .toBeGreaterThan(profile!.segments[i - 1].startDistance);
      }
    });
    it('段状态只可能是 safe/warning/collision', () => {
      const set = new Set(profile!.segments.map(s => s.status));
      set.forEach(s => expect(['safe', 'warning', 'collision']).toContain(s));
    });
    it('总距离 > 0', () => expect(profile!.totalDistance).toBeGreaterThan(0));
  });

  describe('场景1：吊点B(lp-2) + 吊点D(lp-4) - 低吊点 应存在相交段', () => {
    const lpB = gingko.liftPoints[1];
    const lpD = gingko.liftPoints[3];
    const profile = computeProfileData(gingko, lpB.position, lpD.position);

    it('相交段数量 > 0', () => {
      const collisions = profile!.segments.filter(s => s.status === 'collision');
      expect(collisions.length).toBeGreaterThan(0);
    });
    it('相交段的 minClearance 为 -1', () => {
      const collisions = profile!.segments.filter(s => s.status === 'collision');
      collisions.forEach(s => expect(s.minClearance).toBe(-1));
    });
  });

  describe('场景3：摆动 0→30cm 剖面同步刷新', () => {
    const lpHighA = gingko.liftPoints[0];
    const lpHighB = gingko.liftPoints[1];
    const p0 = computeProfileData(gingko, lpHighA.position, lpHighB.position, 0);
    const p30 = computeProfileData(gingko, lpHighA.position, lpHighB.position, 30);

    it('段数不变（仍然 40）', () => {
      expect(p0!.segments.length).toBe(40);
      expect(p30!.segments.length).toBe(40);
    });
    it('swing30 的非安全段数 >= swing0', () => {
      const unsafe0 = p0!.segments.filter(s => s.status !== 'safe').length;
      const unsafe30 = p30!.segments.filter(s => s.status !== 'safe').length;
      expect(unsafe30).toBeGreaterThanOrEqual(unsafe0);
    });
  });

  describe('障碍投影', () => {
    const profile = computeProfileData(gingko, lpA.position, lpB.position);

    it('至少有 1 个障碍投影（施工围挡横贯）', () => {
      expect(profile!.obstacleProjections.length).toBeGreaterThanOrEqual(1);
    });
    it('投影 startDistance < endDistance', () => {
      profile!.obstacleProjections.forEach(p => {
        expect(p.startDistance).toBeLessThan(p.endDistance);
      });
    });
    it('投影状态集合合法', () => {
      profile!.obstacleProjections.forEach(p => {
        expect(['safe', 'warning', 'collision']).toContain(p.status);
      });
    });
  });
});

describe('liftingMath - 单段状态判定 (computeSegmentClearanceStatus)', () => {
  const start = gingko.soilBall.centerOfMass;
  const target: Vec3 = {
    x: gingko.targetPit.position.x,
    y: gingko.targetPit.depth + gingko.soilBall.diameter / 2,
    z: gingko.targetPit.position.z,
  };
  const ballRadius = gingko.soilBall.diameter / 2;
  const liftHeight = 5;
  const zeroOff: Vec3 = { x: 0, y: 0, z: 0 };

  it('起点和终点应安全或预警（不会进入障碍）', () => {
    for (const p of [0, 0.025, 0.975, 1]) {
      const r = computeSegmentClearanceStatus(
        start, target, ballRadius, liftHeight, gingko.obstacles, zeroOff, p
      );
      expect(['safe', 'warning']).toContain(r.status);
    }
  });

  it('球塞进施工围挡中心应判定 collision', () => {
    const obs = gingko.obstacles[0];
    const s: Vec3 = { x: 5, y: 3.5, z: -1 };
    const t: Vec3 = { x: 5, y: 3.5, z: 1 };
    const r = computeSegmentClearanceStatus(
      s, t, 2, 0, [obs], zeroOff, 0.5
    );
    expect(r.status).toBe('collision');
    expect(r.minClearance).toBe(-1);
  });
});
