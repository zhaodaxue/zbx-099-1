import { create } from 'zustand';
import type { TreeData, LiftCombination } from '@/types';
import { mockTrees } from '@/data/mockTrees';
import { computeAllCombinations } from '@/utils/liftingMath';

interface AppState {
  trees: TreeData[];
  currentTreeId: string;
  selectedLiftPoints: string[];
  swingCm: number;
  animationProgress: number;
  isAnimating: boolean;
  combinations: LiftCombination[];
  canvasRef: HTMLCanvasElement | null;

  setCurrentTree: (id: string) => void;
  toggleLiftPoint: (id: string) => void;
  setSwingCm: (cm: number) => void;
  setAnimationProgress: (p: number) => void;
  setIsAnimating: (a: boolean) => void;
  setCanvasRef: (c: HTMLCanvasElement | null) => void;
  recomputeCombinations: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  trees: mockTrees,
  currentTreeId: mockTrees[0].id,
  selectedLiftPoints: [],
  swingCm: 0,
  animationProgress: 0,
  isAnimating: false,
  combinations: computeAllCombinations(mockTrees[0], 0),
  canvasRef: null,

  setCurrentTree: (id) => {
    const tree = get().trees.find(t => t.id === id);
    if (tree) {
      set({
        currentTreeId: id,
        selectedLiftPoints: [],
        animationProgress: 0,
        isAnimating: false,
        combinations: computeAllCombinations(tree, get().swingCm),
      });
    }
  },

  toggleLiftPoint: (id) => {
    const { selectedLiftPoints } = get();
    let next: string[];
    if (selectedLiftPoints.includes(id)) {
      next = selectedLiftPoints.filter(p => p !== id);
    } else if (selectedLiftPoints.length >= 2) {
      next = [selectedLiftPoints[1], id];
    } else {
      next = [...selectedLiftPoints, id];
    }
    set({ selectedLiftPoints: next, animationProgress: 0, isAnimating: false });
  },

  setSwingCm: (cm) => {
    set({ swingCm: cm });
    get().recomputeCombinations();
  },

  setAnimationProgress: (p) => set({ animationProgress: p }),
  setIsAnimating: (a) => set({ isAnimating: a }),
  setCanvasRef: (c) => set({ canvasRef: c }),

  recomputeCombinations: () => {
    const { currentTreeId, trees, swingCm } = get();
    const tree = trees.find(t => t.id === currentTreeId);
    if (tree) {
      set({ combinations: computeAllCombinations(tree, swingCm) });
    }
  },
}));

export function getCurrentTree(): TreeData | undefined {
  const { trees, currentTreeId } = useAppStore.getState();
  return trees.find(t => t.id === currentTreeId);
}
