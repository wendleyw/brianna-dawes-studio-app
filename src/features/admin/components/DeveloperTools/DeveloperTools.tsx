import { useState } from 'react';
import { Button } from '@shared/ui';
import { useMiro } from '@features/boards';
import { miroTimelineService, miroProjectRowService } from '@features/boards/services/miroSdkService';
import { projectService } from '@features/projects/services/projectService';
import { deliverableService } from '@features/deliverables/services/deliverableService';
import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';
import type { CreateProjectInput, ProjectBriefing, ProjectStatus, ProjectPriority, ProjectType } from '@features/projects/domain/project.types';
import type { DeliverableType, DeliverableStatus } from '@features/deliverables/domain/deliverable.types';
import styles from './DeveloperTools.module.css';

const logger = createLogger('DeveloperTools');

// Project types from NewProjectPage - exact match
const PROJECT_TYPES: Array<{ value: ProjectType; label: string; days: number }> = [
  { value: 'social-post-design', label: 'Social Post Design (Carousel / Static)', days: 5 },
  { value: 'hero-section', label: 'Hero Section or Image Set', days: 5 },
  { value: 'ad-design', label: 'Ad Design (Static or GIF)', days: 5 },
  { value: 'gif-design', label: 'GIF Design (Standalone)', days: 5 },
  { value: 'website-assets', label: 'Website Assets (Individual Sections)', days: 5 },
  { value: 'email-design', label: 'Email Design (Full In-Depth)', days: 7 },
  { value: 'video-production', label: 'Video Production / Reels', days: 7 },
  { value: 'website-ui-design', label: 'Website UI Design (Full Page)', days: 11 },
  { value: 'marketing-campaign', label: 'Marketing Campaign (Multi-Channel)', days: 14 },
  { value: 'other', label: 'Other', days: 15 },
];

// Comprehensive test project data - realistic design studio projects
interface TestProjectData {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  projectType: ProjectType;
  daysOffset: number; // days from now for due date
  wasReviewed?: boolean;
  wasApproved?: boolean;
  briefing: ProjectBriefing;
  deliverables: Array<{
    name: string;
    type: DeliverableType;
    status: DeliverableStatus;
    count: number;
    bonusCount: number;
    externalUrl?: string;
  }>;
}

const TEST_PROJECTS: TestProjectData[] = [
  // 1. Urgent project - Social Post Design
  {
    name: 'Quantum Tech - Product Launch Posts',
    description: 'Social media campaign for SaaS product launch',
    status: 'urgent',
    priority: 'urgent',
    projectType: 'social-post-design',
    daysOffset: 3,
    briefing: {
      projectOverview: 'Design engaging social media posts for Quantum Tech\'s new AI-powered analytics dashboard launch. The campaign will run across LinkedIn, Instagram, and Twitter.',
      targetAudience: 'B2B decision makers, CTOs, Data Scientists, Tech-savvy business owners aged 30-55',
      goals: 'Generate 500+ leads, achieve 10% engagement rate, build brand awareness for product launch',
      deliverables: '8 carousel posts (LinkedIn), 12 static posts (Instagram), 6 animated posts (Twitter)',
      styleNotes: 'Modern tech aesthetic, dark theme with neon accents (#00F5FF, #8B5CF6), clean typography, data visualization elements',
      inspirations: 'Notion social media, Linear app, Stripe design system',
      finalMessaging: 'Key messages: "Analytics reimagined", "AI-powered insights in seconds", "From data chaos to clarity"',
      resourceLinks: 'Brand guidelines: drive.google.com/brand, Product screenshots: figma.com/file/xxx',
      timeline: 'Social Post Design (5 days) - Target delivery: 3 days (URGENT)',
      additionalNotes: 'CEO wants to review before final delivery. Priority accounts will be tagged.',
    },
    deliverables: [
      { name: 'LinkedIn Carousel - Product Features', type: 'design', status: 'in_progress', count: 4, bonusCount: 1 },
      { name: 'Instagram Static Posts - Launch', type: 'design', status: 'draft', count: 6, bonusCount: 2 },
      { name: 'Twitter Animated Posts', type: 'design', status: 'draft', count: 3, bonusCount: 0 },
    ],
  },

  // 2. In Progress - Website UI Design
  {
    name: 'Stellar Finance - Dashboard Redesign',
    description: 'Complete UI redesign for fintech dashboard',
    status: 'in_progress',
    priority: 'high',
    projectType: 'website-ui-design',
    daysOffset: 8,
    briefing: {
      projectOverview: 'Redesign the existing customer dashboard for Stellar Finance fintech platform. Focus on improved UX, modern aesthetics, and mobile responsiveness.',
      targetAudience: 'Individual investors, financial advisors, wealth managers aged 28-55',
      goals: 'Reduce bounce rate by 25%, increase user session time by 40%, improve mobile conversion',
      deliverables: 'Dashboard home, Portfolio view, Transaction history, Settings, Mobile responsive versions',
      styleNotes: 'Premium fintech feel, trust-inspiring colors (navy #1E3A5F, gold accents #D4AF37), clean data visualization, accessibility compliant',
      inspirations: 'Robinhood app, Wealthfront, Mercury Bank dashboard',
      finalMessaging: 'Brand voice: Professional yet approachable, "Your wealth, your way"',
      resourceLinks: 'Current site: stellar-finance.com, Competitor analysis: notion.so/xxx',
      timeline: 'Website UI Design (11 days) - Full page redesign with responsive versions',
      additionalNotes: 'Must pass WCAG 2.1 AA accessibility standards. Include dark mode option.',
    },
    deliverables: [
      { name: 'Dashboard Home v1.0', type: 'design', status: 'in_review', count: 3, bonusCount: 1, externalUrl: 'https://figma.com/file/stellar-dashboard' },
      { name: 'Portfolio View v1.0', type: 'design', status: 'in_progress', count: 2, bonusCount: 0 },
      { name: 'Mobile Responsive Kit', type: 'design', status: 'draft', count: 5, bonusCount: 2 },
    ],
  },

  // 3. In Review - Marketing Campaign
  {
    name: 'Bloom Beauty - Spring Collection',
    description: 'Multi-channel marketing campaign for seasonal launch',
    status: 'review',
    priority: 'high',
    projectType: 'marketing-campaign',
    daysOffset: 5,
    wasReviewed: false,
    briefing: {
      projectOverview: 'Create comprehensive marketing campaign for Bloom Beauty\'s Spring 2024 skincare collection. Campaign spans digital ads, email marketing, social media, and in-store displays.',
      targetAudience: 'Women 25-45, beauty enthusiasts, skincare-focused consumers, eco-conscious shoppers',
      goals: 'Drive $500K in first-month sales, 50K email signups, 100K social impressions',
      deliverables: 'Digital ads (5 sizes), Email templates (3), Social media kit (20 assets), In-store poster designs (2)',
      styleNotes: 'Fresh spring palette (soft pinks, greens, lavender), botanical elements, clean beauty aesthetic, sustainable messaging',
      inspirations: 'Glossier campaigns, Summer Fridays branding, Herbivore Botanicals',
      finalMessaging: '"Bloom into your best skin", "Nature-powered radiance", "Clean beauty, real results"',
      resourceLinks: 'Product photos: drive.google.com/bloom-spring, Brand book: figma.com/bloom-brand',
      timeline: 'Marketing Campaign (14 days) - Multi-channel campaign with all deliverables',
      additionalNotes: 'Influencer kit needed for 10 top-tier beauty influencers. Spanish language versions required.',
    },
    deliverables: [
      { name: 'Digital Ad Set - All Sizes', type: 'design', status: 'in_review', count: 5, bonusCount: 0 },
      { name: 'Email Templates - Launch Series', type: 'design', status: 'approved', count: 3, bonusCount: 1 },
      { name: 'Social Media Kit', type: 'design', status: 'in_review', count: 20, bonusCount: 5 },
      { name: 'In-Store Display Posters', type: 'design', status: 'in_progress', count: 2, bonusCount: 0 },
    ],
  },

  // 4. Done/Approved - Email Design
  {
    name: 'TechHub - Newsletter Redesign',
    description: 'Complete email template system redesign',
    status: 'done',
    priority: 'medium',
    projectType: 'email-design',
    daysOffset: -3,
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Redesign TechHub\'s entire email template system including weekly newsletter, promotional emails, and transactional emails.',
      targetAudience: 'Tech professionals, developers, startup founders, CTOs - primarily 25-40 years old',
      goals: 'Increase email open rates by 30%, click-through rates by 50%, reduce unsubscribes by 20%',
      deliverables: 'Newsletter template, Promotional template, Transactional emails (5 types), Welcome series (3 emails)',
      styleNotes: 'Dark mode compatible, minimalist tech aesthetic, code-friendly formatting, mobile-first design',
      inspirations: 'Morning Brew, The Hustle, TLDR newsletter designs',
      finalMessaging: 'Tone: Informative but casual, "Tech insights that matter", "Your weekly dose of innovation"',
      resourceLinks: 'Current templates: mailchimp.com/techhub, Analytics: docs.google.com/xxx',
      timeline: 'Email Design (7 days) - Complete template system',
      additionalNotes: 'Must be compatible with Mailchimp, Klaviyo, and SendGrid. Include dark mode variants.',
    },
    deliverables: [
      { name: 'Weekly Newsletter Template', type: 'design', status: 'delivered', count: 1, bonusCount: 0 },
      { name: 'Promotional Email Set', type: 'design', status: 'delivered', count: 3, bonusCount: 1 },
      { name: 'Transactional Email Suite', type: 'design', status: 'delivered', count: 5, bonusCount: 0 },
      { name: 'Welcome Series', type: 'design', status: 'delivered', count: 3, bonusCount: 0 },
    ],
  },

  // 5. In Progress - Video Production
  {
    name: 'FitLife - Workout Reels',
    description: 'Series of workout tutorial reels for Instagram',
    status: 'in_progress',
    priority: 'medium',
    projectType: 'video-production',
    daysOffset: 7,
    briefing: {
      projectOverview: 'Create 15 short-form workout tutorial videos (Reels/TikTok format) for FitLife fitness app promotion.',
      targetAudience: 'Fitness enthusiasts, home workout fans, millennials and Gen Z, primarily women 20-35',
      goals: 'Drive app downloads, build social following, establish FitLife as approachable fitness brand',
      deliverables: '15 workout reels (15-60 seconds each), 5 trainer intro videos, Thumbnail designs for YouTube',
      styleNotes: 'High energy, motivational, bright and airy aesthetic, upbeat music, text overlays in brand font',
      inspirations: 'Nike Training Club, Peloton social content, Pamela Reif videos',
      finalMessaging: '"Your fitness, your way", "Quick workouts, real results", "No gym? No problem."',
      resourceLinks: 'Raw footage: dropbox.com/fitlife-raw, Music library: artlist.io',
      timeline: 'Video Production (7 days) - 15 reels with all edits and effects',
      additionalNotes: 'All videos need closed captions. Include Spanish subtitles. Aspect ratios: 9:16 and 1:1.',
    },
    deliverables: [
      { name: 'Core Workout Series', type: 'design', status: 'in_progress', count: 5, bonusCount: 2 },
      { name: 'HIIT Workout Series', type: 'design', status: 'draft', count: 5, bonusCount: 1 },
      { name: 'Trainer Intro Videos', type: 'concept', status: 'in_progress', count: 5, bonusCount: 0 },
    ],
  },

  // 6. Urgent - Ad Design
  {
    name: 'CloudSync - Black Friday Ads',
    description: 'Urgent Black Friday promotional ad campaign',
    status: 'urgent',
    priority: 'urgent',
    projectType: 'ad-design',
    daysOffset: 2,
    briefing: {
      projectOverview: 'Design Black Friday promotional ads for CloudSync cloud storage service. Campaign runs across Google Display Network, Facebook, and programmatic.',
      targetAudience: 'SMB owners, remote teams, tech-forward professionals, 30-50 years old',
      goals: 'Achieve 3% CTR, 500 new subscriptions during Black Friday week, 2x ROAS minimum',
      deliverables: 'Google Display ads (8 sizes), Facebook/Instagram ads (4 formats), Static and animated versions',
      styleNotes: 'Bold Black Friday aesthetic, brand blue (#2563EB) with gold accents, urgency-driven design, clear CTAs',
      inspirations: 'Dropbox campaigns, Google Workspace ads, Monday.com promotions',
      finalMessaging: '"50% OFF - Black Friday Only", "Unlimited storage, limited time", "Save big on cloud"',
      resourceLinks: 'Brand assets: figma.com/cloudsync, Previous campaigns: drive.google.com/ads',
      timeline: 'Ad Design (5 days) - URGENT: 2 days deadline',
      additionalNotes: 'A/B testing variants needed. Include countdown timer animations. Must be approved by noon Thursday.',
    },
    deliverables: [
      { name: 'Google Display Ad Set', type: 'design', status: 'in_progress', count: 8, bonusCount: 0 },
      { name: 'Facebook Ad Creatives', type: 'design', status: 'draft', count: 4, bonusCount: 2 },
      { name: 'Animated Banner Variants', type: 'design', status: 'draft', count: 4, bonusCount: 0 },
    ],
  },

  // 7. In Progress - Hero Section
  {
    name: 'Artisan Bakery - Website Hero',
    description: 'Homepage hero section for local bakery website',
    status: 'in_progress',
    priority: 'low',
    projectType: 'hero-section',
    daysOffset: 12,
    briefing: {
      projectOverview: 'Design a warm, inviting hero section for Artisan Bakery\'s new website. Should showcase their handcrafted breads and pastries.',
      targetAudience: 'Local community members, food enthusiasts, families, ages 25-55',
      goals: 'Increase online orders by 40%, showcase product quality, build local brand recognition',
      deliverables: 'Hero section design (desktop + tablet + mobile), Image direction guide, Copy recommendations',
      styleNotes: 'Warm, rustic, handcrafted feel, earth tones with warm accents, beautiful food photography integration',
      inspirations: 'Le Pain Quotidien, Tartine Bakery, local artisan bakery aesthetics',
      finalMessaging: '"Baked fresh daily", "Handcrafted with love", "From our ovens to your table"',
      resourceLinks: 'Product photos: drive.google.com/artisan-photos, Current site: artisanbakery.com',
      timeline: 'Hero Section (5 days) - Desktop and responsive versions',
      additionalNotes: 'Include seasonal variant (for holiday promotions). Consider parallax scrolling effect.',
    },
    deliverables: [
      { name: 'Hero Section - Desktop', type: 'design', status: 'in_progress', count: 1, bonusCount: 0 },
      { name: 'Hero Section - Mobile', type: 'design', status: 'draft', count: 1, bonusCount: 1 },
      { name: 'Seasonal Holiday Variant', type: 'concept', status: 'draft', count: 1, bonusCount: 0 },
    ],
  },

  // 8. Review - GIF Design
  {
    name: 'GameHub - Animated Stickers',
    description: 'Animated sticker pack for gaming community',
    status: 'review',
    priority: 'medium',
    projectType: 'gif-design',
    daysOffset: 4,
    wasReviewed: false,
    briefing: {
      projectOverview: 'Create animated sticker/GIF pack for GameHub Discord community and social media. Fun, expressive animations for gamers.',
      targetAudience: 'Gamers aged 16-30, Discord community members, streamers, esports fans',
      goals: 'Increase community engagement, provide shareable content, build brand personality',
      deliverables: '20 animated stickers/GIFs, Discord emoji set (10), Twitch emotes (5)',
      styleNotes: 'Vibrant gaming aesthetic, pixel art touches, smooth animations, meme-friendly expressions',
      inspirations: 'Twitch emotes, Discord Nitro stickers, gaming meme culture',
      finalMessaging: 'Express gaming emotions: victory, defeat, excitement, rage, GG moments',
      resourceLinks: 'Mascot files: figma.com/gamehub-mascot, Reference GIFs: giphy.com/gamehub',
      timeline: 'GIF Design (5 days) - Animated sticker pack',
      additionalNotes: 'All GIFs must be under 256KB for Discord. Include looping and non-looping versions.',
    },
    deliverables: [
      { name: 'Animated Sticker Pack', type: 'design', status: 'in_review', count: 20, bonusCount: 5 },
      { name: 'Discord Emoji Set', type: 'design', status: 'in_review', count: 10, bonusCount: 2 },
      { name: 'Twitch Emotes', type: 'design', status: 'approved', count: 5, bonusCount: 0 },
    ],
  },

  // 9. Done - Website Assets
  {
    name: 'EcoShop - Product Icons',
    description: 'Icon set for sustainable e-commerce website',
    status: 'done',
    priority: 'low',
    projectType: 'website-assets',
    daysOffset: -5,
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Design custom icon set for EcoShop sustainable products e-commerce site. Icons for product categories, features, and checkout flow.',
      targetAudience: 'Eco-conscious consumers, sustainable living enthusiasts, ages 25-45',
      goals: 'Improve site navigation, reinforce sustainable brand identity, enhance product presentation',
      deliverables: '40 custom icons (SVG), 3 sizes each, Light and dark variants, Icon usage guidelines',
      styleNotes: 'Organic, hand-drawn feel with clean execution, leaf/nature motifs, sage green (#84A98C) palette',
      inspirations: 'Patagonia iconography, Allbirds design system, sustainable brand aesthetics',
      finalMessaging: 'Icons should communicate: eco-friendly, quality, trustworthy, natural',
      resourceLinks: 'Brand guidelines: notion.so/ecoshop, Website: ecoshop.com',
      timeline: 'Website Assets (5 days) - Complete icon system',
      additionalNotes: 'All icons must be SVG and accessible. Include Figma component library.',
    },
    deliverables: [
      { name: 'Product Category Icons', type: 'design', status: 'delivered', count: 15, bonusCount: 3 },
      { name: 'Feature & Benefit Icons', type: 'design', status: 'delivered', count: 15, bonusCount: 2 },
      { name: 'Checkout Flow Icons', type: 'design', status: 'delivered', count: 10, bonusCount: 0 },
    ],
  },

  // 10. In Progress - Other (Custom Project)
  {
    name: 'Summit 2024 - Event Branding',
    description: 'Complete brand identity for annual tech conference',
    status: 'in_progress',
    priority: 'high',
    projectType: 'other',
    daysOffset: 10,
    briefing: {
      projectOverview: 'Design complete visual identity system for Summit 2024 technology conference. Includes logo, marketing materials, signage, swag, and digital assets.',
      targetAudience: 'Tech professionals, developers, startup founders, investors, ages 25-50',
      goals: 'Establish Summit as premier tech event, create memorable attendee experience, drive 5000 registrations',
      deliverables: 'Event logo system, Marketing collateral (flyers, banners), Stage design, Name badges, Swag designs (t-shirts, bags), Digital assets',
      styleNotes: 'Futuristic yet approachable, bold geometric shapes, tech-inspired gradients, dark theme with vibrant accents',
      inspirations: 'Web Summit, SXSW, Google I/O, AWS re:Invent branding',
      finalMessaging: '"The future is now", "Connect. Learn. Build.", "Where ideas become reality"',
      resourceLinks: 'Previous years: drive.google.com/summit-archive, Venue specs: pdf/venue-layout',
      timeline: 'Custom Project (15 days) - Full event branding package',
      additionalNotes: 'Sponsor integration needed for platinum tier sponsors. All assets need print-ready and digital versions.',
    },
    deliverables: [
      { name: 'Event Logo System', type: 'concept', status: 'approved', count: 1, bonusCount: 0 },
      { name: 'Marketing Collateral', type: 'design', status: 'in_progress', count: 8, bonusCount: 2 },
      { name: 'Stage & Signage Design', type: 'design', status: 'draft', count: 6, bonusCount: 0 },
      { name: 'Swag Design Package', type: 'design', status: 'in_progress', count: 5, bonusCount: 3 },
      { name: 'Digital Asset Kit', type: 'design', status: 'draft', count: 15, bonusCount: 5 },
    ],
  },
];

export function DeveloperTools() {
  const { isInMiro, miro } = useMiro();
  const [isCreating, setIsCreating] = useState(false);
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

      const frames = await miro.board.get({ type: 'frame' });
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
    } finally {
      setIsRenaming(false);
    }
  };

  // Clear ALL data from the system
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

      // Get all projects
      addProgress('Fetching all projects...');
      const { data: allProjects, error: fetchError } = await supabase
        .from('projects')
        .select('id, name');

      if (fetchError) {
        addProgress(`⚠ Could not fetch projects: ${fetchError.message}`);
      } else {
        addProgress(`Found ${allProjects?.length || 0} projects to delete`);
      }

      // Delete junction tables
      addProgress('Deleting project_designers...');
      await supabase.from('project_designers').delete().neq('project_id', '00000000-0000-0000-0000-000000000000');
      addProgress('✓ project_designers deleted');

      // Delete deliverable-related tables
      addProgress('Deleting deliverable_feedback...');
      await supabase.from('deliverable_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      addProgress('✓ deliverable_feedback deleted');

      addProgress('Deleting deliverable_versions...');
      await supabase.from('deliverable_versions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      addProgress('✓ deliverable_versions deleted');

      addProgress('Deleting deliverables...');
      await supabase.from('deliverables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      addProgress('✓ deliverables deleted');

      // Delete all projects
      addProgress('Deleting projects...');
      if (allProjects && allProjects.length > 0) {
        for (const project of allProjects) {
          await supabase.from('projects').delete().eq('id', project.id);
          addProgress(`  ✓ Deleted: ${project.name}`);
        }
      }
      addProgress('✓ All projects deleted');

      // Reset Miro services
      addProgress('Resetting Miro services...');
      miroTimelineService.reset();
      miroProjectRowService.reset();
      addProgress('✓ Miro services reset');

      // Clear Miro board if in Miro
      if (isInMiro && miro) {
        addProgress('Clearing Miro board elements...');
        try {
          const frames = await miro.board.get({ type: 'frame' });
          const shapes = await miro.board.get({ type: 'shape' });
          const cards = await miro.board.get({ type: 'card' });
          const stickies = await miro.board.get({ type: 'sticky_note' });
          const texts = await miro.board.get({ type: 'text' });

          const allItems = [...frames, ...shapes, ...cards, ...stickies, ...texts];
          let removed = 0;
          for (const item of allItems) {
            try {
              await miro.board.remove(item);
              removed++;
            } catch {
              // Ignore
            }
          }
          addProgress(`✓ ${removed}/${allItems.length} elements removed from Miro`);
        } catch {
          addProgress('⚠ Could not clear all Miro elements');
        }
      }

      addProgress('');
      addProgress('🧹 SYSTEM CLEARED!');
      addProgress('Refresh the page to start fresh.');

    } catch (err) {
      logger.error('Clear failed', err);
      setError(err instanceof Error ? err.message : 'Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  // Create 10 test projects with full data
  const handleCreateTestProjects = async () => {
    if (!confirm('This will create 10 test projects with deliverables. Continue?')) {
      return;
    }

    setIsCreating(true);
    setProgress([]);
    setError(null);

    try {
      // Step 1: Check authentication
      addProgress('Checking authentication...');
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        throw new Error('Not authenticated');
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id', authUser.id)
        .single();

      addProgress(`✓ Logged in as: ${userData?.name || authUser.email} (${userData?.role})`);

      // Step 2: Get or create a client
      addProgress('Finding or creating test client...');
      const { data: clients } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('role', 'client')
        .limit(1);

      let clientId: string;
      if (clients && clients.length > 0 && clients[0]) {
        clientId = clients[0].id;
        addProgress(`✓ Using existing client: ${clients[0].name}`);
      } else {
        // Create a test client
        const { data: newClient, error: clientError } = await supabase
          .from('users')
          .insert({
            email: 'testclient@example.com',
            name: 'Test Client',
            role: 'client',
          })
          .select()
          .single();

        if (clientError) throw new Error('Failed to create test client');
        clientId = newClient.id;
        addProgress('✓ Created test client');
      }

      // Step 3: Get designers for assignment
      addProgress('Fetching available designers...');
      const { data: designers } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'designer');

      const designerIds = designers?.map(d => d.id) || [];
      addProgress(`✓ Found ${designerIds.length} designers`);

      // Step 4: Initialize Miro timeline if in Miro
      if (isInMiro && miro) {
        addProgress('Initializing Master Timeline...');
        await miroTimelineService.initializeTimeline();
        addProgress('✓ Master Timeline ready');
      }

      // Step 5: Create 10 test projects with full data
      addProgress('');
      addProgress('🚀 Creating 10 test projects...');
      addProgress('');

      let successCount = 0;
      let deliverableCount = 0;

      for (let i = 0; i < TEST_PROJECTS.length; i++) {
        const testData = TEST_PROJECTS[i];
        if (!testData) continue;

        // Calculate due date based on project type
        const projectTypeConfig = PROJECT_TYPES.find(pt => pt.value === testData.projectType);
        const daysToAdd = testData.daysOffset;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + daysToAdd);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 5)); // Started 0-5 days ago

        addProgress(`[${i + 1}/10] Creating: ${testData.name}`);

        try {
          // Build complete briefing with projectType
          const fullBriefing: ProjectBriefing = {
            ...testData.briefing,
            projectType: testData.projectType,
            timeline: `${projectTypeConfig?.label || testData.projectType} (${projectTypeConfig?.days || 15} days) - ${testData.briefing.timeline || ''}`,
          };

          // Create project input
          const projectInput: CreateProjectInput = {
            name: testData.name,
            description: testData.description,
            status: testData.status,
            priority: testData.priority,
            clientId,
            designerIds: designerIds.length > 0 ? [designerIds[i % designerIds.length]!] : [],
            dueDate: dueDate.toISOString().split('T')[0] ?? null,
            startDate: startDate.toISOString().split('T')[0] ?? null,
            briefing: fullBriefing,
            dueDateApproved: true,
            googleDriveUrl: `https://drive.google.com/drive/folders/${testData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          };

          // Create project in database
          const project = await projectService.createProject(projectInput);
          addProgress(`  ✓ Project created: ${project.id}`);

          // Update wasReviewed and wasApproved if needed
          if (testData.wasReviewed || testData.wasApproved) {
            await projectService.updateProject(project.id, {
              wasReviewed: testData.wasReviewed || false,
              wasApproved: testData.wasApproved || false,
            });
            addProgress(`  ✓ Status flags updated`);
          }

          // Create deliverables for this project
          for (const delData of testData.deliverables) {
            try {
              await deliverableService.createDeliverable({
                projectId: project.id,
                name: delData.name,
                type: delData.type,
                status: delData.status,
                count: delData.count,
                bonusCount: delData.bonusCount,
                externalUrl: delData.externalUrl || null,
                miroUrl: null,
              });
              deliverableCount++;
            } catch (delErr) {
              addProgress(`  ⚠ Deliverable failed: ${delData.name}`);
              logger.error('Deliverable creation failed', delErr);
            }
          }
          addProgress(`  ✓ ${testData.deliverables.length} deliverables created`);

          // Sync with Miro if available
          if (isInMiro && miro) {
            try {
              // Add to timeline
              await miroTimelineService.syncProject(project);

              // Create project row with briefing
              await miroProjectRowService.createProjectRow(project, fullBriefing);
              addProgress(`  ✓ Miro board synced`);
            } catch (miroErr) {
              addProgress(`  ⚠ Miro sync failed`);
              logger.error('Miro sync failed', miroErr);
            }
          }

          successCount++;
          addProgress('');

        } catch (err) {
          addProgress(`  ✗ FAILED: ${err instanceof Error ? err.message : 'Unknown error'}`);
          logger.error('Project creation failed', err);
        }
      }

      // Summary
      addProgress('═══════════════════════════════════════');
      addProgress('');
      addProgress(`✅ SUCCESS! Created ${successCount}/10 projects`);
      addProgress(`📦 Created ${deliverableCount} deliverables total`);
      addProgress('');
      addProgress('📊 Summary by status:');
      const statusCounts = TEST_PROJECTS.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      Object.entries(statusCounts).forEach(([status, count]) => {
        addProgress(`   • ${status}: ${count} projects`);
      });
      addProgress('');
      addProgress('🔄 Refresh the page to see the new projects!');
      addProgress('📈 Go to Reports to generate analytics!');

    } catch (err) {
      logger.error('Test project creation failed', err);
      setError(err instanceof Error ? err.message : 'Failed to create test projects');
      addProgress(`❌ ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Developer Tools</h2>
        <p className={styles.subtitle}>Testing and development utilities</p>
      </div>

      {/* Create Test Projects Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🚀 Create 10 Test Projects</h3>
        <p className={styles.sectionDescription}>
          Create realistic test projects with full briefing data, deliverables, assets, and versions.
          Perfect for testing reports and understanding the complete workflow.
        </p>

        <div className={styles.featureList}>
          <div className={styles.featureItem}>✓ 10 realistic design studio projects</div>
          <div className={styles.featureItem}>✓ Complete briefing data for all fields</div>
          <div className={styles.featureItem}>✓ Deliverables with assets and bonus counts</div>
          <div className={styles.featureItem}>✓ Mix of statuses: urgent, in_progress, review, done</div>
          <div className={styles.featureItem}>✓ Miro board sync (if connected)</div>
        </div>

        <div className={styles.status}>
          <span>Miro Connection: </span>
          <span className={isInMiro ? styles.connected : styles.disconnected}>
            {isInMiro ? '✓ Connected' : '○ Not in Miro (will skip board sync)'}
          </span>
        </div>

        <Button
          onClick={handleCreateTestProjects}
          isLoading={isCreating}
          variant="primary"
          className={styles.primaryButton}
        >
          {isCreating ? 'Creating Projects...' : '✨ Create 10 Test Projects'}
        </Button>
      </div>

      {/* Clear All Data Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🧹 Clear All System Data</h3>
        <p className={styles.sectionDescription}>
          Remove ALL data from the system to start fresh. Use this for a clean slate.
        </p>

        <div className={styles.warningDanger}>
          <strong>⚠️ CAUTION:</strong> This will permanently delete all projects, deliverables, and Miro board elements.
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
          Migration tool: Renames all Miro frames with "STAGE" to "VERSION".
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
          className={styles.secondaryButton}
          disabled={!isInMiro}
        >
          {isRenaming ? 'Renaming...' : '📝 Rename STAGE to VERSION'}
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
