import { useCallback, useState } from 'react';
import { miroAdapter } from '@shared/lib/miroAdapter';
import { createLogger } from '@shared/lib/logger';
import type { Project } from '@features/projects/domain/project.types';

const logger = createLogger('ProjectCardMiro');

interface UseProjectCardMiroProps {
  project: Project;
}

interface MiroFrame {
  id: string;
  title?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useProjectCardMiro({ project }: UseProjectCardMiroProps) {
  const [isZooming, setIsZooming] = useState(false);

  const zoomToProject = useCallback(async () => {
    if (!miroAdapter.isAvailable()) {
      logger.warn('Miro SDK not available');
      return false;
    }

    try {
      setIsZooming(true);

      // Find project frame on board using getBoardItems
      const frames = await miroAdapter.getBoardItems<MiroFrame>('frame');
      const projectFrame = frames.find((f: MiroFrame) =>
        f.title?.toLowerCase().includes(project.name.toLowerCase())
      );

      if (!projectFrame) {
        logger.warn('Project frame not found on board');
        return false;
      }

      // Zoom to frame
      await miroAdapter.zoomToItems([projectFrame]);

      return true;
    } catch (error) {
      logger.error('Failed to zoom to project', error);
      return false;
    } finally {
      setIsZooming(false);
    }
  }, [project]);

  const findProjectFrame = useCallback(async () => {
    if (!miroAdapter.isAvailable()) return null;

    try {
      const frames = await miroAdapter.getBoardItems<MiroFrame>('frame');
      return frames.find((f: MiroFrame) =>
        f.title?.toLowerCase().includes(project.name.toLowerCase())
      ) || null;
    } catch (error) {
      logger.error('Failed to find project frame', error);
      return null;
    }
  }, [project]);

  const syncToBoard = useCallback(async () => {
    if (!miroAdapter.isAvailable()) {
      logger.warn('Miro SDK not available for sync');
      return false;
    }

    try {
      // Find or create project frame
      let projectFrame = await findProjectFrame();

      if (!projectFrame) {
        // Create new frame for project
        projectFrame = await miroAdapter.createFrame({
          title: project.name,
          x: 0,
          y: 0,
          width: 1200,
          height: 800,
        }) as MiroFrame;
      }

      // Note: Miro SDK doesn't have updateItem - frame is already created/updated
      // If we need to update, we would need to use the SDK's update methods
      logger.info('Synced project to board', { projectId: project.id, frameId: projectFrame.id });

      return true;
    } catch (error) {
      logger.error('Failed to sync to board', error);
      return false;
    }
  }, [project, findProjectFrame]);

  const highlightOnBoard = useCallback(async () => {
    if (!miroAdapter.isAvailable()) return false;

    try {
      const projectFrame = await findProjectFrame();

      if (!projectFrame) {
        return false;
      }

      // Zoom to the frame to highlight it
      await miroAdapter.zoomToItems([projectFrame]);

      return true;
    } catch (error) {
      logger.error('Failed to highlight on board', error);
      return false;
    }
  }, [findProjectFrame]);

  return {
    zoomToProject,
    findProjectFrame,
    syncToBoard,
    highlightOnBoard,
    isZooming,
  };
}
