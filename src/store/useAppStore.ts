import { create } from 'zustand';
import type { TreeData, LiftCombination, ProfileData } from '@/types';
import { mockTrees } from '@/data/mockTrees';
import { computeAllCombinations, computeProfileData, getLiftPointById } from '@/utils/liftingMath';

interface AppState {
  trees: TreeData[];
  currentTreeId: string;
  selectedLiftPoints: string[];
  swingCm: number;
  animationProgress: number;
  isAnimating: boolean;
  combinations: LiftCombination[];
  canvasRef: HTMLCanvasElement | null;
  profileData: ProfileData | null;
  selectedSegmentIndex: number | null;

  setCurrentTree: (id: string) => void;
  toggleLiftPoint: (id: string) => void;
  setSwingCm: (cm: number) => void;
  setAnimationProgress: (p: number) => void;
  setIsAnimating: (a: boolean) => void;
  setCanvasRef: (c: HTMLCanvasElement | null) => void;
  recomputeCombinations: () => void;
  recomputeProfile: () => void;
  setSelectedSegmentIndex: (idx: number | null) => void;
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
  profileData: null,
  selectedSegmentIndex: null,

  setCurrentTree: (id) => {
    const tree = get().trees.find(t => t.id === id);
    if (tree) {
      set({
        currentTreeId: id,
        selectedLiftPoints: [],
        animationProgress: 0,
        isAnimating: false,
        combinations: computeAllCombinations(tree, get().swingCm),
        profileData: null,
        selectedSegmentIndex: null,
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
    set({
      selectedLiftPoints: next,
      animationProgress: 0,
      isAnimating: false,
      selectedSegmentIndex: null,
    });
    get().recomputeProfile();
  },

  setSwingCm: (cm) => {
    set({ swingCm: cm });
    get().recomputeCombinations();
    get().recomputeProfile();
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

  recomputeProfile: () => {
    const { currentTreeId, trees, swingCm, selectedLiftPoints } = get();
    const tree = trees.find(t => t.id === currentTreeId);
    if (!tree || selectedLiftPoints.length !== 2) {
      set({ profileData: null, selectedSegmentIndex: null });
      return;
    }
    const lpA = getLiftPointById(tree, selectedLiftPoints[0]);
    const lpB = getLiftPointById(tree, selectedLiftPoints[1]);
    if (!lpA || !lpB) {
      set({ profileData: null });
      return;
    }
    const profile = computeProfileData(tree, lpA.position, lpB.position, swingCm);
    set({ profileData: profile });
  },

  setSelectedSegmentIndex: (idx) => set({ selectedSegmentIndex: idx }),
}));

export function getCurrentTree(): TreeData | undefined {
  const { trees, currentTreeId } = useAppStore.getState();
  return trees.find(t => t.id === currentTreeId);
}
