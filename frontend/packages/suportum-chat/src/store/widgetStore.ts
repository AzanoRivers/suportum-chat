import { create } from 'zustand'

interface WidgetState {
  isOpen: boolean
  isExpanded: boolean
  isMinimized: boolean
  open: () => void
  close: () => void
  expand: () => void
  collapse: () => void
  minimize: () => void
  restore: () => void
}

export const useWidgetStore = create<WidgetState>((set) => ({
  isOpen: false,
  isExpanded: false,
  isMinimized: false,
  open: () => set({ isOpen: true, isMinimized: false }),
  close: () => set({ isOpen: false, isMinimized: false }),
  expand: () => set({ isExpanded: true }),
  collapse: () => set({ isExpanded: false }),
  minimize: () => set({ isMinimized: true }),
  restore: () => set({ isMinimized: false }),
}))
