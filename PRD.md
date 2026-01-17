const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        Header, Footer, AlignmentType, PageOrientation, LevelFormat, 
        HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber, PageBreak } = require('docx');
const fs = require('fs');

// Design tokens
const COLORS = {
  primary: "050038",
  accent: "2563EB",
  success: "10B981",
  warning: "F59E0B",
  error: "EF4444",
  gray: "6B7280",
  lightGray: "E5E7EB",
  headerBg: "1E3A5F"
};

// Table styling
const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: COLORS.lightGray };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

// Helper functions
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

const createParagraph = (text, options = {}) => new Paragraph({
  spacing: { after: 120 },
  ...options,
  children: [new TextRun({ text, size: 22, ...options.textOptions })]
});

const createBoldParagraph = (label, value) => new Paragraph({
  spacing: { after: 80 },
  children: [
    new TextRun({ text: `${label}: `, bold: true, size: 22 }),
    new TextRun({ text: value, size: 22 })
  ]
});

const createCodeBlock = (code) => new Paragraph({
  spacing: { before: 100, after: 100 },
  shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
  indent: { left: 200, right: 200 },
  children: [new TextRun({ text: code, font: "Courier New", size: 18 })]
});

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } }
    },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 56, bold: true, color: COLORS.primary, font: "Arial" },
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
      { reference: "sub-bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }] },
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
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-5",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-6",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-7",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-8",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        size: { orientation: PageOrientation.PORTRAIT }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "PRD - Brianna Dawes Studios Miro App", size: 18, color: COLORS.gray })]
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
      // ==================== COVER PAGE ====================
      new Paragraph({ spacing: { before: 2000 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "PRODUCT REQUIREMENTS DOCUMENT", size: 28, color: COLORS.gray })]
      }),
      new Paragraph({ spacing: { before: 400 } }),
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: "Brianna Dawes Studios", bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: "Miro App - Project Management System", size: 36, color: COLORS.accent })]
      }),
      new Paragraph({ spacing: { before: 800 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Version 2.0 | 2025", size: 24, color: COLORS.gray })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
        children: [new TextRun({ text: "Optimized for AI-Assisted Development", size: 20, color: COLORS.accent })]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== TABLE OF CONTENTS ====================
      createHeading1("Table of Contents"),
      new Paragraph({ spacing: { after: 200 } }),
      createParagraph("1. Executive Summary"),
      createParagraph("2. System Overview"),
      createParagraph("3. Technical Architecture"),
      createParagraph("4. Database Schema"),
      createParagraph("5. API Specification"),
      createParagraph("6. User Roles & Permissions"),
      createParagraph("7. User Flows"),
      createParagraph("8. UI/UX Specification"),
      createParagraph("9. Business Logic"),
      createParagraph("10. Miro Integration"),
      createParagraph("11. Security Requirements"),
      createParagraph("12. Testing Strategy"),
      createParagraph("13. Deployment & Infrastructure"),
      createParagraph("14. Development Roadmap"),
      createParagraph("15. Appendices"),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 1. EXECUTIVE SUMMARY ====================
      createHeading1("1. Executive Summary"),
      
      createHeading2("1.1 Product Vision"),
      createParagraph("Transform Miro boards into a comprehensive project management hub for design studios, enabling seamless collaboration between Admin, Designer, and Client roles with real-time synchronization between database and visual boards."),
      
      createHeading2("1.2 Key Objectives"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Centralize project management within Miro ecosystem", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Role-based access control (Admin/Designer/Client)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Real-time sync between database and Miro boards", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Visual project tracking (Kanban + Workspace frames)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Deliverable management with versioning and hours tracking", size: 22 })]
      }),
      
      createHeading2("1.3 Success Metrics"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Dashboard load time < 3 seconds", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Board sync latency < 2 seconds", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Zero data inconsistencies between DB and Miro", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "99.9% uptime for core operations", size: 22 })]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 2. SYSTEM OVERVIEW ====================
      createHeading1("2. System Overview"),
      
      createHeading2("2.1 High-Level Architecture"),
      createParagraph("The system follows a Clean Architecture pattern with clear separation between domain logic, application services, and infrastructure concerns."),
      new Paragraph({ spacing: { before: 200 } }),
      createCodeBlock(`
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  React SPA   │  │  Miro Panel  │  │  Mobile Web  │          │
│  │  (Vercel)    │  │  (SDK v2)    │  │  (PWA)       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                         │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              Use Cases / Services                     │      │
│  │  - ProjectService    - DeliverableService            │      │
│  │  - StatusService     - ReportService                 │      │
│  │  - BoardSyncService  - NotificationService           │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │  Supabase  │  │  Miro SDK  │  │  Storage   │  │  Email   │ │
│  │  (Postgres)│  │  (v2)      │  │  (S3)      │  │(Postmark)│ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
      `),
      
      createHeading2("2.2 Technology Stack"),
      createHeading3("Frontend"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "React 19 + Vite 6 + TypeScript 5.x", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "TanStack Query (React Query) for server state", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Zustand for client state (minimal)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "CSS Modules + Design System tokens", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Zod for runtime validation", size: 22 })]
      }),
      
      createHeading3("Backend"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Supabase (Postgres 15 + RLS + Realtime + Edge Functions)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Deno runtime for Edge Functions", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Supabase Storage for file uploads", size: 22 })]
      }),
      
      createHeading3("Integrations"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Miro SDK v2 (Board manipulation)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Postmark (Transactional emails)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Sentry (Error tracking)", size: 22 })]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 3. TECHNICAL ARCHITECTURE ====================
      createHeading1("3. Technical Architecture"),
      
      createHeading2("3.1 Folder Structure"),
      createCodeBlock(`
/src
├── /app                          # React entry points
│   ├── App.tsx                   # Root component + routes
│   ├── main.tsx                  # Vite entry
│   └── providers.tsx             # Context providers wrapper
│
├── /features                     # Feature-based modules
│   ├── /auth
│   │   ├── /components           # LoginForm, AuthGuard
│   │   ├── /hooks                # useAuth, useSession
│   │   ├── /services             # authService.ts
│   │   └── /types                # AuthUser, Session
│   │
│   ├── /projects
│   │   ├── /components           # ProjectCard, ProjectList, CreateProjectWizard
│   │   ├── /pages                # ProjectsPage, ProjectDetailPage
│   │   ├── /hooks                # useProjects, useProjectMutations
│   │   ├── /api                  # projectsApi.ts (React Query)
│   │   ├── /domain               # Project entity, validators
│   │   └── /infra                # supabaseProjectRepo.ts, miroProjectAdapter.ts
│   │
│   ├── /deliverables
│   │   ├── /components           # DeliverableCard, DeliverableForm
│   │   ├── /hooks                # useDeliverables
│   │   └── /api                  # deliverablesApi.ts
│   │
│   ├── /boards
│   │   ├── /components           # BoardControls, SyncButton
│   │   ├── /services             # MasterTimelineService, BrandWorkspaceService
│   │   └── /hooks                # useMiroBoard, useBoardSync
│   │
│   ├── /reports
│   │   └── ...
│   │
│   └── /settings
│       └── ...
│
├── /shared
│   ├── /ui                       # Design System components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Dialog.tsx
│   │   ├── Toast.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Badge.tsx
│   │   └── Input.tsx
│   │
│   ├── /hooks                    # Cross-cutting hooks
│   │   ├── useAsync.ts
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── /lib                      # Utilities
│   │   ├── httpClient.ts         # Configured fetch wrapper
│   │   ├── logger.ts             # Structured logging
│   │   ├── errorBoundary.tsx     # React error boundary
│   │   └── queryClient.ts        # React Query config
│   │
│   ├── /config
│   │   ├── env.ts                # Environment variables
│   │   ├── roles.ts              # Role definitions
│   │   └── boardConfig.ts        # Board IDs mapping
│   │
│   └── /types
│       └── index.ts              # Shared DTOs
│
├── /services-bundle              # UMD bundle for Miro
│   ├── /adapters
│   │   ├── miroSdkAdapter.ts
│   │   └── storageAdapter.ts
│   ├── /domain
│   │   ├── MasterTimelineService.ts
│   │   └── BrandWorkspaceService.ts
│   └── index.js                  # UMD entry
│
└── /supabase
    ├── /functions                # Edge Functions
    │   ├── create-project/
    │   ├── change-status/
    │   └── create-deliverable/
    └── /migrations               # SQL migrations
      `),
      
      createHeading2("3.2 Design Patterns"),
      createHeading3("Repository Pattern"),
      createParagraph("All data access goes through repository interfaces, allowing easy swapping of implementations (Supabase, mock, etc.)."),
      createCodeBlock(`
// Domain interface
interface ProjectRepository {
  findAll(filters: ProjectFilters): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  create(data: CreateProjectDTO): Promise<Project>;
  update(id: string, data: UpdateProjectDTO): Promise<Project>;
  delete(id: string): Promise<void>;
}

// Supabase implementation
class SupabaseProjectRepository implements ProjectRepository {
  constructor(private client: SupabaseClient) {}
  
  async findAll(filters: ProjectFilters): Promise<Project[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .match(filters);
    if (error) throw new DatabaseError(error);
    return data.map(ProjectMapper.toDomain);
  }
}
      `),
      
      createHeading3("Use Case Pattern"),
      createParagraph("Business logic is encapsulated in use cases that orchestrate repositories and services."),
      createCodeBlock(`
class CreateProjectUseCase {
  constructor(
    private projectRepo: ProjectRepository,
    private boardService: BoardSyncService,
    private notificationService: NotificationService
  ) {}

  async execute(input: CreateProjectInput): Promise<Project> {
    // 1. Validate input
    const validated = CreateProjectSchema.parse(input);
    
    // 2. Create in database
    const project = await this.projectRepo.create(validated);
    
    // 3. Sync to Miro board
    await this.boardService.createProjectCard(project);
    await this.boardService.createProjectFrames(project);
    
    // 4. Notify stakeholders
    await this.notificationService.notifyProjectCreated(project);
    
    return project;
  }
}
      `),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 4. DATABASE SCHEMA ====================
      createHeading1("4. Database Schema"),
      
      createHeading2("4.1 Entity Relationship Diagram"),
      createCodeBlock(`
┌─────────────┐       ┌─────────────────┐       ┌──────────────────┐
│   users     │       │    projects     │       │  deliverables    │
├─────────────┤       ├─────────────────┤       ├──────────────────┤
│ id (PK)     │──┐    │ id (PK)         │──┐    │ id (PK)          │
│ email       │  │    │ title           │  │    │ project_id (FK)  │──┐
│ role        │  ├───▶│ client_id (FK)  │  ├───▶│ title            │  │
│ name        │  │    │ designer_id(FK) │  │    │ status           │  │
│ avatar_url  │  │    │ status          │  │    │ version          │  │
│ miro_user_id│  │    │ type            │  │    │ hours_est        │  │
│ created_at  │  │    │ priority        │  │    │ hours_spent      │  │
│ updated_at  │  │    │ due_date        │  │    │ file_url         │  │
└─────────────┘  │    │ budget          │  │    │ notes            │  │
                 │    │ description     │  │    │ created_at       │  │
                 │    │ created_by (FK) │  │    │ updated_at       │  │
                 │    │ created_at      │  │    └──────────────────┘  │
                 │    │ updated_at      │  │                          │
                 │    └─────────────────┘  │                          │
                 │                         │                          │
                 │    ┌─────────────────┐  │    ┌──────────────────┐  │
                 │    │ project_updates │  │    │     files        │  │
                 │    ├─────────────────┤  │    ├──────────────────┤  │
                 │    │ id (PK)         │  │    │ id (PK)          │  │
                 └───▶│ project_id (FK) │◀─┘    │ project_id (FK)  │◀─┘
                      │ author_id (FK)  │       │ deliverable_id   │
                      │ type            │       │ owner_id (FK)    │
                      │ payload (JSONB) │       │ url              │
                      │ created_at      │       │ mime_type        │
                      └─────────────────┘       │ size             │
                                                │ created_at       │
┌─────────────┐       ┌─────────────────────┐   └──────────────────┘
│   boards    │       │ project_board_links │
├─────────────┤       ├─────────────────────┤   ┌──────────────────┐
│ id (PK)     │──────▶│ project_id (FK)     │   │   audit_logs     │
│ miro_board_id│      │ board_id (FK)       │   ├──────────────────┤
│ role        │       │ (PK: composite)     │   │ id (PK)          │
│ url         │       └─────────────────────┘   │ actor_id (FK)    │
│ name        │                                 │ action           │
│ created_at  │                                 │ entity           │
└─────────────┘                                 │ entity_id        │
                                                │ diff (JSONB)     │
                                                │ created_at       │
                                                └──────────────────┘
      `),
      
      createHeading2("4.2 Table Definitions"),
      createHeading3("users"),
      createCodeBlock(`
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'designer', 'client')),
  name TEXT NOT NULL,
  avatar_url TEXT,
  miro_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
      `),
      
      createHeading3("projects"),
      createCodeBlock(`
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'in_progress', 'review', 'done', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('urgent', 'high', 'medium', 'standard')),
  due_date DATE,
  budget NUMERIC(10, 2),
  client_id UUID REFERENCES users(id),
  designer_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id) NOT NULL,
  miro_card_id TEXT,           -- Reference to Miro kanban card
  miro_frame_ids JSONB,        -- References to Miro workspace frames
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_due_date ON projects(due_date);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_designer ON projects(designer_id);
      `),
      
      createHeading3("deliverables"),
      createCodeBlock(`
CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'wip', 'review', 'approved')),
  version INTEGER NOT NULL DEFAULT 1,
  hours_est NUMERIC(6, 2),
  hours_spent NUMERIC(6, 2) DEFAULT 0,
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliverables_project ON deliverables(project_id);
CREATE INDEX idx_deliverables_status ON deliverables(status);
      `),
      
      createHeading3("project_updates"),
      createCodeBlock(`
CREATE TABLE project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('status', 'note', 'file', 'assign', 'deliverable')),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_updates_project ON project_updates(project_id, created_at DESC);
      `),
      
      createHeading2("4.3 Row Level Security (RLS)"),
      createCodeBlock(`
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;

-- Users: Everyone can read, only self can update
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Projects: Role-based access
CREATE POLICY "Admin full access to projects" ON projects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Designers see assigned projects" ON projects
  FOR SELECT USING (
    designer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Clients see own projects" ON projects
  FOR SELECT USING (
    client_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Deliverables: Access through project relationship
CREATE POLICY "Deliverables follow project access" ON deliverables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = deliverables.project_id
      AND (
        p.client_id = auth.uid() OR
        p.designer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );
      `),
      
      createHeading2("4.4 Database Functions (RPC)"),
      createCodeBlock(`
-- Create project with validation
CREATE OR REPLACE FUNCTION create_project(
  p_title TEXT,
  p_type TEXT,
  p_client_id UUID,
  p_designer_id UUID DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium',
  p_description TEXT DEFAULT NULL
) RETURNS projects AS $$
DECLARE
  v_user_role TEXT;
  v_project projects;
BEGIN
  -- Get current user role
  SELECT role INTO v_user_role FROM users WHERE id = auth.uid();
  
  -- Validate permissions
  IF v_user_role NOT IN ('admin', 'client') THEN
    RAISE EXCEPTION 'Unauthorized: Only admin or client can create projects';
  END IF;
  
  -- Client can only create for themselves
  IF v_user_role = 'client' AND p_client_id != auth.uid() THEN
    RAISE EXCEPTION 'Clients can only create projects for themselves';
  END IF;
  
  -- Insert project
  INSERT INTO projects (title, type, client_id, designer_id, due_date, priority, description, created_by)
  VALUES (p_title, p_type, p_client_id, p_designer_id, p_due_date, p_priority, p_description, auth.uid())
  RETURNING * INTO v_project;
  
  -- Create initial update record
  INSERT INTO project_updates (project_id, author_id, type, payload)
  VALUES (v_project.id, auth.uid(), 'status', jsonb_build_object('status', 'draft'));
  
  RETURN v_project;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Change project status
CREATE OR REPLACE FUNCTION change_status(
  p_project_id UUID,
  p_new_status TEXT
) RETURNS projects AS $$
DECLARE
  v_project projects;
  v_old_status TEXT;
BEGIN
  -- Get current project
  SELECT * INTO v_project FROM projects WHERE id = p_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  
  v_old_status := v_project.status;
  
  -- Update status
  UPDATE projects SET status = p_new_status, updated_at = NOW()
  WHERE id = p_project_id
  RETURNING * INTO v_project;
  
  -- Record update
  INSERT INTO project_updates (project_id, author_id, type, payload)
  VALUES (p_project_id, auth.uid(), 'status', 
    jsonb_build_object('from', v_old_status, 'to', p_new_status));
  
  RETURN v_project;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign designer
CREATE OR REPLACE FUNCTION assign_designer(
  p_project_id UUID,
  p_designer_id UUID
) RETURNS projects AS $$
DECLARE
  v_user_role TEXT;
  v_project projects;
BEGIN
  SELECT role INTO v_user_role FROM users WHERE id = auth.uid();
  
  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admin can assign designers';
  END IF;
  
  UPDATE projects SET designer_id = p_designer_id, updated_at = NOW()
  WHERE id = p_project_id
  RETURNING * INTO v_project;
  
  INSERT INTO project_updates (project_id, author_id, type, payload)
  VALUES (p_project_id, auth.uid(), 'assign', 
    jsonb_build_object('designer_id', p_designer_id));
  
  RETURN v_project;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get project summary
CREATE OR REPLACE FUNCTION get_project_summary(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'project', row_to_json(p.*),
    'deliverables_count', (SELECT COUNT(*) FROM deliverables WHERE project_id = p_project_id),
    'deliverables_approved', (SELECT COUNT(*) FROM deliverables WHERE project_id = p_project_id AND status = 'approved'),
    'total_hours_est', (SELECT COALESCE(SUM(hours_est), 0) FROM deliverables WHERE project_id = p_project_id),
    'total_hours_spent', (SELECT COALESCE(SUM(hours_spent), 0) FROM deliverables WHERE project_id = p_project_id),
    'recent_updates', (
      SELECT jsonb_agg(row_to_json(u.*) ORDER BY u.created_at DESC)
      FROM (SELECT * FROM project_updates WHERE project_id = p_project_id LIMIT 10) u
    )
  ) INTO v_result
  FROM projects p
  WHERE p.id = p_project_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
      `),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 5. API SPECIFICATION ====================
      createHeading1("5. API Specification"),
      
      createHeading2("5.1 Authentication"),
      createCodeBlock(`
POST /auth/v1/signup
Body: { email: string, password: string }
Response: { user: User, session: Session }

POST /auth/v1/token?grant_type=password
Body: { email: string, password: string }
Response: { access_token: string, refresh_token: string, user: User }

POST /auth/v1/token?grant_type=refresh_token
Body: { refresh_token: string }
Response: { access_token: string, refresh_token: string }

POST /auth/v1/logout
Headers: { Authorization: Bearer <token> }
Response: { }
      `),
      
      createHeading2("5.2 Projects API"),
      createHeading3("List Projects"),
      createCodeBlock(`
GET /rest/v1/projects?select=*,client:users!client_id(*),designer:users!designer_id(*)
Query Parameters:
  - status: eq.in_progress | eq.done | ...
  - client_id: eq.<uuid>
  - designer_id: eq.<uuid>
  - order: created_at.desc
  - limit: 20
  - offset: 0

Response 200:
[
  {
    "id": "uuid",
    "title": "Brand Redesign",
    "status": "in_progress",
    "type": "branding",
    "priority": "high",
    "due_date": "2025-02-15",
    "client": { "id": "uuid", "name": "Acme Corp", "email": "..." },
    "designer": { "id": "uuid", "name": "John Doe", "email": "..." },
    "created_at": "2025-01-01T00:00:00Z"
  }
]
      `),
      
      createHeading3("Create Project (RPC)"),
      createCodeBlock(`
POST /rest/v1/rpc/create_project
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body:
{
  "p_title": "New Brand Project",
  "p_type": "branding",
  "p_client_id": "uuid",
  "p_designer_id": "uuid" | null,
  "p_due_date": "2025-03-01" | null,
  "p_priority": "high",
  "p_description": "Project description..."
}

Response 200:
{
  "id": "uuid",
  "title": "New Brand Project",
  "status": "draft",
  ...
}

Response 400:
{ "code": "VALIDATION_ERROR", "message": "Invalid input", "details": {...} }

Response 403:
{ "code": "UNAUTHORIZED", "message": "Only admin or client can create projects" }
      `),
      
      createHeading3("Change Status (RPC)"),
      createCodeBlock(`
POST /rest/v1/rpc/change_status
Body:
{
  "p_project_id": "uuid",
  "p_new_status": "in_progress" | "review" | "done" | "archived"
}

Response 200: { ...project }
      `),
      
      createHeading3("Assign Designer (RPC)"),
      createCodeBlock(`
POST /rest/v1/rpc/assign_designer
Body:
{
  "p_project_id": "uuid",
  "p_designer_id": "uuid"
}

Response 200: { ...project }
Response 403: { "code": "UNAUTHORIZED", "message": "Only admin can assign designers" }
      `),
      
      createHeading2("5.3 Deliverables API"),
      createCodeBlock(`
GET /rest/v1/deliverables?project_id=eq.<uuid>&order=created_at.desc
Response 200: [ { id, title, status, version, hours_est, hours_spent, file_url, ... } ]

POST /rest/v1/deliverables
Body:
{
  "project_id": "uuid",
  "title": "Logo Design v1",
  "hours_est": 8,
  "notes": "Initial concept exploration"
}
Response 201: { ...deliverable }

PATCH /rest/v1/deliverables?id=eq.<uuid>
Body: { "status": "approved", "hours_spent": 10 }
Response 200: { ...deliverable }
      `),
      
      createHeading2("5.4 File Upload"),
      createCodeBlock(`
// 1. Get signed upload URL
POST /storage/v1/object/upload-url/project-files/{project_id}/{filename}
Response: { "signedUrl": "https://...", "path": "project-files/..." }

// 2. Upload file to signed URL
PUT {signedUrl}
Headers: { Content-Type: <mime-type> }
Body: <file binary>

// 3. Create file record
POST /rest/v1/files
Body: {
  "project_id": "uuid",
  "deliverable_id": "uuid" | null,
  "url": "https://storage.../project-files/...",
  "mime_type": "image/png",
  "size": 1024000
}
      `),
      
      createHeading2("5.5 Realtime Subscriptions"),
      createCodeBlock(`
// Subscribe to project updates
const subscription = supabase
  .channel('project-updates')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'project_updates',
      filter: 'project_id=eq.<uuid>'
    },
    (payload) => {
      // Handle update: { type, payload, created_at }
      handleProjectUpdate(payload.new);
    }
  )
  .subscribe();

// Broadcast custom events
const channel = supabase.channel('board-sync');
channel.send({
  type: 'broadcast',
  event: 'card-moved',
  payload: { project_id: 'uuid', new_status: 'review' }
});
      `),
      
      createHeading2("5.6 Error Response Format"),
      createCodeBlock(`
// Standard error response
{
  "code": "ERROR_CODE",           // Machine-readable code
  "message": "Human message",     // User-friendly message
  "details": { ... },             // Optional: validation errors, context
  "trace_id": "uuid"              // For debugging/support
}

// Common error codes
- VALIDATION_ERROR: Invalid input data
- NOT_FOUND: Resource not found
- UNAUTHORIZED: Missing or invalid auth
- FORBIDDEN: No permission for action
- CONFLICT: Resource conflict (e.g., duplicate)
- RATE_LIMITED: Too many requests
- INTERNAL_ERROR: Server error
      `),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 6. USER ROLES & PERMISSIONS ====================
      createHeading1("6. User Roles & Permissions"),
      
      createHeading2("6.1 Role Definitions"),
      
      // Admin role table
      new Table({
        columnWidths: [2000, 7360],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: COLORS.headerBg, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Role", bold: true, color: "FFFFFF", size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: COLORS.headerBg, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "ADMIN", bold: true, color: "FFFFFF", size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, size: 20 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "Full system access. Manages all projects, users, and settings.", size: 20 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "Permissions", bold: true, size: 20 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "Create/edit/delete all projects | Assign designers | Change any status | Access all boards | Run migrations | Generate reports | Manage users", size: 20 })] })]
              })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 } }),

      // Designer role table
      new Table({
        columnWidths: [2000, 7360],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: COLORS.accent, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Role", bold: true, color: "FFFFFF", size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: COLORS.accent, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "DESIGNER", bold: true, color: "FFFFFF", size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, size: 20 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "Creative team member. Works on assigned projects only.", size: 20 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "Permissions", bold: true, size: 20 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "View assigned projects | Update status (wip/review/done) | Create/update deliverables | Log hours | Access designer board | Upload files", size: 20 })] })]
              })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 } }),

      // Client role table
      new Table({
        columnWidths: [2000, 7360],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: COLORS.success, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Role", bold: true, color: "FFFFFF", size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: COLORS.success, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "CLIENT", bold: true, color: "FFFFFF", size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, size: 20 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "External customer. Can request and track their own projects.", size: 20 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "Permissions", bold: true, size: 20 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                children: [new Paragraph({ children: [new TextRun({ text: "Create project requests | View own projects only | Upload input files | Approve deliverables | Access client board | View progress/timeline", size: 20 })] })]
              })
            ]
          })
        ]
      }),
      
      createHeading2("6.2 Permission Matrix"),
      createCodeBlock(`
Action                  │ Admin │ Designer │ Client
────────────────────────┼───────┼──────────┼────────
View all projects       │   ✓   │    ✗     │   ✗
View assigned projects  │   ✓   │    ✓     │   ✗
View own projects       │   ✓   │    ✗     │   ✓
Create project          │   ✓   │    ✗     │   ✓*
Edit any project        │   ✓   │    ✗     │   ✗
Edit assigned project   │   ✓   │    ✓     │   ✗
Delete project          │   ✓   │    ✗     │   ✗
Assign designer         │   ✓   │    ✗     │   ✗
Change status           │   ✓   │    ✓*    │   ✗
Create deliverable      │   ✓   │    ✓     │   ✗
Approve deliverable     │   ✓   │    ✗     │   ✓
Upload files            │   ✓   │    ✓     │   ✓
Access admin board      │   ✓   │    ✗     │   ✗
Access designer board   │   ✓   │    ✓     │   ✗
Access client board     │   ✓   │    ✗     │   ✓
Run migrations          │   ✓   │    ✗     │   ✗
Generate reports        │   ✓   │    ✗     │   ✗
Manage users            │   ✓   │    ✗     │   ✗

* = With restrictions (see business rules)
      `),
      
      createHeading2("6.3 Board Access Control"),
      createCodeBlock(`
// RoleBoardManager validates board access
class RoleBoardManager {
  private boardConfig = {
    admin: { boardId: 'ADMIN_BOARD_ID', allowedRoles: ['admin'] },
    designer: { boardId: 'DESIGNER_BOARD_ID', allowedRoles: ['admin', 'designer'] },
    client: { boardId: 'CLIENT_BOARD_ID', allowedRoles: ['admin', 'client'] }
  };

  async validateAccess(user: User, currentBoardId: string): Promise<ValidationResult> {
    const config = Object.values(this.boardConfig)
      .find(c => c.boardId === currentBoardId);
    
    if (!config) {
      return { allowed: false, reason: 'Unknown board' };
    }
    
    if (!config.allowedRoles.includes(user.role)) {
      const correctBoard = this.boardConfig[user.role];
      return { 
        allowed: false, 
        reason: 'Wrong board for your role',
        redirectUrl: correctBoard?.url 
      };
    }
    
    return { allowed: true };
  }
}
      `),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 7. USER FLOWS ====================
      createHeading1("7. User Flows"),
      
      createHeading2("7.1 Authentication Flow"),
      createCodeBlock(`
┌──────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                          │
└──────────────────────────────────────────────────────────────────┘

User                   App                    Supabase Auth
  │                     │                          │
  │──── Open App ──────▶│                          │
  │                     │                          │
  │                     │◀── Check Session ───────▶│
  │                     │                          │
  │◀── Show Login ──────│    (No Session)          │
  │                     │                          │
  │─── Submit Email ───▶│                          │
  │    + Password       │                          │
  │                     │──── signInWithPassword ─▶│
  │                     │                          │
  │                     │◀──── Session + User ─────│
  │                     │                          │
  │                     │──── Fetch User Profile ─▶│
  │                     │    (role, miro_user_id)  │
  │                     │                          │
  │                     │◀──── Profile Data ───────│
  │                     │                          │
  │                     │──── Validate Board ──────│
  │                     │    (RoleBoardManager)    │
  │                     │                          │
  │◀── Dashboard ───────│                          │
  │    (Role-based)     │                          │
      `),
      
      createHeading2("7.2 Create Project Flow"),
      createCodeBlock(`
┌──────────────────────────────────────────────────────────────────┐
│                      CREATE PROJECT FLOW                          │
└──────────────────────────────────────────────────────────────────┘

Admin/Client           App                    Database              Miro
    │                   │                        │                   │
    │── Click "New" ───▶│                        │                   │
    │                   │                        │                   │
    │◀── Show Wizard ───│                        │                   │
    │                   │                        │                   │
    │── Step 1: Basic ─▶│                        │                   │
    │   (title, type,   │                        │                   │
    │    client)        │                        │                   │
    │                   │                        │                   │
    │── Step 2: Detail ▶│                        │                   │
    │   (objectives,    │                        │                   │
    │    audience)      │                        │                   │
    │                   │                        │                   │
    │── Step 3: Time ──▶│                        │                   │
    │   (due_date,      │                        │                   │
    │    priority)      │                        │                   │
    │                   │                        │                   │
    │── Submit ────────▶│                        │                   │
    │                   │                        │                   │
    │                   │── RPC create_project ─▶│                   │
    │                   │                        │                   │
    │                   │◀── Project Created ────│                   │
    │                   │                        │                   │
    │                   │────────────────────────┼── Create Card ───▶│
    │                   │                        │   (Kanban)        │
    │                   │                        │                   │
    │                   │────────────────────────┼── Create Frames ─▶│
    │                   │                        │   (Brief/Process) │
    │                   │                        │                   │
    │                   │◀───────────────────────┼── Miro IDs ───────│
    │                   │                        │                   │
    │                   │── Update miro_refs ───▶│                   │
    │                   │                        │                   │
    │◀── Success ───────│                        │                   │
    │   + "View Board"  │                        │                   │
      `),
      
      createHeading2("7.3 Status Update Flow"),
      createCodeBlock(`
┌──────────────────────────────────────────────────────────────────┐
│                      STATUS UPDATE FLOW                           │
└──────────────────────────────────────────────────────────────────┘

User                   App                 Database            Realtime         Miro
  │                     │                     │                   │              │
  │── Change Status ───▶│                     │                   │              │
  │                     │                     │                   │              │
  │                     │── RPC change_status▶│                   │              │
  │                     │                     │                   │              │
  │                     │                     │── Trigger ───────▶│              │
  │                     │                     │   project_updates │              │
  │                     │                     │                   │              │
  │                     │◀── Updated Project ─│                   │              │
  │                     │                     │                   │              │
  │                     │─────────────────────┼───────────────────┼── Move Card ▶│
  │                     │                     │                   │   (column)   │
  │                     │                     │                   │              │
  │                     │◀────────────────────┼── Broadcast ──────│              │
  │                     │                     │   (to others)     │              │
  │                     │                     │                   │              │
  │◀── UI Updated ──────│                     │                   │              │
  │   + Toast           │                     │                   │              │

Other Users ◀───────── Realtime Update ───────┘
  │                     │
  │── Auto-refresh UI ──│
      `),
      
      createHeading2("7.4 Deliverable Upload Flow"),
      createCodeBlock(`
┌──────────────────────────────────────────────────────────────────┐
│                    DELIVERABLE UPLOAD FLOW                        │
└──────────────────────────────────────────────────────────────────┘

Designer               App                 Storage             Database
   │                    │                     │                    │
   │── Open Form ──────▶│                     │                    │
   │                    │                     │                    │
   │── Drop File ──────▶│                     │                    │
   │                    │                     │                    │
   │                    │── Get Signed URL ──▶│                    │
   │                    │                     │                    │
   │                    │◀── Signed URL ──────│                    │
   │                    │                     │                    │
   │                    │── Upload Binary ───▶│                    │
   │   [Progress Bar]   │                     │                    │
   │                    │◀── Upload OK ───────│                    │
   │                    │                     │                    │
   │── Submit Form ────▶│                     │                    │
   │   (title, hours,   │                     │                    │
   │    notes)          │                     │                    │
   │                    │─────────────────────┼── Create Record ──▶│
   │                    │                     │   (deliverable +   │
   │                    │                     │    file)           │
   │                    │                     │                    │
   │                    │◀────────────────────┼── Created ─────────│
   │                    │                     │                    │
   │◀── Success ────────│                     │                    │
   │   + Version Badge  │                     │                    │
      `),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 8. UI/UX SPECIFICATION ====================
      createHeading1("8. UI/UX Specification"),
      
      createHeading2("8.1 Design Tokens"),
      createHeading3("Colors"),
      createCodeBlock(`
:root {
  /* Brand */
  --color-primary: #050038;      /* Deep navy - headers, CTAs */
  --color-accent: #2563EB;       /* Blue - links, highlights */
  
  /* Semantic */
  --color-success: #10B981;      /* Green - approved, done */
  --color-warning: #F59E0B;      /* Amber - review, pending */
  --color-error: #EF4444;        /* Red - urgent, errors */
  
  /* Neutrals */
  --color-gray-900: #111827;     /* Text primary */
  --color-gray-600: #4B5563;     /* Text secondary */
  --color-gray-400: #9CA3AF;     /* Disabled, placeholders */
  --color-gray-200: #E5E7EB;     /* Borders */
  --color-gray-100: #F3F4F6;     /* Backgrounds */
  --color-white: #FFFFFF;
  
  /* Priority badges */
  --priority-urgent: #DC2626;
  --priority-high: #F59E0B;
  --priority-medium: #3B82F6;
  --priority-standard: #6B7280;
  
  /* Status badges */
  --status-draft: #9CA3AF;
  --status-in-progress: #3B82F6;
  --status-review: #F59E0B;
  --status-done: #10B981;
  --status-archived: #6B7280;
}
      `),
      
      createHeading3("Typography"),
      createCodeBlock(`
:root {
  /* Font families */
  --font-display: 'Playfair Display', serif;  /* Headings */
  --font-body: 'Merriweather', serif;         /* Body text */
  --font-ui: 'Inter', sans-serif;             /* UI elements */
  
  /* Font sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  
  /* Font weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
      `),
      
      createHeading3("Spacing & Layout"),
      createCodeBlock(`
:root {
  /* Spacing scale */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  
  /* Border radius */
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
      `),
      
      createHeading2("8.2 Screen Specifications"),
      createHeading3("Home / Quick Actions"),
      createCodeBlock(`
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Welcome back, [User Name]                    [Avatar]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │             │  │             │  │             │            │
│  │  + New      │  │  Dashboard  │  │  Settings   │            │
│  │  Project    │  │             │  │             │            │
│  │             │  │             │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  KPIs                                                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │    12    │  │    28    │  │     8    │              │   │
│  │  │ Projects │  │ Deliver. │  │Completed │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Timeline                                                │   │
│  │  ● Urgent  ● High  ● Medium  ● Standard                 │   │
│  │  ────────────────────────────────────────────────────   │   │
│  │  [Project A] ████████████                                │   │
│  │  [Project B]      ████████████████                       │   │
│  │  [Project C]           ████████                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

States:
- Loading: Skeleton placeholders for KPIs and timeline
- Empty: "No projects yet" + CTA button
- Error: Toast notification + retry button
      `),
      
      createHeading3("Dashboard (Project List)"),
      createCodeBlock(`
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Search...]                    [Filter ▼]    [Avatar]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ [IN PROGRESS]  [HIGH]                            │   │   │
│  │  │                                                   │   │   │
│  │  │  Brand Redesign Project                          │   │   │
│  │  │  Client: Acme Corp  |  Type: Branding            │   │   │
│  │  │                                                   │   │   │
│  │  │  Due: Feb 15 (14 days)         ████████░░ 75%    │   │   │
│  │  │  4 deliverables                                   │   │   │
│  │  │                                                   │   │   │
│  │  │  [Review] [Complete] [Edit] [+Deliverable] [···] │   │   │
│  │  │                                                   │   │   │
│  │  │  View Details  |  View Board                     │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ [REVIEW]  [URGENT]                               │   │   │
│  │  │                                                   │   │   │
│  │  │  Website Launch                                   │   │   │
│  │  │  Client: Tech Inc  |  Type: Web Design           │   │   │
│  │  │  ...                                              │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

Card Actions (visible on hover/focus):
- Review: Quick status change
- Complete: Mark as done
- Edit: Open edit modal
- +Deliverable: Add deliverable
- [...]: Stage, Assign, Status, Delete
      `),
      
      createHeading3("Create Project Wizard"),
      createCodeBlock(`
┌─────────────────────────────────────────────────────────────────┐
│  Create New Project                                             │
│  ─────────────────────────────────────────────────────────────  │
│  [1. Basic] ─── [2. Details] ─── [3. Timeline]                 │
│       ●              ○              ○                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Project Name *                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ Enter project name...                            │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  Project Type *                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ Select type...                               ▼  │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ○ Branding  ○ Web Design  ○ Print  ○ Social           │   │
│  │                                                          │   │
│  │  Client *                                                │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ Select client...                             ▼  │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  Designer (Optional)                                     │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ Assign later...                              ▼  │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────┐                                    ┌──────────┐   │
│  │ Cancel  │                                    │   Next   │   │
│  └─────────┘                                    └──────────┘   │
└─────────────────────────────────────────────────────────────────┘

Step 2: Details
- Project objectives (textarea)
- Overview/description (textarea)
- Target audience (textarea)
- Expected deliverables (multi-select)
- Reference links (repeatable input)

Step 3: Timeline
- Due date (date picker)
- Priority (chips: Urgent / High / Medium / Standard)
- Budget (optional number input)
      `),
      
      createHeading2("8.3 Component States"),
      createCodeBlock(`
┌─────────────────────────────────────────────────────────────────┐
│  LOADING STATE                                                   │
│  ─────────────────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  │
│  │  ░░░░░░░░░░░░░░░░                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  Use: Skeleton pulse animation with shimmer effect              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  EMPTY STATE                                                     │
│  ─────────────────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │                    [Illustration]                         │  │
│  │                                                           │  │
│  │              No projects yet                              │  │
│  │    Create your first project to get started               │  │
│  │                                                           │  │
│  │              [+ Create Project]                           │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  Use: Friendly illustration + clear CTA                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ERROR STATE                                                     │
│  ─────────────────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ⚠️  Something went wrong                                 │  │
│  │                                                           │  │
│  │  We couldn't load your projects.                         │  │
│  │  Please try again.                                        │  │
│  │                                                           │  │
│  │  [Retry]  [Contact Support]                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│  Use: Clear message + recovery actions                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SUCCESS TOAST                                                   │
│  ─────────────────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ✓  Project created successfully                    [×]  │  │
│  │     View on board →                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  Use: Auto-dismiss after 5s, with action link                   │
└─────────────────────────────────────────────────────────────────┘
      `),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 9. BUSINESS LOGIC ====================
      createHeading1("9. Business Logic"),
      
      createHeading2("9.1 Project Lifecycle"),
      createCodeBlock(`
┌─────────────────────────────────────────────────────────────────┐
│                      PROJECT STATUS FLOW                         │
└─────────────────────────────────────────────────────────────────┘

   ┌────────┐     ┌─────────────┐     ┌────────┐     ┌──────┐
   │ DRAFT  │────▶│ IN_PROGRESS │────▶│ REVIEW │────▶│ DONE │
   └────────┘     └─────────────┘     └────────┘     └──────┘
       │                │                  │             │
       │                │                  │             │
       │                ▼                  │             │
       │          ┌──────────┐            │             │
       │          │ (can go  │◀───────────┘             │
       │          │  back)   │                          │
       │          └──────────┘                          │
       │                                                │
       │                                                ▼
       │                                          ┌──────────┐
       └─────────────────────────────────────────▶│ ARCHIVED │
                                                  └──────────┘

Transitions:
- DRAFT → IN_PROGRESS: When designer starts work
- IN_PROGRESS → REVIEW: When ready for client review
- REVIEW → IN_PROGRESS: When revisions needed
- REVIEW → DONE: When client approves
- DONE → ARCHIVED: When project is closed
- Any → ARCHIVED: Admin can archive anytime
      `),
      
      createHeading2("9.2 Validation Rules"),
      createCodeBlock(`
// Project creation validation
const CreateProjectSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  
  type: z.enum(['branding', 'web_design', 'print', 'social', 'packaging', 'other']),
  
  client_id: z.string().uuid('Invalid client ID'),
  
  designer_id: z.string().uuid('Invalid designer ID').optional(),
  
  due_date: z.string()
    .optional()
    .refine(
      (date) => !date || new Date(date) > new Date(),
      'Due date must be in the future'
    ),
  
  priority: z.enum(['urgent', 'high', 'medium', 'standard']).default('medium'),
  
  budget: z.number().positive('Budget must be positive').optional(),
  
  description: z.string().max(2000, 'Description too long').optional()
});

// Status transition validation
const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['in_progress', 'archived'],
  in_progress: ['review', 'archived'],
  review: ['in_progress', 'done', 'archived'],
  done: ['archived'],
  archived: [] // Cannot transition from archived
};

function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}
      `),
      
      createHeading2("9.3 Deliverable Logic"),
      createCodeBlock(`
// Versioning rules
- New deliverable starts at version 1
- Each update increments version
- Files are immutable (new version = new file)
- Version history is preserved

// Hours tracking
- hours_est: Estimated at creation
- hours_spent: Updated by designer
- Auto-alert if hours_spent > hours_est * 1.2

// Status flow
PENDING → WIP → REVIEW → APPROVED
    │        │       │
    └────────┴───────┘ (can go back)

// Approval rules
- Only client or admin can approve
- All deliverables must be approved before project can be DONE
- Approved deliverables cannot be edited (create new version instead)
      `),
      
      createHeading2("9.4 Synchronization Logic"),
      createCodeBlock(`
┌─────────────────────────────────────────────────────────────────┐
│                   DATA SYNCHRONIZATION                           │
└─────────────────────────────────────────────────────────────────┘

SOURCE OF TRUTH: PostgreSQL Database

┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   Database   │◀────────▶│   App UI     │◀────────▶│  Miro Board  │
│  (Postgres)  │          │   (React)    │          │   (SDK v2)   │
└──────────────┘          └──────────────┘          └──────────────┘
       │                         │                         │
       │   Realtime              │   React Query           │   SDK Calls
       │   Subscriptions         │   Cache                 │
       │                         │                         │
       ▼                         ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      SYNC FLOW                                    │
│                                                                   │
│  1. User action in UI (e.g., change status)                      │
│  2. Optimistic update in React Query cache                       │
│  3. RPC call to database                                         │
│  4. Database validates and saves                                 │
│  5. Trigger creates project_update record                        │
│  6. Realtime broadcasts to all clients                           │
│  7. App receives broadcast, updates Miro board                   │
│  8. If DB fails, rollback optimistic update                      │
└──────────────────────────────────────────────────────────────────┘

MIRO REFERENCE STORAGE:
{
  "miro_card_id": "3458764523456789",      // Kanban card
  "miro_frame_ids": {
    "brief": "3458764523456790",           // Brief frame
    "process": "3458764523456791"          // Process frame
  }
}

RE-SYNC MECHANISM:
- Admin can trigger "Re-sync board"
- Compares DB records with Miro items
- Fixes orphaned cards (in Miro but not DB)
- Recreates missing cards (in DB but not Miro)
- Updates stale data (mismatched status/title)
      `),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 10. MIRO INTEGRATION ====================
      createHeading1("10. Miro Integration"),
      
      createHeading2("10.1 SDK Setup"),
      createCodeBlock(`
// manifest.json
{
  "appUrl": "https://your-app.vercel.app",
  "sdkVersion": "SDK_V2",
  "boardPicker": {
    "enabled": true
  },
  "toolbarIcon": {
    "enabled": true,
    "icon": "icon.svg"
  },
  "permissions": [
    "board:read",
    "board:write",
    "identity:read"
  ]
}

// Initialize in app
import miroSDK from '@miro/sdk';

async function initMiro() {
  const boardInfo = await miro.board.getInfo();
  const userInfo = await miro.board.getUserInfo();
  
  return {
    boardId: boardInfo.id,
    userId: userInfo.id,
    userName: userInfo.name
  };
}
      `),
      
      createHeading2("10.2 Master Timeline Service (Kanban)"),
      createCodeBlock(`
class MasterTimelineService {
  private columns: Map<ProjectStatus, string> = new Map();
  
  async initialize() {
    // Create or find kanban columns
    const statuses: ProjectStatus[] = ['draft', 'in_progress', 'review', 'done', 'archived'];
    
    for (const status of statuses) {
      const frame = await this.findOrCreateColumn(status);
      this.columns.set(status, frame.id);
    }
  }
  
  private async findOrCreateColumn(status: ProjectStatus): Promise<Frame> {
    const title = this.getColumnTitle(status);
    
    // Try to find existing
    const existing = await miro.board.get({ type: 'frame' });
    const found = existing.find(f => f.title === title);
    if (found) return found;
    
    // Create new column
    return await miro.board.createFrame({
      title,
      x: this.getColumnX(status),
      y: 0,
      width: 300,
      height: 800,
      style: {
        fillColor: this.getColumnColor(status)
      }
    });
  }
  
  async createProjectCard(project: Project): Promise<StickyNote> {
    const columnId = this.columns.get(project.status);
    
    const card = await miro.board.createStickyNote({
      content: this.formatCardContent(project),
      x: /* position within column */,
      y: /* position within column */,
      width: 250,
      style: {
        fillColor: this.getPriorityColor(project.priority)
      }
    });
    
    // Store reference
    await this.saveCardReference(project.id, card.id);
    
    return card;
  }
  
  async moveCard(projectId: string, newStatus: ProjectStatus): Promise<void> {
    const cardId = await this.getCardReference(projectId);
    const targetColumnId = this.columns.get(newStatus);
    
    const card = await miro.board.getById(cardId);
    await card.setPosition({
      x: /* new column X */,
      y: /* calculate Y position */
    });
  }
  
  private formatCardContent(project: Project): string {
    return \`
      <strong>\${project.title}</strong>
      <br/>
      Client: \${project.client?.name}
      <br/>
      Due: \${formatDate(project.due_date)}
      <br/>
      [\${project.priority.toUpperCase()}]
    \`;
  }
}
      `),
      
      createHeading2("10.3 Brand Workspace Service (Project Frames)"),
      createCodeBlock(`
class BrandWorkspaceService {
  async createProjectWorkspace(project: Project): Promise<WorkspaceRefs> {
    // Create container frame
    const container = await miro.board.createFrame({
      title: \`[PROJECT] \${project.title}\`,
      x: this.calculateWorkspaceX(project),
      y: 1000, // Below kanban
      width: 1600,
      height: 1200
    });
    
    // Create Brief section
    const briefFrame = await this.createBriefFrame(project, container);
    
    // Create Process section
    const processFrame = await this.createProcessFrame(project, container);
    
    return {
      container: container.id,
      brief: briefFrame.id,
      process: processFrame.id
    };
  }
  
  private async createBriefFrame(project: Project, parent: Frame): Promise<Frame> {
    const frame = await miro.board.createFrame({
      title: 'BRIEF',
      x: parent.x + 50,
      y: parent.y + 50,
      width: 700,
      height: 500,
      parentId: parent.id
    });
    
    // Add content cards
    await miro.board.createStickyNote({
      content: \`<strong>Objectives</strong><br/>\${project.objectives || 'TBD'}\`,
      x: frame.x + 50,
      y: frame.y + 50,
      parentId: frame.id
    });
    
    await miro.board.createStickyNote({
      content: \`<strong>Audience</strong><br/>\${project.audience || 'TBD'}\`,
      x: frame.x + 300,
      y: frame.y + 50,
      parentId: frame.id
    });
    
    return frame;
  }
  
  private async createProcessFrame(project: Project, parent: Frame): Promise<Frame> {
    const frame = await miro.board.createFrame({
      title: 'PROCESS',
      x: parent.x + 800,
      y: parent.y + 50,
      width: 700,
      height: 500,
      parentId: parent.id
    });
    
    // Add stage columns
    const stages = ['Research', 'Concept', 'Design', 'Deliver'];
    for (let i = 0; i < stages.length; i++) {
      await miro.board.createShape({
        content: stages[i],
        shape: 'rectangle',
        x: frame.x + 50 + (i * 170),
        y: frame.y + 50,
        width: 150,
        height: 40,
        parentId: frame.id
      });
    }
    
    return frame;
  }
}
      `),
      
      createHeading2("10.4 Navigation Service"),
      createCodeBlock(`
class WorkspaceNavigationService {
  async zoomToKanban(): Promise<void> {
    const kanbanFrame = await this.findKanbanFrame();
    if (kanbanFrame) {
      await miro.board.viewport.zoomTo(kanbanFrame);
    }
  }
  
  async zoomToProject(projectId: string): Promise<void> {
    const refs = await this.getProjectRefs(projectId);
    if (refs?.container) {
      const frame = await miro.board.getById(refs.container);
      await miro.board.viewport.zoomTo(frame);
    }
  }
  
  async zoomToFrame(frameId: string): Promise<void> {
    const frame = await miro.board.getById(frameId);
    await miro.board.viewport.zoomTo(frame);
  }
  
  async highlightCard(projectId: string): Promise<void> {
    const cardId = await this.getProjectCardId(projectId);
    if (cardId) {
      const card = await miro.board.getById(cardId);
      await miro.board.select(card);
      await miro.board.viewport.zoomTo(card);
    }
  }
}
      `),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 11. SECURITY ====================
      createHeading1("11. Security Requirements"),
      
      createHeading2("11.1 Authentication Security"),
      new Paragraph({
        numbering: { reference: "numbered-1", level: 0 },
        children: [new TextRun({ text: "JWT tokens with 1-hour expiration", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-1", level: 0 },
        children: [new TextRun({ text: "Refresh tokens with 7-day expiration (rotating)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-1", level: 0 },
        children: [new TextRun({ text: "Secure HTTP-only cookies for token storage", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-1", level: 0 },
        children: [new TextRun({ text: "Password hashing with bcrypt (cost factor 12)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-1", level: 0 },
        children: [new TextRun({ text: "Email verification required for new accounts", size: 22 })]
      }),
      
      createHeading2("11.2 API Security"),
      createCodeBlock(`
// Rate limiting configuration
const rateLimits = {
  // Auth endpoints
  '/auth/*': { windowMs: 15 * 60 * 1000, max: 20 },  // 20 per 15 min
  
  // Read operations
  'GET /projects': { windowMs: 60 * 1000, max: 100 }, // 100 per min
  
  // Write operations
  'POST /projects': { windowMs: 60 * 1000, max: 10 }, // 10 per min
  'PATCH /projects': { windowMs: 60 * 1000, max: 30 }, // 30 per min
  
  // File uploads
  'POST /storage': { windowMs: 60 * 1000, max: 20 }  // 20 per min
};

// Input validation (all endpoints)
- Sanitize all string inputs
- Validate UUIDs format
- Check payload size limits
- Validate file types and sizes
      `),
      
      createHeading2("11.3 Data Protection"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "All data encrypted in transit (TLS 1.3)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Database encrypted at rest", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Sensitive fields hashed/encrypted (passwords, tokens)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "File URLs signed with expiration (1 hour)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "PII access logged in audit trail", size: 22 })]
      }),
      
      createHeading2("11.4 Audit Logging"),
      createCodeBlock(`
// Logged events
- Authentication: login, logout, failed attempts
- Authorization: permission checks, denials
- Data changes: create, update, delete (with diffs)
- File access: uploads, downloads
- Admin actions: user management, migrations

// Log format
{
  "timestamp": "2025-01-15T10:30:00Z",
  "actor_id": "uuid",
  "actor_email": "user@example.com",
  "action": "project.status_changed",
  "entity": "project",
  "entity_id": "uuid",
  "diff": { "status": { "from": "draft", "to": "in_progress" } },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "trace_id": "uuid"
}
      `),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 12. TESTING ====================
      createHeading1("12. Testing Strategy"),
      
      createHeading2("12.1 Unit Tests"),
      createCodeBlock(`
// Domain logic tests
describe('CreateProjectUseCase', () => {
  it('should create project with valid input', async () => {
    const input = createValidProjectInput();
    const result = await useCase.execute(input);
    
    expect(result.id).toBeDefined();
    expect(result.status).toBe('draft');
    expect(result.title).toBe(input.title);
  });
  
  it('should reject invalid client_id', async () => {
    const input = { ...createValidProjectInput(), client_id: 'invalid' };
    
    await expect(useCase.execute(input)).rejects.toThrow('Invalid client ID');
  });
  
  it('should not allow client to create for other clients', async () => {
    mockAuth.setUser({ role: 'client', id: 'user-1' });
    const input = { ...createValidProjectInput(), client_id: 'user-2' };
    
    await expect(useCase.execute(input)).rejects.toThrow('Unauthorized');
  });
});

// Validation tests
describe('ProjectValidation', () => {
  it('should validate title length', () => {
    expect(() => CreateProjectSchema.parse({ title: 'ab' }))
      .toThrow('Title must be at least 3 characters');
  });
  
  it('should validate due_date is in future', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(() => CreateProjectSchema.parse({ due_date: yesterday }))
      .toThrow('Due date must be in the future');
  });
});
      `),
      
      createHeading2("12.2 Integration Tests"),
      createCodeBlock(`
// API integration tests (with test database)
describe('Projects API', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedTestData();
  });
  
  describe('POST /rpc/create_project', () => {
    it('should create project as admin', async () => {
      const response = await api
        .post('/rest/v1/rpc/create_project')
        .set('Authorization', \`Bearer \${adminToken}\`)
        .send({
          p_title: 'Test Project',
          p_type: 'branding',
          p_client_id: testClientId
        });
      
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Test Project');
    });
    
    it('should enforce RLS for designers', async () => {
      const response = await api
        .get('/rest/v1/projects')
        .set('Authorization', \`Bearer \${designerToken}\`);
      
      // Designer should only see assigned projects
      expect(response.body.every(p => p.designer_id === designerId)).toBe(true);
    });
  });
});
      `),
      
      createHeading2("12.3 E2E Tests"),
      createCodeBlock(`
// Playwright E2E tests
import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
  });
  
  test('should create new project', async ({ page }) => {
    // Click new project button
    await page.click('[data-testid="new-project-btn"]');
    
    // Fill wizard step 1
    await page.fill('[name="title"]', 'E2E Test Project');
    await page.selectOption('[name="type"]', 'branding');
    await page.selectOption('[name="client_id"]', testClientId);
    await page.click('[data-testid="next-btn"]');
    
    // Fill wizard step 2
    await page.fill('[name="objectives"]', 'Test objectives');
    await page.click('[data-testid="next-btn"]');
    
    // Fill wizard step 3
    await page.fill('[name="due_date"]', '2025-03-01');
    await page.click('[data-testid="priority-high"]');
    await page.click('[data-testid="create-btn"]');
    
    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('text=E2E Test Project')).toBeVisible();
  });
  
  test('should change project status', async ({ page }) => {
    await page.goto('/projects');
    
    // Find project card and change status
    const card = page.locator('[data-testid="project-card"]').first();
    await card.hover();
    await card.locator('[data-testid="status-btn"]').click();
    await page.click('text=In Progress');
    
    // Verify status changed
    await expect(card.locator('[data-testid="status-badge"]'))
      .toHaveText('IN PROGRESS');
  });
});
      `),
      
      createHeading2("12.4 Test Coverage Targets"),
      new Table({
        columnWidths: [3000, 2000, 4360],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: COLORS.headerBg, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Layer", bold: true, color: "FFFFFF", size: 20 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: COLORS.headerBg, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Target", bold: true, color: "FFFFFF", size: 20 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: COLORS.headerBg, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Focus Areas", bold: true, color: "FFFFFF", size: 20 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Domain/Use Cases", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "> 90%", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Business rules, validation, state transitions", size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "API/Infrastructure", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "> 80%", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "RPC functions, RLS policies, error handling", size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "UI Components", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "> 70%", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Forms, state handling, accessibility", size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "E2E Flows", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "100%", size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Critical paths: auth, CRUD, status changes", size: 20 })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 13. DEPLOYMENT ====================
      createHeading1("13. Deployment & Infrastructure"),
      
      createHeading2("13.1 Architecture"),
      createCodeBlock(`
┌─────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   Cloudflare │
                    │   (DNS/CDN)  │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Vercel     │  │  Supabase    │  │   Miro       │
    │   (Frontend) │  │  (Backend)   │  │   (Board)    │
    │              │  │              │  │              │
    │  React SPA   │  │  Postgres    │  │   SDK v2     │
    │  Static      │  │  Auth        │  │   API        │
    │  Assets      │  │  Storage     │  │              │
    │              │  │  Functions   │  │              │
    │              │  │  Realtime    │  │              │
    └──────────────┘  └──────────────┘  └──────────────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                    ┌──────▼───────┐
                    │   Sentry     │
                    │  (Monitoring)│
                    └──────────────┘
      `),
      
      createHeading2("13.2 Environment Variables"),
      createCodeBlock(`
# .env.local (Frontend)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_MIRO_APP_ID=3458764...
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_APP_ENV=development|staging|production

# Supabase Edge Functions
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
POSTMARK_API_KEY=xxx-xxx-xxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Do NOT commit to repository
# Use environment variable injection in CI/CD
      `),
      
      createHeading2("13.3 CI/CD Pipeline"),
      createCodeBlock(`
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:unit
      - run: npm run test:integration
        env:
          SUPABASE_URL: \${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_KEY: \${{ secrets.TEST_SUPABASE_KEY }}

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
      
      - name: Deploy Supabase Functions
        run: |
          npx supabase functions deploy --project-ref \${{ secrets.SUPABASE_PROJECT_REF }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: \${{ steps.deploy.outputs.url }}
      `),
      
      createHeading2("13.4 Monitoring & Observability"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Sentry: Error tracking (frontend + Edge Functions)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Supabase Dashboard: Database metrics, realtime connections", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Vercel Analytics: Performance metrics, web vitals", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Custom Logging: Structured logs with trace IDs", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Alerts: Error rate spikes, slow queries, downtime", size: 22 })]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 14. ROADMAP ====================
      createHeading1("14. Development Roadmap"),
      
      createHeading2("Phase 1: Foundation (Weeks 1-2)"),
      new Paragraph({
        numbering: { reference: "numbered-2", level: 0 },
        children: [new TextRun({ text: "Project setup (Vite, TypeScript, React Query, Zustand)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-2", level: 0 },
        children: [new TextRun({ text: "Design System components (Button, Card, Input, Toast, Skeleton)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-2", level: 0 },
        children: [new TextRun({ text: "Supabase setup (database schema, RLS policies, auth)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-2", level: 0 },
        children: [new TextRun({ text: "Authentication flow (login, session, role detection)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-2", level: 0 },
        children: [new TextRun({ text: "Miro SDK integration (initialization, board info)", size: 22 })]
      }),
      
      createHeading2("Phase 2: Core Features (Weeks 3-5)"),
      new Paragraph({
        numbering: { reference: "numbered-3", level: 0 },
        children: [new TextRun({ text: "Project CRUD (create wizard, list, detail, edit)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-3", level: 0 },
        children: [new TextRun({ text: "Status management (transitions, validation, realtime)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-3", level: 0 },
        children: [new TextRun({ text: "Miro Kanban (MasterTimelineService, card creation, moves)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-3", level: 0 },
        children: [new TextRun({ text: "Role-based dashboards (Admin, Designer, Client views)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-3", level: 0 },
        children: [new TextRun({ text: "RoleBoardManager (board validation, redirects)", size: 22 })]
      }),
      
      createHeading2("Phase 3: Deliverables & Files (Weeks 6-7)"),
      new Paragraph({
        numbering: { reference: "numbered-4", level: 0 },
        children: [new TextRun({ text: "Deliverable CRUD (create, versioning, status)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-4", level: 0 },
        children: [new TextRun({ text: "File upload (signed URLs, progress, storage)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-4", level: 0 },
        children: [new TextRun({ text: "Hours tracking (estimates, actuals, alerts)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-4", level: 0 },
        children: [new TextRun({ text: "Miro workspace frames (BrandWorkspaceService)", size: 22 })]
      }),
      
      createHeading2("Phase 4: Polish & Launch (Weeks 8-10)"),
      new Paragraph({
        numbering: { reference: "numbered-5", level: 0 },
        children: [new TextRun({ text: "Realtime sync (project updates, board refresh)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-5", level: 0 },
        children: [new TextRun({ text: "Notifications (toasts, email integration)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-5", level: 0 },
        children: [new TextRun({ text: "Reports & KPIs (summaries, exports, PDF generation)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-5", level: 0 },
        children: [new TextRun({ text: "Public KPI Dashboard (/kpi route - no auth required)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-5", level: 0 },
        children: [new TextRun({ text: "Re-sync mechanism (DB ↔ Miro reconciliation)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-5", level: 0 },
        children: [new TextRun({ text: "E2E testing, performance optimization, security audit", size: 22 })]
      }),
      
      createHeading2("Phase 5: Future Enhancements"),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Migration wizard (Miro storage → Supabase)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Advanced analytics and reporting", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "AI-powered suggestions (briefing, deliverables)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Mobile app (React Native)", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "main-bullets", level: 0 },
        children: [new TextRun({ text: "Third-party integrations (Slack, Figma, Google Drive)", size: 22 })]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 15. APPENDICES ====================
      createHeading1("15. Appendices"),
      
      createHeading2("A. Glossary"),
      new Table({
        columnWidths: [2500, 6860],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: COLORS.headerBg, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Term", bold: true, color: "FFFFFF", size: 20 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: COLORS.headerBg, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Definition", bold: true, color: "FFFFFF", size: 20 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "RLS", bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Row Level Security - Postgres feature for row-level access control", size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "RPC", bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Remote Procedure Call - Database function called via API", size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Kanban", bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Visual board with columns representing workflow stages", size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Frame", bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Miro container element for grouping related items", size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Deliverable", bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "A specific output/artifact produced for a project", size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Edge Function", bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: "Serverless function running at edge locations (Supabase/Deno)", size: 20 })] })] })
            ]
          })
        ]
      }),
      
      createHeading2("B. QA Checklist"),
      new Paragraph({
        numbering: { reference: "numbered-6", level: 0 },
        children: [new TextRun({ text: "Authentication: Login, logout, session persistence, role detection", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-6", level: 0 },
        children: [new TextRun({ text: "Authorization: RLS policies, board access control, permission matrix", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-6", level: 0 },
        children: [new TextRun({ text: "Project CRUD: Create, read, update, delete, status transitions", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-6", level: 0 },
        children: [new TextRun({ text: "Deliverables: Create, version, upload, approve, hours tracking", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-6", level: 0 },
        children: [new TextRun({ text: "Miro Sync: Card creation, status moves, frame generation, navigation", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-6", level: 0 },
        children: [new TextRun({ text: "Realtime: Updates propagate, no stale data, reconnection handling", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-6", level: 0 },
        children: [new TextRun({ text: "Error Handling: Graceful failures, retry mechanisms, user feedback", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-6", level: 0 },
        children: [new TextRun({ text: "Performance: Load times, no unnecessary re-renders, optimized queries", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-6", level: 0 },
        children: [new TextRun({ text: "Accessibility: Keyboard navigation, screen reader, contrast, focus", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "numbered-6", level: 0 },
        children: [new TextRun({ text: "Mobile: Responsive design, touch interactions, viewport handling", size: 22 })]
      }),
      
      createHeading2("C. API Quick Reference"),
      createCodeBlock(`
AUTHENTICATION
POST   /auth/v1/signup                    Create account
POST   /auth/v1/token                     Login / refresh
POST   /auth/v1/logout                    Logout

PROJECTS
GET    /rest/v1/projects                  List projects (filtered by RLS)
GET    /rest/v1/projects?id=eq.<id>       Get single project
POST   /rest/v1/rpc/create_project        Create project
POST   /rest/v1/rpc/change_status         Change status
POST   /rest/v1/rpc/assign_designer       Assign designer
GET    /rest/v1/rpc/get_project_summary   Get project summary

DELIVERABLES
GET    /rest/v1/deliverables              List deliverables
POST   /rest/v1/deliverables              Create deliverable
PATCH  /rest/v1/deliverables?id=eq.<id>   Update deliverable

FILES
POST   /storage/v1/upload                 Get signed upload URL
GET    /storage/v1/object/sign/<path>     Get signed download URL

REALTIME
WS     /realtime/v1/websocket             Subscribe to changes
      `),
      
      new Paragraph({ spacing: { before: 800 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "— End of Document —", size: 24, color: COLORS.gray, italics: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: "Version 2.0 | Generated for AI-Assisted Development", size: 18, color: COLORS.gray })]
      })
    ]
  }]
});

// Generate document
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/PRD-Brianna-Miro-App-2025.docx', buffer);
  console.log('PRD document created successfully!');
});