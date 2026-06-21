export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SoilBall {
  diameter: number;
  centerOfMass: Vec3;
  weight: number;
}

export interface Obstacle {
  id: string;
  name: string;
  position: Vec3;
  size: Vec3;
}

export interface LiftPoint {
  id: string;
  name: string;
  position: Vec3;
  ratedTonnage: number;
}

export interface TreePit {
  position: Vec3;
  depth: number;
  diameter: number;
}

export interface TreeData {
  id: string;
  name: string;
  soilBall: SoilBall;
  obstacles: Obstacle[];
  liftPoints: LiftPoint[];
  targetPit: TreePit;
}

export interface LiftCombination {
  pointA: string;
  pointB: string;
  peakTonnage: number;
  hasCollision: boolean;
  tonnageInsufficient: boolean;
  heightCurve: number[];
}

export interface HeightPoint {
  progress: number;
  height: number;
}

export type SegmentStatus = 'safe' | 'warning' | 'collision';

export interface PathSegment {
  segmentIndex: number;
  startProgress: number;
  endProgress: number;
  startHeight: number;
  endHeight: number;
  startDistance: number;
  endDistance: number;
  status: SegmentStatus;
  minClearance: number;
}

export interface ObstacleProjection {
  obstacleId: string;
  obstacleName: string;
  startDistance: number;
  endDistance: number;
  topHeight: number;
  bottomHeight: number;
  status: SegmentStatus;
}

export interface ProfileData {
  totalDistance: number;
  maxHeight: number;
  segments: PathSegment[];
  obstacleProjections: ObstacleProjection[];
  startPos: Vec3;
  targetPos: Vec3;
  ballRadius: number;
}
