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
