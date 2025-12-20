import { miroClient } from './miroClient';
import type { WorkspaceSection, BrandWorkspace } from '../domain/board.types';

// Default workspace layout configuration
const WORKSPACE_SECTIONS: Omit<WorkspaceSection, 'id' | 'frameId'>[] = [
  {
    name: 'Logo & Identidade',
    type: 'logo',
    position: { x: 0, y: 0 },
    size: { width: 600, height: 400 },
  },
  {
    name: 'Paleta de Cores',
    type: 'colors',
    position: { x: 650, y: 0 },
    size: { width: 500, height: 400 },
  },
  {
    name: 'Tipografia',
    type: 'typography',
    position: { x: 0, y: 450 },
    size: { width: 500, height: 400 },
  },
  {
    name: 'Banco de Imagens',
    type: 'imagery',
    position: { x: 550, y: 450 },
    size: { width: 600, height: 400 },
  },
  {
    name: 'Diretrizes',
    type: 'guidelines',
    position: { x: 0, y: 900 },
    size: { width: 1150, height: 300 },
  },
];

class BrandWorkspaceService {
  private workspaces: Map<string, BrandWorkspace> = new Map();

  /**
   * Initialize a brand workspace for a project
   */
  async initializeWorkspace(
    boardId: string,
    projectId: string,
    projectName: string
  ): Promise<BrandWorkspace> {
    const sections: WorkspaceSection[] = [];

    // Create frames for each section
    for (const section of WORKSPACE_SECTIONS) {
      const frame = await miroClient.createFrame(boardId, {
        title: `${projectName} - ${section.name}`,
        x: section.position.x + 2000, // Offset from Kanban board
        y: section.position.y,
        width: section.size.width,
        height: section.size.height,
        fillColor: '#FFFFFF',
      });

      sections.push({
        id: crypto.randomUUID(),
        frameId: frame.id,
        ...section,
      });
    }

    const workspace: BrandWorkspace = {
      projectId,
      boardId,
      sections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.workspaces.set(projectId, workspace);
    return workspace;
  }

  /**
   * Add an image to a workspace section
   */
  async addImageToSection(
    projectId: string,
    sectionType: WorkspaceSection['type'],
    imageUrl: string,
    options?: { width?: number; offsetX?: number; offsetY?: number }
  ): Promise<string> {
    const workspace = this.workspaces.get(projectId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const section = workspace.sections.find((s) => s.type === sectionType);
    if (!section) {
      throw new Error(`Section ${sectionType} not found`);
    }

    const x = section.position.x + 2000 + (options?.offsetX ?? section.size.width / 2);
    const y = section.position.y + (options?.offsetY ?? section.size.height / 2);

    const imageParams: { url: string; x: number; y: number; width?: number } = {
      url: imageUrl,
      x,
      y,
    };
    if (options?.width !== undefined) {
      imageParams.width = options.width;
    }
    const image = await miroClient.createImage(workspace.boardId, imageParams);

    return image.id;
  }

  /**
   * Add a color swatch to the colors section
   */
  async addColorSwatch(
    projectId: string,
    color: { hex: string; name: string },
    position: { offsetX: number; offsetY: number }
  ): Promise<string> {
    const workspace = this.workspaces.get(projectId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const section = workspace.sections.find((s) => s.type === 'colors');
    if (!section) {
      throw new Error('Colors section not found');
    }

    const x = section.position.x + 2000 + position.offsetX;
    const y = section.position.y + position.offsetY;

    const stickyNote = await miroClient.createStickyNote(workspace.boardId, {
      content: `${color.name}\n${color.hex}`,
      x,
      y,
      fillColor: color.hex,
    });

    return stickyNote.id;
  }

  /**
   * Add typography sample to the typography section
   */
  async addTypographySample(
    projectId: string,
    typography: { fontFamily: string; weight: string; size: string; sample: string },
    position: { offsetX: number; offsetY: number }
  ): Promise<string> {
    const workspace = this.workspaces.get(projectId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const section = workspace.sections.find((s) => s.type === 'typography');
    if (!section) {
      throw new Error('Typography section not found');
    }

    const x = section.position.x + 2000 + position.offsetX;
    const y = section.position.y + position.offsetY;

    const stickyNote = await miroClient.createStickyNote(workspace.boardId, {
      content: `${typography.fontFamily}\n${typography.weight} - ${typography.size}\n\n${typography.sample}`,
      x,
      y,
      fillColor: '#FFFFFF',
    });

    return stickyNote.id;
  }

  /**
   * Add a guideline note
   */
  async addGuideline(
    projectId: string,
    content: string,
    position: { offsetX: number; offsetY: number }
  ): Promise<string> {
    const workspace = this.workspaces.get(projectId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const section = workspace.sections.find((s) => s.type === 'guidelines');
    if (!section) {
      throw new Error('Guidelines section not found');
    }

    const x = section.position.x + 2000 + position.offsetX;
    const y = section.position.y + position.offsetY;

    const stickyNote = await miroClient.createStickyNote(workspace.boardId, {
      content,
      x,
      y,
      fillColor: 'var(--color-warning-light)',
    });

    return stickyNote.id;
  }

  /**
   * Update a section's frame
   */
  async updateSection(
    projectId: string,
    sectionId: string,
    updates: Partial<{ name: string; position: { x: number; y: number }; size: { width: number; height: number } }>
  ): Promise<WorkspaceSection> {
    const workspace = this.workspaces.get(projectId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const section = workspace.sections.find((s) => s.id === sectionId);
    if (!section) {
      throw new Error('Section not found');
    }

    // Update frame in Miro
    if (section.frameId) {
      const frameUpdates: Partial<{ title: string; x: number; y: number; width: number; height: number }> = {};
      if (updates.name !== undefined) frameUpdates.title = updates.name;
      if (updates.position?.x !== undefined) frameUpdates.x = updates.position.x + 2000;
      if (updates.position?.y !== undefined) frameUpdates.y = updates.position.y;
      if (updates.size?.width !== undefined) frameUpdates.width = updates.size.width;
      if (updates.size?.height !== undefined) frameUpdates.height = updates.size.height;

      await miroClient.updateFrame(workspace.boardId, section.frameId, frameUpdates);
    }

    // Update local state
    if (updates.name) section.name = updates.name;
    if (updates.position) section.position = updates.position;
    if (updates.size) section.size = updates.size;
    workspace.updatedAt = new Date().toISOString();

    return section;
  }

  /**
   * Get workspace for a project
   */
  getWorkspace(projectId: string): BrandWorkspace | undefined {
    return this.workspaces.get(projectId);
  }

  /**
   * Get a specific section
   */
  getSection(projectId: string, sectionType: WorkspaceSection['type']): WorkspaceSection | undefined {
    const workspace = this.workspaces.get(projectId);
    if (!workspace) return undefined;
    return workspace.sections.find((s) => s.type === sectionType);
  }
}

export const brandWorkspaceService = new BrandWorkspaceService();
