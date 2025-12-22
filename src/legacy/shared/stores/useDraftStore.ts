import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProjectDraft {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  clientId?: string;
  designers?: string[];
  dueDate?: string;
  googleDriveUrl?: string;
}

interface DeliverableDraft {
  name: string;
  type: string;
  status: string;
  dueDate?: string;
}

interface DraftStore {
  // Project draft
  projectDraft: ProjectDraft | null;
  saveProjectDraft: (draft: ProjectDraft) => void;
  clearProjectDraft: () => void;
  hasProjectDraft: boolean;

  // Deliverable draft
  deliverableDraft: DeliverableDraft | null;
  saveDeliverableDraft: (draft: DeliverableDraft) => void;
  clearDeliverableDraft: () => void;
  hasDeliverableDraft: boolean;

  // Clear all drafts
  clearAllDrafts: () => void;
}

export const useDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      projectDraft: null,
      deliverableDraft: null,

      saveProjectDraft: (draft) => set({ projectDraft: draft }),
      clearProjectDraft: () => set({ projectDraft: null }),
      get hasProjectDraft() {
        return get().projectDraft !== null;
      },

      saveDeliverableDraft: (draft) => set({ deliverableDraft: draft }),
      clearDeliverableDraft: () => set({ deliverableDraft: null }),
      get hasDeliverableDraft() {
        return get().deliverableDraft !== null;
      },

      clearAllDrafts: () =>
        set({
          projectDraft: null,
          deliverableDraft: null,
        }),
    }),
    {
      name: 'draft-storage',
    }
  )
);
