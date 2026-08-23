import { create } from "zustand";

export type Point = {
  x: number;
  y: number;
};

export type Stroke = {
  points: Point[];
  color: string;
  isEraser: boolean;
};

interface MemoState {
  strokes: Stroke[];
  currentStroke: Point[];
  currentColor: string;
  isEraser: boolean;

  setColor: (color: string) => void;
  toggleEraser: () => void;
  addPointToCurrent: (point: Point) => void;
  commitCurrentStroke: () => void;
  clearStrokes: () => void;
}

export const useMemoStore = create<MemoState>((set, get) => ({
  strokes: [],
  currentStroke: [],
  currentColor: "#000",
  isEraser: false,

  setColor: (color) => set({ currentColor: color, isEraser: false }),
  toggleEraser: () => set((s) => ({ isEraser: !s.isEraser })),

  addPointToCurrent: (point) =>
    set((s) => ({ currentStroke: [...s.currentStroke, point] })),

  commitCurrentStroke: () => {
    const { currentStroke, currentColor, isEraser } = get();
    if (currentStroke.length === 0) return;
    const newStroke: Stroke = {
      points: currentStroke,
      color: isEraser ? "#fff" : currentColor,
      isEraser,
    };
    set((s) => ({
      strokes: [...s.strokes, newStroke],
      currentStroke: [],
    }));
  },

  clearStrokes: () => set({ strokes: [], currentStroke: [] }),
}));
