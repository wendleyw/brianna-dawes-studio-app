import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewMode = 'grid' | 'list';
type TimelineFilter = 'all' | 'active' | 'archived';

interface UIStore {
  // View preferences
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Filters (persisted across sessions)
  timelineFilter: TimelineFilter;
  projectTypeFilter: string | null;
  statusFilter: string | null;
  priorityFilter: string | null;
  setTimelineFilter: (filter: TimelineFilter) => void;
  setProjectTypeFilter: (filter: string | null) => void;
  setStatusFilter: (filter: string | null) => void;
  setPriorityFilter: (filter: string | null) => void;
  clearFilters: () => void;

  // Expanded states
  expandedProjectId: string | null;
  setExpandedProjectId: (id: string | null) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Defaults
      viewMode: 'grid',
      timelineFilter: 'all',
      projectTypeFilter: null,
      statusFilter: null,
      priorityFilter: null,
      expandedProjectId: null,
      sidebarOpen: true,

      // Actions
      setViewMode: (mode) => set({ viewMode: mode }),
      setTimelineFilter: (filter) => set({ timelineFilter: filter }),
      setProjectTypeFilter: (filter) => set({ projectTypeFilter: filter }),
      setStatusFilter: (filter) => set({ statusFilter: filter }),
      setPriorityFilter: (filter) => set({ priorityFilter: filter }),
      clearFilters: () => set({
        projectTypeFilter: null,
        statusFilter: null,
        priorityFilter: null,
      }),
      setExpandedProjectId: (id) => set({ expandedProjectId: id }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'ui-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        viewMode: state.viewMode,
        timelineFilter: state.timelineFilter,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
