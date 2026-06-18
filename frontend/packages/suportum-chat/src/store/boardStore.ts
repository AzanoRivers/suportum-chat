import { create } from 'zustand'

interface BoardState {
  isExpanded: boolean
  expand: () => void
  collapse: () => void
}

export const useBoardStore = create<BoardState>((set) => ({
  isExpanded: false,
  expand: () => set({ isExpanded: true }),
  collapse: () => set({ isExpanded: false }),
}))
