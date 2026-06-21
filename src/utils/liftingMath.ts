import type { Vec3, Obstacle, LiftPoint, TreeData, LiftCombination, HeightPoint } from '@/types';

export function vecSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vecScale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function vecLen(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function vecDistance(a: Vec3, b: Vec3): number {
  return vecLen(vecSub(a, b));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

export function computeBallPosition(
  start: Vec3,
  target: Vec3,
  progress: number,
  liftHeight: number
): Vec3 {
  const horizontal = lerpVec({ x: start.x, y: 0, z: start.z }, { x: target.x, y: 0, z: target.z }, progress);
  const verticalOffset = Math.sin(progress * Math.PI) * liftHeight;
  return {
    x: horizontal.x,
    y: start.y + verticalOffset,
    z: horizontal.z,
  };
}

export function sphereIntersectsBox(
  sphereCenter: Vec3,
  sphereRadius: number,
  boxPos: Vec3,
  boxSize: Vec3
): boolean {
  const halfX = boxSize.x / 2;
  const halfY = boxSize.y / 2;
  const halfZ = boxSize.z / 2;

  const closestX = Math.max(boxPos.x - halfX, Math.min(sphereCenter.x, boxPos.x + halfX));
  const closestY = Math.max(boxPos.y - halfY, Math.min(sphereCenter.y, boxPos.y + halfY));
  const closestZ = Math.max(boxPos.z - halfZ, Math.min(sphereCenter.z, boxPos.z + halfZ));

  const dx = sphereCenter.x - closestX;
  const dy = sphereCenter.y - closestY;
  const dz = sphereCenter.z - closestZ;

  return dx * dx + dy * dy + dz * dz < sphereRadius * sphereRadius;
}

export function lineSegmentIntersectsBox(
  p1: Vec3,
  p2: Vec3,
  boxPos: Vec3,
  boxSize: Vec3
): boolean {
  const halfX = boxSize.x / 2;
  const halfY = boxSize.y / 2;
  const halfZ = boxSize.z / 2;
  const minX = boxPos.x - halfX;
  const maxX = boxPos.x + halfX;
  const minY = boxPos.y - halfY;
  const maxY = boxPos.y + halfY;
  const minZ = boxPos.z - halfZ;
  const maxZ = boxPos.z + halfZ;

  let tMin = 0;
  let tMax = 1;

  const d = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };

  for (const axis of ['x', 'y', 'z'] as const) {
    if (Math.abs(d[axis]) < 1e-8) {
      if (p1[axis] < (axis === 'x' ? minX : axis === 'y' ? minY : minZ) ||
          p1[axis] > (axis === 'x' ? maxX : axis === 'y' ? maxY : maxZ)) {
        return false;
      }
    } else {
      const invD = 1 / d[axis];
      let t1 = ((axis === 'x' ? minX : axis === 'y' ? minY : minZ) - p1[axis]) * invD;
      let t2 = ((axis === 'x' ? maxX : axis === 'y' ? maxY : maxZ) - p1[axis]) * invD;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

export function checkPathCollision(
  startPos: Vec3,
  targetPos: Vec3,
  ballRadius: number,
  liftHeight: number,
  obstacles: Obstacle[],
  swingOffset: Vec3 = { x: 0, y: 0, z: 0 },
  segments: number = 40
): { hasCollision: boolean; collisionPoints: Vec3[] } {
  const collisionPoints: Vec3[] = [];
  let hasCollision = false;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pos = computeBallPosition(startPos, targetPos, t, liftHeight);
    const offsetPos = vecAdd(pos, swingOffset);

    for (const obs of obstacles) {
      if (sphereIntersectsBox(offsetPos, ballRadius, obs.position, obs.size)) {
        hasCollision = true;
        collisionPoints.push(offsetPos);
      }
    }
  }

  for (const obs of obstacles) {
    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;
      const p1 = vecAdd(computeBallPosition(startPos, targetPos, t1, liftHeight), swingOffset);
      const p2 = vecAdd(computeBallPosition(startPos, targetPos, t2, liftHeight), swingOffset);
      if (lineSegmentIntersectsBox(p1, p2, obs.position, obs.size)) {
        hasCollision = true;
        break;
      }
    }
  }

  return { hasCollision, collisionPoints };
}

export function computeLiftHeight(
  ballStart: Vec3,
  ballTarget: Vec3,
  obstacles: Obstacle[],
  ballRadius: number
): number {
  let maxObstacleY = 0;
  for (const obs of obstacles) {
    const topY = obs.position.y + obs.size.y / 2;
    const startDist = Math.hypot(ballStart.x - obs.position.x, ballStart.z - obs.position.z);
    const targetDist = Math.hypot(ballTarget.x - obs.position.x, ballTarget.z - obs.position.z);
    const obsHalf = Math.hypot(obs.size.x, obs.size.z) / 2;
    if (startDist < obsHalf + ballRadius + 2 || targetDist < obsHalf + ballRadius + 2) {
      maxObstacleY = Math.max(maxObstacleY, topY);
    }
  }
  return Math.max(maxObstacleY - ballStart.y + ballRadius + 1, 3);
}

export function computeCableTonnage(
  ballWeight: number,
  liftPointA: Vec3,
  liftPointB: Vec3,
  ballPos: Vec3
): { tonnageA: number; tonnageB: number } {
  const cableA = vecSub(ballPos, liftPointA);
  const cableB = vecSub(ballPos, liftPointB);
  const lenA = vecLen(cableA);
  const lenB = vecLen(cableB);

  const dirA = vecScale(cableA, 1 / lenA);
  const dirB = vecScale(cableB, 1 / lenB);

  const horizontalA = Math.hypot(dirA.x, dirA.z);
  const horizontalB = Math.hypot(dirB.x, dirB.z);
  const vertA = Math.abs(dirA.y);
  const vertB = Math.abs(dirB.y);

  const angleFactorA = vertA > 0.01 ? 1 / vertA : 10;
  const angleFactorB = vertB > 0.01 ? 1 / vertB : 10;

  const totalFactor = angleFactorA + angleFactorB;
  const tonnageA = ballWeight * (angleFactorA / totalFactor) * (1 + horizontalA * 0.3);
  const tonnageB = ballWeight * (angleFactorB / totalFactor) * (1 + horizontalB * 0.3);

  return { tonnageA, tonnageB };
}

export function computeHeightCurve(
  startPos: Vec3,
  targetPos: Vec3,
  liftHeight: number,
  segments: number = 40
): HeightPoint[] {
  const points: HeightPoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pos = computeBallPosition(startPos, targetPos, t, liftHeight);
    points.push({ progress: t, height: pos.y });
  }
  return points;
}

export function computeAllCombinations(
  tree: TreeData,
  swingCm: number = 0
): LiftCombination[] {
  const results: LiftCombination[] = [];
  const { soilBall, obstacles, liftPoints, targetPit } = tree;
  const ballRadius = soilBall.diameter / 2;
  const startPos = soilBall.centerOfMass;
  const targetPos = { x: targetPit.position.x, y: targetPit.depth + ballRadius, z: targetPit.position.z };
  const liftHeight = computeLiftHeight(startPos, targetPos, obstacles, ballRadius);

  for (let i = 0; i < liftPoints.length; i++) {
    for (let j = i + 1; j < liftPoints.length; j++) {
      const lpA = liftPoints[i];
      const lpB = liftPoints[j];

      let peakTonnage = 0;
      const segments = 40;

      for (let k = 0; k <= segments; k++) {
        const t = k / segments;
        const ballPos = computeBallPosition(startPos, targetPos, t, liftHeight);
        const { tonnageA, tonnageB } = computeCableTonnage(soilBall.weight, lpA.position, lpB.position, ballPos);
        peakTonnage = Math.max(peakTonnage, tonnageA, tonnageB);
      }

      const swingRad = swingCm / 100;
      const swingOffset: Vec3 = { x: swingRad, y: 0, z: swingRad };
      const { hasCollision } = checkPathCollision(
        startPos,
        targetPos,
        ballRadius,
        liftHeight,
        obstacles,
        swingOffset
      );

      const minRated = Math.min(lpA.ratedTonnage, lpB.ratedTonnage);
      const tonnageInsufficient = peakTonnage > minRated;

      const heightCurve = computeHeightCurve(startPos, targetPos, liftHeight).map(p => p.height);

      results.push({
        pointA: lpA.id,
        pointB: lpB.id,
        peakTonnage: Math.round(peakTonnage * 100) / 100,
        hasCollision,
        tonnageInsufficient,
        heightCurve,
      });
    }
  }

  return results;
}

export function getLiftPointById(tree: TreeData, id: string): LiftPoint | undefined {
  return tree.liftPoints.find(lp => lp.id === id);
}
