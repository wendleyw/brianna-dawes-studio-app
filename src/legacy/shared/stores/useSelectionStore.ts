import { create } from 'zustand';

interface SelectionStore {
  // Project selection
  selectedProjects: Set<string>;
  toggleProject: (id: string) => void;
  selectAllProjects: (ids: string[]) => void;
  clearProjectSelection: () => void;
  isProjectSelected: (id: string) => boolean;

  // Deliverable selection
  selectedDeliverables: Set<string>;
  toggleDeliverable: (id: string) => void;
  clearDeliverableSelection: () => void;

  // Bulk actions
  clearAllSelections: () => void;
}

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selectedProjects: new Set(),
  selectedDeliverables: new Set(),

  toggleProject: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedProjects);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedProjects: newSet };
    }),

  selectAllProjects: (ids) => set({ selectedProjects: new Set(ids) }),

  clearProjectSelection: () => set({ selectedProjects: new Set() }),

  isProjectSelected: (id) => get().selectedProjects.has(id),

  toggleDeliverable: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedDeliverables);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedDeliverables: newSet };
    }),

  clearDeliverableSelection: () => set({ selectedDeliverables: new Set() }),

  clearAllSelections: () =>
    set({
      selectedProjects: new Set(),
      selectedDeliverables: new Set(),
    }),
}));
