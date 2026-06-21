import type { Vec3, Obstacle, LiftPoint, TreeData, LiftCombination, HeightPoint, PathSegment, ObstacleProjection, ProfileData, SegmentStatus } from '@/types';

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
  ballRadius: number,
  liftPointA?: Vec3,
  liftPointB?: Vec3
): number {
  if (liftPointA && liftPointB) {
    const minLiftY = Math.min(liftPointA.y, liftPointB.y);
    const safeHeight = minLiftY - ballRadius - 1.5;
    return Math.max(safeHeight - ballStart.y, 2);
  }
  return 3;
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

  for (let i = 0; i < liftPoints.length; i++) {
    for (let j = i + 1; j < liftPoints.length; j++) {
      const lpA = liftPoints[i];
      const lpB = liftPoints[j];

      const comboLiftHeight = computeLiftHeight(
        startPos, targetPos, obstacles, ballRadius, lpA.position, lpB.position
      );
      let peakTonnage = 0;
      const segments = 40;

      for (let k = 0; k <= segments; k++) {
        const t = k / segments;
        const ballPos = computeBallPosition(startPos, targetPos, t, comboLiftHeight);
        const { tonnageA, tonnageB } = computeCableTonnage(soilBall.weight, lpA.position, lpB.position, ballPos);
        peakTonnage = Math.max(peakTonnage, tonnageA, tonnageB);
      }

      const swingRad = swingCm / 100;
      const swingOffset: Vec3 = { x: swingRad, y: 0, z: swingRad };
      const { hasCollision } = checkPathCollision(
        startPos,
        targetPos,
        ballRadius,
        comboLiftHeight,
        obstacles,
        swingOffset
      );

      const minRated = Math.min(lpA.ratedTonnage, lpB.ratedTonnage);
      const tonnageInsufficient = peakTonnage > minRated;

      const heightCurve = computeHeightCurve(startPos, targetPos, comboLiftHeight).map(p => p.height);

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

export function horizontalDistance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function computePointToBoxClearance(
  sphereCenter: Vec3,
  sphereRadius: number,
  boxPos: Vec3,
  boxSize: Vec3
): number {
  const halfX = boxSize.x / 2;
  const halfY = boxSize.y / 2;
  const halfZ = boxSize.z / 2;

  const closestX = Math.max(boxPos.x - halfX, Math.min(sphereCenter.x, boxPos.x + halfX));
  const closestY = Math.max(boxPos.y - halfY, Math.min(sphereCenter.y, boxPos.y + halfY));
  const closestZ = Math.max(boxPos.z - halfZ, Math.min(sphereCenter.z, boxPos.z + halfZ));

  const dx = sphereCenter.x - closestX;
  const dy = sphereCenter.y - closestY;
  const dz = sphereCenter.z - closestZ;

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return distance - sphereRadius;
}

export function progressToDistance(progress: number, totalDistance: number): number {
  return progress * totalDistance;
}

export function distanceToProgress(distance: number, totalDistance: number): number {
  return totalDistance > 0 ? distance / totalDistance : 0;
}

export function projectObstacleOnPath(
  startPos: Vec3,
  targetPos: Vec3,
  obstacle: Obstacle,
  totalDistance: number,
  ballRadius: number,
  liftHeight: number,
  swingOffset: Vec3 = { x: 0, y: 0, z: 0 }
): ObstacleProjection | null {
  const pathDir = {
    x: (targetPos.x - startPos.x),
    y: 0,
    z: (targetPos.z - startPos.z),
  };
  const pathLen = Math.sqrt(pathDir.x * pathDir.x + pathDir.z * pathDir.z);
  if (pathLen < 0.001) return null;

  const pathDirN = {
    x: pathDir.x / pathLen,
    y: 0,
    z: pathDir.z / pathLen,
  };

  const halfX = obstacle.size.x / 2;
  const halfZ = obstacle.size.z / 2;
  const obsMinX = obstacle.position.x - halfX;
  const obsMaxX = obstacle.position.x + halfX;
  const obsMinZ = obstacle.position.z - halfZ;
  const obsMaxZ = obstacle.position.z + halfZ;
  const obsTop = obstacle.position.y + obstacle.size.y / 2;
  const obsBottom = obstacle.position.y - obstacle.size.y / 2;

  const corners = [
    { x: obsMinX, z: obsMinZ },
    { x: obsMinX, z: obsMaxZ },
    { x: obsMaxX, z: obsMinZ },
    { x: obsMaxX, z: obsMaxZ },
  ];

  let minT = Infinity;
  let maxT = -Infinity;

  for (const corner of corners) {
    const rel = {
      x: corner.x - startPos.x,
      z: corner.z - startPos.z,
    };
    const t = rel.x * pathDirN.x + rel.z * pathDirN.z;
    minT = Math.min(minT, t);
    maxT = Math.max(maxT, t);
  }

  if (maxT < -ballRadius || minT > pathLen + ballRadius) {
    return null;
  }

  const startT = Math.max(0, minT - ballRadius);
  const endT = Math.min(pathLen, maxT + ballRadius);

  if (endT <= startT) return null;

  const sampleCount = 20;
  let worstStatus: SegmentStatus = 'safe';

  for (let i = 0; i <= sampleCount; i++) {
    const t = startT + (endT - startT) * (i / sampleCount);
    const progress = t / pathLen;
    const ballPos = computeBallPosition(startPos, targetPos, progress, liftHeight);
    const offsetPos = vecAdd(ballPos, swingOffset);

    if (sphereIntersectsBox(offsetPos, ballRadius, obstacle.position, obstacle.size)) {
      worstStatus = 'collision';
      break;
    }

    const clearance = computePointToBoxClearance(offsetPos, ballRadius, obstacle.position, obstacle.size);
    if (clearance < 0.5 && worstStatus === 'safe') {
      worstStatus = 'warning';
    }
  }

  return {
    obstacleId: obstacle.id,
    obstacleName: obstacle.name,
    startDistance: startT,
    endDistance: endT,
    topHeight: obsTop,
    bottomHeight: Math.max(0, obsBottom),
    status: worstStatus,
  };
}

export function computeSegmentClearanceStatus(
  startPos: Vec3,
  targetPos: Vec3,
  ballRadius: number,
  liftHeight: number,
  obstacles: Obstacle[],
  swingOffset: Vec3,
  progress: number
): { status: SegmentStatus; minClearance: number } {
  const pos = computeBallPosition(startPos, targetPos, progress, liftHeight);
  const offsetPos = vecAdd(pos, swingOffset);

  let minClearance = Infinity;
  let status: SegmentStatus = 'safe';

  for (const obs of obstacles) {
    if (sphereIntersectsBox(offsetPos, ballRadius, obs.position, obs.size)) {
      return { status: 'collision', minClearance: -1 };
    }
    const clearance = computePointToBoxClearance(offsetPos, ballRadius, obs.position, obs.size);
    minClearance = Math.min(minClearance, clearance);
  }

  if (minClearance < 0.5) {
    status = 'warning';
  }

  return { status, minClearance };
}

export function computeProfileData(
  tree: TreeData,
  liftPointA?: Vec3,
  liftPointB?: Vec3,
  swingCm: number = 0,
  segmentsCount: number = 40
): ProfileData | null {
  const ballRadius = tree.soilBall.diameter / 2;
  const startPos = tree.soilBall.centerOfMass;
  const targetPos = {
    x: tree.targetPit.position.x,
    y: tree.targetPit.depth + ballRadius,
    z: tree.targetPit.position.z,
  };
  const totalDistance = horizontalDistance(startPos, targetPos);

  if (totalDistance < 0.1) return null;

  const liftHeight = computeLiftHeight(
    startPos, targetPos, tree.obstacles, ballRadius, liftPointA, liftPointB
  );

  const swingRad = swingCm / 100;
  const swingOffset: Vec3 = { x: swingRad, y: 0, z: swingRad };

  const segments: PathSegment[] = [];
  let maxHeight = 0;

  for (let i = 0; i < segmentsCount; i++) {
    const startProgress = i / segmentsCount;
    const endProgress = (i + 1) / segmentsCount;
    const midProgress = (startProgress + endProgress) / 2;

    const startPosBall = computeBallPosition(startPos, targetPos, startProgress, liftHeight);
    const endPosBall = computeBallPosition(startPos, targetPos, endProgress, liftHeight);

    const { status, minClearance } = computeSegmentClearanceStatus(
      startPos, targetPos, ballRadius, liftHeight, tree.obstacles, swingOffset, midProgress
    );

    const startHeight = startPosBall.y;
    const endHeight = endPosBall.y;
    maxHeight = Math.max(maxHeight, startHeight, endHeight);

    segments.push({
      segmentIndex: i,
      startProgress,
      endProgress,
      startHeight,
      endHeight,
      startDistance: progressToDistance(startProgress, totalDistance),
      endDistance: progressToDistance(endProgress, totalDistance),
      status,
      minClearance,
    });
  }

  const obstacleProjections: ObstacleProjection[] = [];
  for (const obs of tree.obstacles) {
    const proj = projectObstacleOnPath(
      startPos, targetPos, obs, totalDistance, ballRadius, liftHeight, swingOffset
    );
    if (proj) {
      obstacleProjections.push(proj);
    }
  }

  return {
    totalDistance,
    maxHeight: Math.max(maxHeight + 1, 5),
    segments,
    obstacleProjections,
    startPos,
    targetPos,
    ballRadius,
  };
}
