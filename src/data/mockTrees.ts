import type { TreeData } from '@/types';

export const mockTrees: TreeData[] = [
  {
    id: 'tree-001',
    name: '古银杏树（太平街）',
    soilBall: {
      diameter: 2.4,
      centerOfMass: { x: 0, y: 1.2, z: 0 },
      weight: 18,
    },
    obstacles: [
      {
        id: 'obs-1',
        name: '围墙',
        position: { x: 5, y: 1.5, z: 0 },
        size: { x: 0.5, y: 3, z: 8 },
      },
      {
        id: 'obs-2',
        name: '电力杆',
        position: { x: -3, y: 2, z: 4 },
        size: { x: 0.4, y: 5, z: 0.4 },
      },
      {
        id: 'obs-3',
        name: '景观亭',
        position: { x: 2, y: 2, z: -5 },
        size: { x: 4, y: 4, z: 4 },
      },
    ],
    liftPoints: [
      {
        id: 'lp-1',
        name: '吊点A-东侧',
        position: { x: 8, y: 12, z: 2 },
        ratedTonnage: 25,
      },
      {
        id: 'lp-2',
        name: '吊点B-南侧',
        position: { x: 3, y: 14, z: -8 },
        ratedTonnage: 20,
      },
      {
        id: 'lp-3',
        name: '吊点C-西侧',
        position: { x: -7, y: 10, z: 1 },
        ratedTonnage: 15,
      },
      {
        id: 'lp-4',
        name: '吊点D-北侧',
        position: { x: -1, y: 11, z: 9 },
        ratedTonnage: 22,
      },
    ],
    targetPit: {
      position: { x: 10, y: 0, z: 6 },
      depth: 1.8,
      diameter: 3.0,
    },
  },
  {
    id: 'tree-002',
    name: '古槐树（公园北路）— 吨位临界',
    soilBall: {
      diameter: 3.0,
      centerOfMass: { x: 0, y: 1.5, z: 0 },
      weight: 32,
    },
    obstacles: [
      {
        id: 'obs-4',
        name: '地下管线走廊',
        position: { x: 4, y: 0.3, z: 0 },
        size: { x: 2, y: 0.6, z: 10 },
      },
      {
        id: 'obs-5',
        name: '门楼建筑',
        position: { x: -5, y: 3, z: -4 },
        size: { x: 3, y: 6, z: 3 },
      },
    ],
    liftPoints: [
      {
        id: 'lp-5',
        name: '吊点E-东北',
        position: { x: 6, y: 15, z: 6 },
        ratedTonnage: 16,
      },
      {
        id: 'lp-6',
        name: '吊点F-西南',
        position: { x: -6, y: 14, z: -6 },
        ratedTonnage: 16,
      },
      {
        id: 'lp-7',
        name: '吊点G-东南（唯一大吨位）',
        position: { x: 7, y: 16, z: -5 },
        ratedTonnage: 30,
      },
      {
        id: 'lp-8',
        name: '吊点H-西北',
        position: { x: -7, y: 13, z: 5 },
        ratedTonnage: 14,
      },
    ],
    targetPit: {
      position: { x: -10, y: 0, z: 8 },
      depth: 2.2,
      diameter: 3.6,
    },
  },
];
