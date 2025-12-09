import { useState } from 'react';
import { Button } from '@shared/ui';
import { useMiro } from '@features/boards';
import { miroTimelineService, miroProjectRowService } from '@features/boards/services/miroSdkService';
import { projectService } from '@features/projects/services/projectService';
import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';
import type { CreateProjectInput, ProjectBriefing, ProjectStatus, ProjectPriority } from '@features/projects/domain/project.types';
import styles from './DeveloperTools.module.css';

const logger = createLogger('DeveloperTools');

// Test project data - realistic design studio projects
const TEST_PROJECTS: Array<{
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  daysUntilDue: number;
  briefing: Partial<ProjectBriefing>;
}> = [
  {
    name: 'Luna Wellness Brand Identity',
    description: 'Complete brand identity design for a wellness spa',
    status: 'in_progress',
    priority: 'high',
    daysUntilDue: 14,
    briefing: {
      projectOverview: 'Create a calming, luxurious brand identity for Luna Wellness Spa targeting high-end clientele',
      targetAudience: 'Women 30-55, high income, health-conscious professionals',
      goals: 'Establish premium positioning, differentiate from competitors, create memorable visual identity',
      deliverables: 'Logo, color palette, typography, business cards, letterhead, social media templates',
      styleNotes: 'Minimalist, elegant, earthy tones with gold accents',
      inspirations: 'Aesop, Four Seasons Spa, Goop',
    },
  },
  {
    name: 'TechFlow App UI Design',
    description: 'Mobile app interface design for productivity tool',
    status: 'urgent',
    priority: 'urgent',
    daysUntilDue: 7,
    briefing: {
      projectOverview: 'Design intuitive UI/UX for a project management mobile app',
      targetAudience: 'Remote workers, small business owners, freelancers 25-45',
      goals: 'Improve user retention, simplify task management, modern aesthetic',
      deliverables: 'Wireframes, UI kit, 25+ screen designs, prototypes, design specs',
      styleNotes: 'Clean, modern, vibrant accent colors, dark mode support',
      inspirations: 'Notion, Linear, Todoist',
    },
  },
  {
    name: 'Artisan Coffee Packaging',
    description: 'Package design for specialty coffee brand',
    status: 'in_progress',
    priority: 'medium',
    daysUntilDue: 21,
    briefing: {
      projectOverview: 'Design premium packaging for artisan coffee roaster expanding retail presence',
      targetAudience: 'Coffee enthusiasts, specialty food shoppers, gift buyers',
      goals: 'Stand out on shelves, communicate quality and origin story, eco-friendly materials',
      deliverables: '3 bag sizes, box designs, labels, hang tags, shipping materials',
      styleNotes: 'Craft aesthetic, hand-drawn elements, sustainable feel',
      inspirations: 'Counter Culture, Stumptown, Blue Bottle',
    },
  },
  {
    name: 'Verde Restaurant Website',
    description: 'Website redesign for farm-to-table restaurant',
    status: 'in_progress',
    priority: 'high',
    daysUntilDue: 10,
    briefing: {
      projectOverview: 'Modern website redesign with online reservation integration',
      targetAudience: 'Local foodies, special occasion diners, tourists 28-60',
      goals: 'Increase online reservations by 40%, showcase menu and ambiance, improve mobile experience',
      deliverables: 'Homepage, menu page, about page, reservations, contact, blog template',
      styleNotes: 'Warm, inviting, lots of food photography, easy navigation',
      inspirations: 'Eleven Madison Park, Noma, The French Laundry websites',
    },
  },
  {
    name: 'Bloom Kids Illustration Set',
    description: 'Custom illustrations for children educational platform',
    status: 'review',
    priority: 'low',
    daysUntilDue: 45,
    briefing: {
      projectOverview: 'Create 50+ custom illustrations for children learning app',
      targetAudience: 'Children ages 4-8 and their parents',
      goals: 'Engaging, educational, inclusive characters, consistent style',
      deliverables: '50 illustrations, character designs, scene backgrounds, animated assets',
      styleNotes: 'Playful, colorful, diverse characters, friendly animals',
      inspirations: 'Duolingo, Khan Academy Kids, Headspace illustrations',
    },
  },
  {
    name: 'Stellar Fashion Lookbook',
    description: 'Seasonal lookbook design for fashion brand',
    status: 'done',
    priority: 'medium',
    daysUntilDue: -5,
    briefing: {
      projectOverview: 'Design Spring/Summer 2024 digital and print lookbook',
      targetAudience: 'Fashion-forward women 22-35, influencers, buyers',
      goals: 'Showcase new collection, create shareable content, support wholesale presentations',
      deliverables: '24-page lookbook, digital version, social media crops, press kit',
      styleNotes: 'Editorial, high fashion, bold typography, white space',
      inspirations: 'Jacquemus, The Row, Toteme lookbooks',
    },
  },
  {
    name: 'Summit Conference Branding',
    description: 'Event branding for tech conference',
    status: 'urgent',
    priority: 'urgent',
    daysUntilDue: 5,
    briefing: {
      projectOverview: 'Complete visual identity for annual technology summit',
      targetAudience: 'Tech professionals, developers, startup founders 25-50',
      goals: 'Create memorable event experience, unify all touchpoints, social media buzz',
      deliverables: 'Event logo, signage, badges, stage design, swag, digital assets',
      styleNotes: 'Futuristic, bold, dynamic, tech-inspired but approachable',
      inspirations: 'Web Summit, SXSW, Google I/O branding',
    },
  },
  {
    name: 'Harmony Music App Icons',
    description: 'Icon set for music streaming application',
    status: 'in_progress',
    priority: 'medium',
    daysUntilDue: 18,
    briefing: {
      projectOverview: 'Design comprehensive icon system for music streaming app',
      targetAudience: 'Music lovers all ages, primarily 18-35',
      goals: 'Improve usability, create cohesive visual language, support all platforms',
      deliverables: '100+ icons in 3 sizes, SVG and PNG formats, icon guidelines',
      styleNotes: 'Outlined style, rounded corners, musical motifs, accessible',
      inspirations: 'Spotify, Apple Music, SoundCloud iconography',
    },
  },
  {
    name: 'Eco Home Product Catalog',
    description: 'Product catalog for sustainable home goods',
    status: 'in_progress',
    priority: 'low',
    daysUntilDue: 30,
    briefing: {
      projectOverview: 'Design annual product catalog showcasing sustainable home products',
      targetAudience: 'Eco-conscious consumers, interior designers, retailers',
      goals: 'Drive wholesale orders, educate on sustainability, premium positioning',
      deliverables: '48-page catalog, digital flipbook, product sheets, price list',
      styleNotes: 'Natural, warm, lifestyle photography, eco-credentials highlighted',
      inspirations: 'West Elm, Parachute Home, Made Trade catalogs',
    },
  },
  {
    name: 'Spark Fitness Social Campaign',
    description: 'Social media campaign design for fitness brand',
    status: 'in_progress',
    priority: 'high',
    daysUntilDue: 12,
    briefing: {
      projectOverview: 'Design 30-day social media campaign for gym chain launch',
      targetAudience: 'Fitness enthusiasts, gym-goers 20-40, local community',
      goals: 'Generate 1000 pre-launch signups, build brand awareness, community engagement',
      deliverables: '60 social posts, stories templates, ad creatives, email graphics',
      styleNotes: 'Energetic, motivational, bold colors, action photography',
      inspirations: 'Peloton, Nike Training, Equinox social media',
    },
  },
];

export function DeveloperTools() {
  const { isInMiro, miro } = useMiro();
  const [isResetting, setIsResetting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addProgress = (message: string) => {
    setProgress((prev) => [...prev, message]);
  };

  // Rename all STAGE frames to VERSION on the Miro board
  const handleRenameStageToVersion = async () => {
    if (!isInMiro || !miro) {
      setError('Must be running inside Miro to rename frames');
      return;
    }

    if (!confirm('This will rename all frames with "STAGE" to "VERSION" on the current board. Continue?')) {
      return;
    }

    setIsRenaming(true);
    setProgress([]);
    setError(null);

    try {
      addProgress('Searching for frames with STAGE in title...');

      // Get all frames from the board
      const frames = await miro.board.get({ type: 'frame' });

      // Filter frames with STAGE in title
      const stageFrames = frames.filter((f: { title?: string }) =>
        f.title?.includes('STAGE')
      );

      addProgress(`Found ${stageFrames.length} frames with STAGE`);

      if (stageFrames.length === 0) {
        addProgress('✓ No frames to rename');
        setIsRenaming(false);
        return;
      }

      let renamed = 0;
      let failed = 0;

      for (const frame of stageFrames) {
        const oldTitle = (frame as { title?: string }).title || '';
        const newTitle = oldTitle.replace(/STAGE/g, 'VERSION');

        try {
          // Update frame title using Miro SDK
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const miroFrame = frame as any;
          miroFrame.title = newTitle;
          if (typeof miroFrame.sync === 'function') {
            await miroFrame.sync();
          }
          renamed++;
          addProgress(`✓ Renamed: "${oldTitle}" → "${newTitle}"`);
        } catch (err) {
          failed++;
          addProgress(`✗ Failed: "${oldTitle}" - ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      addProgress('');
      addProgress(`✅ Migration complete: ${renamed} renamed, ${failed} failed`);

    } catch (err) {
      logger.error('Rename failed', err);
      setError(err instanceof Error ? err.message : 'Failed to rename frames');
      addProgress(`❌ ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRenaming(false);
    }
  };

  // Clear ALL data from the system (for manual testing)
  const handleClearAll = async () => {
    if (!confirm('⚠️ WARNING: This will DELETE ALL data from the system!\n\n- All projects\n- All deliverables\n- All Miro board elements\n\nAre you sure?')) {
      return;
    }

    if (!confirm('🚨 LAST CHANCE!\n\nThis action CANNOT be undone.\n\nClick OK to confirm.')) {
      return;
    }

    setIsClearing(true);
    setProgress([]);
    setError(null);

    try {
      // Step 0: Check current auth state
      addProgress('Checking authentication...');
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, role')
          .eq('id', authUser.id)
          .single();

        addProgress(`✓ Logged in as: ${userData?.name || authUser.email} (${userData?.role || 'unknown role'})`);

        if (userData?.role !== 'admin') {
          addProgress('⚠ WARNING: You are not an admin! Delete may fail due to RLS policies.');
        }
      } else {
        addProgress('⚠ WARNING: Not authenticated! Delete will likely fail.');
      }

      // Step 1: Get all projects first to see what we're dealing with
      addProgress('Fetching all projects...');
      const { data: allProjects, error: fetchError } = await supabase
        .from('projects')
        .select('id, name');

      if (fetchError) {
        addProgress(`⚠ Could not fetch projects: ${fetchError.message}`);
      } else {
        addProgress(`Found ${allProjects?.length || 0} projects to delete`);
      }

      // Step 2: Delete junction tables first (foreign key dependencies)
      addProgress('Deleting project_designers...');
      const { error: designersError, count: designersCount } = await supabase
        .from('project_designers')
        .delete()
        .neq('project_id', '00000000-0000-0000-0000-000000000000');
      if (designersError) addProgress(`⚠ project_designers: ${designersError.message}`);
      else addProgress(`✓ project_designers deleted (${designersCount || 'all'})`);

      // Step 3: Delete deliverable-related tables
      addProgress('Deleting deliverable_feedback...');
      const { error: feedbackError } = await supabase
        .from('deliverable_feedback')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (feedbackError) addProgress(`⚠ deliverable_feedback: ${feedbackError.message}`);
      else addProgress('✓ deliverable_feedback deleted');

      addProgress('Deleting deliverable_versions...');
      const { error: versionsError } = await supabase
        .from('deliverable_versions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (versionsError) addProgress(`⚠ deliverable_versions: ${versionsError.message}`);
      else addProgress('✓ deliverable_versions deleted');

      addProgress('Deleting deliverables...');
      const { error: deliverablesError } = await supabase
        .from('deliverables')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (deliverablesError) addProgress(`⚠ deliverables: ${deliverablesError.message}`);
      else addProgress('✓ deliverables deleted');

      // Step 4: Delete all projects one by one
      addProgress('Deleting projects...');

      if (allProjects && allProjects.length > 0) {
        let deletedCount = 0;
        let failedProjects: string[] = [];

        for (const project of allProjects) {
          const { error: deleteError } = await supabase
            .from('projects')
            .delete()
            .eq('id', project.id);

          if (!deleteError) {
            deletedCount++;
            addProgress(`  ✓ Deleted: ${project.name}`);
          } else {
            failedProjects.push(project.name);
            addProgress(`  ⚠ Failed: ${project.name} - ${deleteError.message}`);
            logger.error('Delete error for project', { id: project.id, error: deleteError });
          }
        }

        addProgress(`✓ ${deletedCount}/${allProjects.length} projects deleted`);

        if (failedProjects.length > 0) {
          addProgress(`⚠ Failed projects: ${failedProjects.join(', ')}`);
        }
      } else {
        addProgress('✓ No projects to delete');
      }

      // Step 6: Verify deletion
      addProgress('Verifying deletion...');
      const { data: remaining, error: verifyError } = await supabase
        .from('projects')
        .select('id, name');

      if (verifyError) {
        addProgress(`⚠ Verify error: ${verifyError.message}`);
      } else if (remaining && remaining.length > 0) {
        addProgress(`⚠ WARNING: ${remaining.length} projects still remain!`);
        remaining.forEach(p => addProgress(`  - ${p.name} (${p.id})`));
        addProgress('These may be protected by RLS policies.');
      } else {
        addProgress('✓ All projects deleted successfully!');
      }

      // Step 7: Reset Miro services
      addProgress('Resetting Miro services...');
      miroTimelineService.reset();
      miroProjectRowService.reset();
      addProgress('✓ Miro services reset');

      // Step 8: Clear Miro board if in Miro
      if (isInMiro && miro) {
        addProgress('Clearing Miro board elements...');
        try {
          const frames = await miro.board.get({ type: 'frame' });
          const shapes = await miro.board.get({ type: 'shape' });
          const cards = await miro.board.get({ type: 'card' });
          const stickies = await miro.board.get({ type: 'sticky_note' });
          const texts = await miro.board.get({ type: 'text' });

          const allItems = [...frames, ...shapes, ...cards, ...stickies, ...texts];
          addProgress(`Found ${allItems.length} Miro elements to remove`);

          let removed = 0;
          for (const item of allItems) {
            try {
              await miro.board.remove(item);
              removed++;
            } catch (e) {
              // Ignore individual removal errors
            }
          }
          addProgress(`✓ ${removed}/${allItems.length} elements removed from Miro`);
        } catch (e) {
          addProgress('⚠ Could not clear all Miro elements');
          logger.error('Miro clear error', e);
        }
      }

      addProgress('');
      addProgress('🧹 SYSTEM CLEARED!');
      addProgress('Refresh the page to start fresh.');

    } catch (err) {
      logger.error('Clear failed', err);
      setError(err instanceof Error ? err.message : 'Failed to clear data');
      addProgress(`❌ ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleResetAndSeed = async () => {
    if (!confirm('This will DELETE all projects and Miro board elements. Are you sure?')) {
      return;
    }

    setIsResetting(true);
    setProgress([]);
    setError(null);

    try {
      // Step 1: Delete ALL projects directly from Supabase (bypass any filters)
      addProgress('Deleting all projects from database...');
      const { error: deleteError, count } = await supabase
        .from('projects')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (neq trick)

      if (deleteError) {
        logger.error('Delete error', deleteError);
        addProgress(`Warning: Delete may have failed - ${deleteError.message}`);
      } else {
        addProgress(`Database cleared! (${count || 'all'} projects deleted)`);
      }

      // Step 2: Reset Miro service singletons
      addProgress('Resetting Miro services...');
      miroTimelineService.reset();
      miroProjectRowService.reset();
      addProgress('Miro services reset!');

      // Step 3: Clear Miro board if in Miro
      if (isInMiro && miro) {
        addProgress('Clearing Miro board elements...');
        try {
          // Remove all frames
          const frames = await miro.board.get({ type: 'frame' });
          for (const frame of frames) {
            try {
              await miro.board.remove(frame);
            } catch (e) {
              logger.warn('Failed to remove frame', e);
            }
          }

          // Also remove all shapes and cards
          const shapes = await miro.board.get({ type: 'shape' });
          for (const shape of shapes) {
            try {
              await miro.board.remove(shape);
            } catch (e) {
              logger.warn('Failed to remove shape', e);
            }
          }

          const cards = await miro.board.get({ type: 'card' });
          for (const card of cards) {
            try {
              await miro.board.remove(card);
            } catch (e) {
              logger.warn('Failed to remove card', e);
            }
          }

          addProgress(`Cleared board: ${frames.length} frames, ${shapes.length} shapes, ${cards.length} cards`);
        } catch (e) {
          addProgress('Warning: Could not clear all Miro elements');
        }
      }

      // Step 4: Get a client ID (need to find or create a test client)
      addProgress('Finding or creating test client...');
      const { data: users } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('role', 'client')
        .limit(1);

      let clientId: string;
      const existingClient = users?.[0];
      if (existingClient) {
        clientId = existingClient.id;
        addProgress(`Using existing client: ${existingClient.name}`);
      } else {
        // Create a test client
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            email: 'testclient@example.com',
            name: 'Test Client',
            role: 'client',
          })
          .select()
          .single();

        if (userError) throw new Error('Failed to create test client');
        clientId = newUser.id;
        addProgress('Created test client');
      }

      // Step 5: Create Master Timeline if in Miro
      if (isInMiro && miro) {
        addProgress('Creating Master Timeline...');
        await miroTimelineService.initializeTimeline();
        addProgress('Master Timeline created!');
      }

      // Step 6: Create 10 test projects
      addProgress('Creating 10 test projects...');

      for (let i = 0; i < TEST_PROJECTS.length; i++) {
        const testProject = TEST_PROJECTS[i];
        if (!testProject) continue;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + testProject.daysUntilDue);

        const projectInput: CreateProjectInput = {
          name: testProject.name,
          description: testProject.description,
          status: testProject.status,
          priority: testProject.priority,
          clientId,
          dueDate: dueDate.toISOString().split('T')[0] ?? null,
          startDate: new Date().toISOString().split('T')[0] ?? null,
          briefing: testProject.briefing,
        };

        addProgress(`Creating project ${i + 1}/10: ${testProject.name}...`);

        // Create project in database
        const project = await projectService.createProject(projectInput);

        // Create Miro elements if in Miro
        if (isInMiro && miro) {
          try {
            // Add to timeline
            await miroTimelineService.syncProject(project);

            // Create project row with briefing
            const briefing: ProjectBriefing = {
              projectOverview: testProject.briefing.projectOverview || null,
              finalMessaging: testProject.briefing.finalMessaging || null,
              inspirations: testProject.briefing.inspirations || null,
              targetAudience: testProject.briefing.targetAudience || null,
              deliverables: testProject.briefing.deliverables || null,
              styleNotes: testProject.briefing.styleNotes || null,
              goals: testProject.briefing.goals || null,
              timeline: testProject.briefing.timeline || null,
              resourceLinks: testProject.briefing.resourceLinks || null,
              additionalNotes: testProject.briefing.additionalNotes || null,
            };

            await miroProjectRowService.createProjectRow(project, briefing);
            addProgress(`  ✓ Miro elements created for: ${testProject.name}`);
          } catch (e) {
            addProgress(`  ⚠ Miro sync failed for: ${testProject.name}`);
          }
        }
      }

      addProgress('');
      addProgress('✅ SUCCESS! Created 10 test projects');
      addProgress('Refresh the page to see the new projects');

    } catch (err) {
      logger.error('Reset failed', err);
      setError(err instanceof Error ? err.message : 'Failed to reset and seed data');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Developer Tools</h2>
        <p className={styles.subtitle}>Testing and development utilities</p>
      </div>

      {/* Clear All Data Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🧹 Clear All System Data</h3>
        <p className={styles.sectionDescription}>
          Remove ALL data from the system to start fresh. Ideal for manual testing.
        </p>

        <div className={styles.warningDanger}>
          <strong>⚠️ CAUTION:</strong> This will permanently delete all projects, deliverables, and Miro board elements.
        </div>

        <div className={styles.status}>
          <span>Miro Connection: </span>
          <span className={isInMiro ? styles.connected : styles.disconnected}>
            {isInMiro ? '✓ Connected' : '✗ Not in Miro'}
          </span>
        </div>

        <Button
          onClick={handleClearAll}
          isLoading={isClearing}
          variant="primary"
          className={styles.dangerButton}
        >
          {isClearing ? 'Clearing...' : '🗑️ Clear Everything'}
        </Button>
      </div>

      {/* Rename STAGE to VERSION Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🔄 Rename STAGE → VERSION</h3>
        <p className={styles.sectionDescription}>
          Renames all Miro frames with "STAGE" in the title to "VERSION".
        </p>

        <div className={styles.status}>
          <span>Miro Connection: </span>
          <span className={isInMiro ? styles.connected : styles.disconnected}>
            {isInMiro ? '✓ Connected' : '✗ Not in Miro'}
          </span>
        </div>

        <Button
          onClick={handleRenameStageToVersion}
          isLoading={isRenaming}
          variant="primary"
          className={styles.primaryButton}
          disabled={!isInMiro}
        >
          {isRenaming ? 'Renaming...' : '📝 Rename STAGE to VERSION'}
        </Button>
      </div>

      {/* Reset & Seed Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🔄 Reset & Create Test Data</h3>
        <p className={styles.sectionDescription}>
          Clears everything and creates 10 test projects with realistic briefing data.
        </p>

        <div className={styles.warning}>
          <strong>Warning:</strong> This action cannot be undone. All existing data will be permanently deleted.
        </div>

        <Button
          onClick={handleResetAndSeed}
          isLoading={isResetting}
          variant="primary"
          className={styles.primaryButton}
        >
          {isResetting ? 'Resetting...' : 'Reset & Create 10 Test Projects'}
        </Button>
      </div>

      {/* Progress & Error */}
      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {progress.length > 0 && (
        <div className={styles.progressLog}>
          {progress.map((msg, i) => (
            <div key={i} className={styles.progressLine}>{msg}</div>
          ))}
        </div>
      )}
    </div>
  );
}
