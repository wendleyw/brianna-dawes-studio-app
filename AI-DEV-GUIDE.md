const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        Header, Footer, AlignmentType, LevelFormat, 
        HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber, PageBreak } = require('docx');
const fs = require('fs');

const COLORS = {
  primary: "050038",
  accent: "2563EB",
  success: "10B981",
  gray: "6B7280",
  lightGray: "E5E7EB",
  headerBg: "1E3A5F"
};

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: COLORS.lightGray };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

const createHeading1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  children: [new TextRun({ text, bold: true, size: 32, color: COLORS.primary })]
});

const createHeading2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 150 },
  children: [new TextRun({ text, bold: true, size: 26, color: COLORS.primary })]
});

const createHeading3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 100 },
  children: [new TextRun({ text, bold: true, size: 22, color: COLORS.gray })]
});

const createParagraph = (text) => new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text, size: 22 })]
});

const createCodeBlock = (code) => new Paragraph({
  spacing: { before: 100, after: 100 },
  shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
  indent: { left: 200, right: 200 },
  children: [new TextRun({ text: code, font: "Courier New", size: 16 })]
});

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 48, bold: true, color: COLORS.primary, font: "Arial" },
        paragraph: { spacing: { before: 0, after: 200 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: COLORS.primary, font: "Arial" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: COLORS.primary, font: "Arial" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, color: COLORS.gray, font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } }
    ]
  },
  numbering: {
    config: [
      { reference: "main-bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-1",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-2",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-3",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-4",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "AI Development Guide - Brianna Miro App", size: 18, color: COLORS.gray })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", size: 18 }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
            new TextRun({ text: " of ", size: 18 }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 })
          ]
        })]
      })
    },
    children: [
      // TITLE PAGE
      new Paragraph({ spacing: { before: 1500 } }),
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: "AI Development Guide", bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "Brianna Dawes Studios Miro App", size: 32, color: COLORS.accent })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: "Step-by-Step Implementation Guide for AI-Assisted Development", size: 22, color: COLORS.gray })]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 1: PROMPTS FOR EACH PHASE
      createHeading1("1. AI Prompts by Development Phase"),
      createParagraph("Use these prompts to guide AI-assisted development. Each prompt is designed to produce complete, production-ready code."),

      createHeading2("Phase 1: Project Setup"),
      createHeading3("Prompt 1.1: Initialize Project"),
      createCodeBlock(`Create a new Vite + React + TypeScript project with the following configuration:
- React 19
- TypeScript 5.x with strict mode
- Vite 6
- Path aliases configured (@features, @shared, @config)
- ESLint + Prettier setup
- CSS Modules support

Include package.json, tsconfig.json, vite.config.ts, and folder structure.`),

      createHeading3("Prompt 1.2: Design System Setup"),
      createCodeBlock(`Create a Design System with the following components in TypeScript + CSS Modules:

1. Button - variants: primary, secondary, ghost, danger; sizes: sm, md, lg; loading state
2. Card - with header, body, footer slots; hover effect
3. Badge - variants: success, warning, error, info, neutral
4. Input - with label, error state, helper text
5. Dialog/Modal - with overlay, close button, accessibility
6. Toast - success, error, info variants; auto-dismiss; stack support
7. Skeleton - for loading states

Use these design tokens:
- Primary: #050038
- Accent: #2563EB
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444
- Font: Inter for UI, Playfair Display for headings
- Spacing: 4, 8, 12, 16, 24, 32px scale
- Border radius: 4, 8, 12px

Each component should be fully typed with TypeScript interfaces.`),

      createHeading3("Prompt 1.3: Supabase Schema"),
      createCodeBlock(`Create the complete Supabase database schema for a project management system with:

Tables:
1. users (id, email, role, name, avatar_url, miro_user_id, timestamps)
   - role enum: admin, designer, client
2. projects (id, title, description, type, status, priority, due_date, budget, client_id, designer_id, created_by, miro_card_id, miro_frame_ids, timestamps)
   - status enum: draft, in_progress, review, done, archived
   - priority enum: urgent, high, medium, standard
3. deliverables (id, project_id, title, status, version, hours_est, hours_spent, file_url, notes, timestamps)
4. project_updates (id, project_id, author_id, type, payload JSONB, created_at)
5. files (id, project_id, deliverable_id, owner_id, url, mime_type, size, created_at)
6. audit_logs (id, actor_id, action, entity, entity_id, diff JSONB, created_at)

Include:
- All indexes for common queries
- RLS policies for admin (full access), designer (assigned projects), client (own projects)
- Foreign key relationships with appropriate ON DELETE actions
- Triggers for updated_at timestamps`),

      createHeading3("Prompt 1.4: Supabase RPC Functions"),
      createCodeBlock(`Create PostgreSQL functions for Supabase with proper error handling and RLS:

1. create_project(title, type, client_id, designer_id?, due_date?, priority, description?)
   - Validate user role (admin or client)
   - Client can only create for themselves
   - Return created project
   - Create initial project_update record

2. change_status(project_id, new_status)
   - Validate transition is allowed (draft->in_progress->review->done)
   - Create project_update record with from/to
   - Return updated project

3. assign_designer(project_id, designer_id)
   - Only admin can assign
   - Create project_update record
   - Return updated project

4. get_project_summary(project_id)
   - Return JSONB with project, deliverables count, hours totals, recent updates

5. create_deliverable(project_id, title, hours_est, file_url?)
   - Validate access to project
   - Return created deliverable

All functions should use SECURITY DEFINER and proper error messages.`),

      new Paragraph({ children: [new PageBreak()] }),

      createHeading2("Phase 2: Core Features"),
      createHeading3("Prompt 2.1: Authentication System"),
      createCodeBlock(`Create a complete authentication system using Supabase Auth with React:

1. AuthProvider context with:
   - User state (id, email, role, name)
   - isLoading, isAuthenticated states
   - login, logout, refreshSession methods
   - Auto-refresh token handling

2. useAuth hook exposing all context values

3. LoginPage component with:
   - Email + password form
   - Validation with error messages
   - Loading state
   - Redirect to dashboard on success

4. ProtectedRoute component that:
   - Checks authentication
   - Validates user role
   - Redirects to login if unauthenticated
   - Shows AccessDenied if wrong role

5. RoleBoardManager service that:
   - Maps roles to allowed Miro board IDs
   - Validates current board against user role
   - Returns redirect URL if wrong board

Use React Query for session management and Zod for validation.`),

      createHeading3("Prompt 2.2: Projects Feature"),
      createCodeBlock(`Create the complete Projects feature with Clean Architecture:

Domain Layer:
- Project entity type with all fields
- CreateProjectSchema, UpdateProjectSchema (Zod)
- ProjectStatus enum and transition rules
- ProjectPriority enum

API Layer (React Query):
- useProjects(filters) - list projects with filtering
- useProject(id) - single project
- useCreateProject() - mutation
- useUpdateProject() - mutation
- useChangeStatus() - mutation with optimistic update
- useAssignDesigner() - mutation

Components:
1. ProjectList - grid of ProjectCards with filters
2. ProjectCard - status badge, priority, due date, progress, quick actions
3. CreateProjectWizard - 3-step form (Basic, Details, Timeline)
4. ProjectDetail - full project view with sections
5. StatusDropdown - with transition validation
6. PriorityBadge - color-coded

Pages:
1. ProjectsPage - dashboard with list/filters
2. CreateProjectPage - wizard flow
3. ProjectDetailPage - detail view

Include loading, empty, and error states for all components.`),

      createHeading3("Prompt 2.3: Deliverables Feature"),
      createCodeBlock(`Create the Deliverables feature:

Types:
- Deliverable entity (id, project_id, title, status, version, hours_est, hours_spent, file_url, notes)
- DeliverableStatus enum: pending, wip, review, approved
- CreateDeliverableInput, UpdateDeliverableInput

API (React Query):
- useDeliverables(projectId)
- useCreateDeliverable()
- useUpdateDeliverable()
- useApproveDeliverable()

Components:
1. DeliverableList - list within project detail
2. DeliverableCard - status, version badge, hours display
3. DeliverableForm - create/edit modal
4. FileUpload - drag/drop with progress
5. VersionBadge - shows version number
6. HoursTracker - estimated vs spent

File Upload Flow:
1. Get signed URL from Supabase Storage
2. Upload file with progress tracking
3. Create file record in database
4. Link to deliverable

Version Management:
- New version increments automatically
- Previous versions preserved
- Version history viewable`),

      new Paragraph({ children: [new PageBreak()] }),

      createHeading2("Phase 3: Miro Integration"),
      createHeading3("Prompt 3.1: Miro SDK Setup"),
      createCodeBlock(`Create Miro SDK integration for React:

1. MiroProvider context:
   - Initialize SDK on mount
   - Get board info and user info
   - Expose miro instance
   - Health check with retry

2. useMiro hook:
   - boardId, userId, userName
   - isReady, error states
   - Helper methods: showNotification, openModal, zoomTo

3. MiroGuard component:
   - Shows loading while SDK initializes
   - Shows error if not in Miro iframe
   - Validates board access with RoleBoardManager

4. Board service adapter:
   - createFrame(title, position, size)
   - createStickyNote(content, position, style)
   - createShape(content, shape, position)
   - getById(id)
   - updateItem(id, properties)
   - deleteItem(id)

All with TypeScript types from @miro/sdk.`),

      createHeading3("Prompt 3.2: Master Timeline Service (Kanban)"),
      createCodeBlock(`Create MasterTimelineService for Kanban board management:

class MasterTimelineService {
  // State
  private columns: Map<ProjectStatus, string>; // status -> frame ID

  // Initialization
  async initialize(): Promise<void>
  // Find or create column frames for each status

  // Card Management
  async createProjectCard(project: Project): Promise<string>
  // Create sticky note in correct column, return Miro ID

  async moveCard(projectId: string, newStatus: ProjectStatus): Promise<void>
  // Move card to new column, update position

  async updateCard(project: Project): Promise<void>
  // Update card content (title, due, priority badge)

  async deleteCard(projectId: string): Promise<void>
  // Remove card from board

  // Helpers
  private getColumnPosition(status: ProjectStatus): { x: number, y: number }
  private getCardPosition(columnId: string): { x: number, y: number }
  private formatCardContent(project: Project): string
  private getPriorityColor(priority: ProjectPriority): string
  private getStatusColor(status: ProjectStatus): string
}

Store Miro IDs in project.miro_card_id.
Use batch operations where possible.
Include error handling and retry logic.`),

      createHeading3("Prompt 3.3: Brand Workspace Service"),
      createCodeBlock(`Create BrandWorkspaceService for project workspace frames:

class BrandWorkspaceService {
  // Create workspace
  async createProjectWorkspace(project: Project): Promise<WorkspaceRefs>
  // Returns: { container: string, brief: string, process: string }

  // Workspace sections
  private async createBriefFrame(project: Project, parent: Frame): Promise<Frame>
  // Contains: objectives, audience, overview sticky notes

  private async createProcessFrame(project: Project, parent: Frame): Promise<Frame>
  // Contains: stage columns (Research, Concept, Design, Deliver)

  // Updates
  async updateWorkspace(project: Project): Promise<void>
  // Update content in existing frames

  async addDeliverableToWorkspace(projectId: string, deliverable: Deliverable): Promise<void>
  // Add deliverable card to process frame

  // Navigation
  async highlightDeliverable(deliverableId: string): Promise<void>
}

Store frame IDs in project.miro_frame_ids JSONB.
Position management with PositionManagerService.`),

      createHeading3("Prompt 3.4: Board Sync Service"),
      createCodeBlock(`Create BoardSyncService for DB <-> Miro synchronization:

class BoardSyncService {
  // Real-time sync
  subscribeToUpdates(projectId: string): void
  // Listen to project_updates, update Miro accordingly

  handleStatusChange(projectId: string, newStatus: ProjectStatus): Promise<void>
  // Move kanban card

  handleDeliverableAdded(projectId: string, deliverable: Deliverable): Promise<void>
  // Update card badge, add to workspace

  // Reconciliation
  async resyncProject(projectId: string): Promise<SyncResult>
  // Compare DB state with Miro items, fix discrepancies

  async resyncAllProjects(): Promise<SyncResult[]>
  // Full board reconciliation

  // Sync result
  interface SyncResult {
    projectId: string;
    created: number;  // Items created in Miro
    updated: number;  // Items updated in Miro
    deleted: number;  // Orphaned items removed
    errors: string[];
  }
}

Include debouncing for rapid updates.
Log all sync operations for debugging.`),

      new Paragraph({ children: [new PageBreak()] }),

      createHeading2("Phase 4: Advanced Features"),
      createHeading3("Prompt 4.1: Real-time Updates"),
      createCodeBlock(`Create real-time update system using Supabase Realtime:

1. RealtimeProvider context:
   - Subscribe to project_updates table
   - Parse update types and dispatch to handlers
   - Handle reconnection

2. useProjectUpdates(projectId) hook:
   - Subscribe to specific project
   - Return recent updates
   - Trigger React Query invalidation

3. Update handlers:
   - status_changed -> invalidate project, move Miro card
   - deliverable_added -> invalidate deliverables, update Miro badge
   - assignment_changed -> invalidate project

4. Toast notifications:
   - Show toast when updates received
   - Different styles for different update types

5. Optimistic updates:
   - Update UI immediately on user action
   - Rollback if server rejects

Include connection status indicator.`),

      createHeading3("Prompt 4.2: Reports & Analytics"),
      createCodeBlock(`Create reporting system:

1. useProjectSummary(projectId) hook:
   - Calls get_project_summary RPC
   - Returns metrics: deliverables count, hours, status

2. useDashboardMetrics() hook for admin:
   - Total projects by status
   - Overdue projects count
   - Hours budget vs actual
   - Deliverables pending approval

3. Components:
   - KPICard (value, label, trend indicator)
   - ProjectTimeline (Gantt-style view)
   - StatusDistribution (pie/bar chart)
   - HoursReport (table with totals)

4. Export functionality:
   - Export to CSV
   - Export to JSON

Use recharts for visualizations.`),

      createHeading3("Prompt 4.3: Notification System"),
      createCodeBlock(`Create notification system:

1. NotificationService:
   - sendEmail(to, template, data) using Postmark
   - Templates: project_created, status_changed, deliverable_added, assignment

2. In-app notifications:
   - NotificationProvider with toast queue
   - useNotifications hook
   - NotificationCenter component (bell icon + dropdown)

3. Notification preferences:
   - Per-user settings (email on/off per event type)
   - Stored in user profile

4. Trigger points:
   - Project created -> notify admin + assigned designer
   - Status changed -> notify relevant parties
   - Deliverable ready for review -> notify client
   - Deliverable approved -> notify designer

5. Edge Function for sending:
   - POST /functions/v1/notify
   - Validates user preferences
   - Sends email via Postmark`),

      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 2: CODE TEMPLATES
      createHeading1("2. Code Templates"),

      createHeading2("2.1 Feature Module Template"),
      createCodeBlock(`// features/[feature-name]/
├── components/
│   ├── [Feature]Card.tsx
│   ├── [Feature]Form.tsx
│   ├── [Feature]List.tsx
│   └── index.ts
├── hooks/
│   ├── use[Feature]s.ts
│   ├── use[Feature]Mutations.ts
│   └── index.ts
├── api/
│   └── [feature]Api.ts
├── domain/
│   ├── [feature].types.ts
│   └── [feature].schema.ts
├── pages/
│   ├── [Feature]sPage.tsx
│   └── [Feature]DetailPage.tsx
└── index.ts`),

      createHeading2("2.2 React Query Hook Template"),
      createCodeBlock(`// features/projects/hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projectsApi';
import type { Project, ProjectFilters, CreateProjectInput } from '../domain/project.types';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: ProjectFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => projectsApi.list(filters),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}`),

      createHeading2("2.3 Supabase API Template"),
      createCodeBlock(`// features/projects/api/projectsApi.ts
import { supabase } from '@shared/lib/supabase';
import type { Project, ProjectFilters, CreateProjectInput } from '../domain/project.types';

export const projectsApi = {
  async list(filters: ProjectFilters = {}): Promise<Project[]> {
    let query = supabase
      .from('projects')
      .select(\`
        *,
        client:users!client_id(id, name, email),
        designer:users!designer_id(id, name, email)
      \`)
      .order('created_at', { ascending: false });
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    
    const { data, error } = await query;
    if (error) throw new ApiError(error.message, error.code);
    return data;
  },

  async create(input: CreateProjectInput): Promise<Project> {
    const { data, error } = await supabase
      .rpc('create_project', {
        p_title: input.title,
        p_type: input.type,
        p_client_id: input.clientId,
        p_designer_id: input.designerId,
        p_due_date: input.dueDate,
        p_priority: input.priority,
        p_description: input.description,
      });
    
    if (error) throw new ApiError(error.message, error.code);
    return data;
  },

  async changeStatus(projectId: string, status: ProjectStatus): Promise<Project> {
    const { data, error } = await supabase
      .rpc('change_status', { p_project_id: projectId, p_new_status: status });
    
    if (error) throw new ApiError(error.message, error.code);
    return data;
  },
};`),

      createHeading2("2.4 Component Template with States"),
      createCodeBlock(`// features/projects/components/ProjectList.tsx
import { useProjects } from '../hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import { Skeleton, EmptyState, ErrorState } from '@shared/ui';

interface ProjectListProps {
  filters?: ProjectFilters;
  onProjectClick?: (id: string) => void;
}

export function ProjectList({ filters, onProjectClick }: ProjectListProps) {
  const { data: projects, isLoading, error, refetch } = useProjects(filters);

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={styles.cardSkeleton} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load projects"
        onRetry={refetch}
      />
    );
  }

  if (!projects?.length) {
    return (
      <EmptyState
        icon={<FolderIcon />}
        title="No projects yet"
        description="Create your first project to get started"
        action={<Button onClick={onCreate}>+ New Project</Button>}
      />
    );
  }

  return (
    <div className={styles.grid}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onProjectClick?.(project.id)}
        />
      ))}
    </div>
  );
}`),

      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 3: IMPLEMENTATION CHECKLIST
      createHeading1("3. Implementation Checklist"),

      createHeading2("Foundation"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Vite + React + TypeScript project initialized", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Path aliases configured (@features, @shared, @config)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Design System components created", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Supabase project created and configured", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Database schema deployed (tables, indexes, RLS)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] RPC functions deployed", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Environment variables configured", size: 22 })]
      }),

      createHeading2("Authentication"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] AuthProvider implemented", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Login page functional", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] ProtectedRoute working", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Role-based routing implemented", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Session persistence working", size: 22 })]
      }),

      createHeading2("Projects"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Project list page with filters", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Project cards with quick actions", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Create project wizard (3 steps)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Project detail page", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Status change with validation", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Designer assignment (admin only)", size: 22 })]
      }),

      createHeading2("Deliverables"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Deliverable list in project detail", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Create deliverable form", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] File upload with progress", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Version management", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Hours tracking", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Approval workflow", size: 22 })]
      }),

      createHeading2("Miro Integration"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] MiroProvider initialized", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] RoleBoardManager validating access", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] MasterTimelineService creating kanban", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Cards created on project creation", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Cards moved on status change", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] BrandWorkspaceService creating frames", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Navigation/zoom working", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Re-sync mechanism tested", size: 22 })]
      }),

      createHeading2("Real-time & Polish"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Realtime subscriptions working", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Optimistic updates implemented", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Toast notifications showing", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Error boundaries in place", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Loading states for all components", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] Empty states with CTAs", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "[ ] E2E tests passing", size: 22 })]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 4: TROUBLESHOOTING
      createHeading1("4. Troubleshooting Guide"),

      createHeading2("Common Issues"),

      createHeading3("RLS Policy Blocking Requests"),
      createCodeBlock(`Problem: Supabase returns empty array or 403

Solution:
1. Check if user has valid session: supabase.auth.getSession()
2. Verify role in users table matches expected
3. Test RLS policy directly in SQL editor
4. Check if auth.uid() matches expected user ID

Debug query:
SELECT auth.uid(), auth.role(), 
       (SELECT role FROM users WHERE id = auth.uid())`),

      createHeading3("Miro SDK Not Initializing"),
      createCodeBlock(`Problem: miro.board.getInfo() throws error

Solution:
1. Verify running inside Miro iframe (check window.parent !== window)
2. Check manifest.json has correct appUrl
3. Verify SDK version matches (SDK_V2)
4. Add retry logic with exponential backoff:

async function initWithRetry(attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await miro.board.getInfo();
    } catch (e) {
      await sleep(1000 * Math.pow(2, i));
    }
  }
  throw new Error('Miro SDK failed to initialize');
}`),

      createHeading3("React Query Cache Stale"),
      createCodeBlock(`Problem: UI shows old data after mutation

Solution:
1. Ensure invalidateQueries is called with correct key
2. Check queryKey structure matches
3. Use onSuccess callback in mutation:

useMutation({
  mutationFn: updateProject,
  onSuccess: (data) => {
    queryClient.setQueryData(['project', data.id], data);
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }
})`),

      createHeading3("File Upload Fails"),
      createCodeBlock(`Problem: Upload returns 403 or CORS error

Solution:
1. Verify signed URL is fresh (not expired)
2. Check bucket RLS policies allow uploads
3. Verify Content-Type header matches file
4. Check file size limit in storage settings

Correct upload:
const { signedUrl } = await getSignedUrl(path);
await fetch(signedUrl, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file
});`),

      new Paragraph({ spacing: { before: 800 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "— End of Guide —", size: 24, color: COLORS.gray, italics: true })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/AI-Dev-Guide-Brianna-Miro-App.docx', buffer);
  console.log('AI Development Guide created!');
});