import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui';
import { useMiro } from '@features/boards';
import { useAuth } from '@features/auth';
import { miroTimelineService, miroProjectRowService } from '@features/boards/services/miroSdkService';
import { projectService } from '@features/projects/services/projectService';
import { projectKeys } from '@features/projects/services/projectKeys';
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
  // For completed projects: exact dates in 2025
  startDate?: string; // YYYY-MM-DD
  dueDate?: string;   // YYYY-MM-DD
  completedAt?: string; // YYYY-MM-DD
  // For active projects: days offset from now
  daysOffset?: number;
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
  // ============================================
  // COMPLETED PROJECTS (15) - Throughout 2025
  // ============================================

  // 1. January 2025 - Completed
  {
    name: 'Zenith Labs - Brand Launch',
    description: 'Complete brand identity for biotech startup',
    status: 'done',
    priority: 'high',
    projectType: 'other',
    startDate: '2025-01-08',
    dueDate: '2025-01-22',
    completedAt: '2025-01-21',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Create complete brand identity for Zenith Labs, a biotech startup focused on personalized medicine. Includes logo, brand guidelines, and initial marketing materials.',
      targetAudience: 'Healthcare professionals, investors, pharmaceutical partners, ages 35-60',
      goals: 'Establish credible brand presence, attract Series A funding, differentiate from competitors',
      deliverables: 'Logo system, Brand guidelines, Business cards, Letterhead, Pitch deck template',
      styleNotes: 'Scientific yet approachable, clean modern aesthetic, DNA/helix motifs, blue-green palette (#0EA5E9, #14B8A6)',
      inspirations: '23andMe, Moderna branding, modern healthcare startups',
      finalMessaging: '"Precision medicine for everyone", "Your DNA, your health, your future"',
      resourceLinks: 'Competitor analysis: notion.so/zenith, Founder vision: docs.google.com/xxx',
      timeline: 'Custom Project (15 days) - Full brand identity package',
      additionalNotes: 'FDA compliance considerations for healthcare branding. Investor presentation needed by end of month.',
    },
    deliverables: [
      { name: 'Logo System & Variations', type: 'design', status: 'delivered', count: 8, bonusCount: 2 },
      { name: 'Brand Guidelines Document', type: 'design', status: 'delivered', count: 1, bonusCount: 0 },
      { name: 'Business Stationery Set', type: 'design', status: 'delivered', count: 4, bonusCount: 1 },
      { name: 'Investor Pitch Deck', type: 'design', status: 'delivered', count: 25, bonusCount: 5 },
    ],
  },

  // 2. February 2025 - Completed
  {
    name: 'Coastal Realty - Website Redesign',
    description: 'Full website UI/UX redesign for luxury real estate',
    status: 'done',
    priority: 'high',
    projectType: 'website-ui-design',
    startDate: '2025-02-03',
    dueDate: '2025-02-17',
    completedAt: '2025-02-16',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Redesign website for Coastal Realty, a luxury beachfront property agency. Focus on showcasing properties with immersive visuals and seamless booking.',
      targetAudience: 'High-net-worth individuals, vacation home buyers, investors, ages 40-65',
      goals: 'Increase property inquiries by 50%, reduce bounce rate, improve mobile experience',
      deliverables: 'Homepage, Property listings, Property detail page, Contact/booking flow, Mobile responsive',
      styleNotes: 'Luxury minimalist, ocean-inspired palette (#0C4A6E, #F0F9FF), large imagery, elegant typography',
      inspirations: 'Sotheby\'s Realty, Christie\'s Real Estate, luxury hotel websites',
      finalMessaging: '"Your dream coastal home awaits", "Luxury living by the sea"',
      resourceLinks: 'Property photos: drive.google.com/coastal, Current site: coastalrealty.com',
      timeline: 'Website UI Design (11 days) - Full site redesign',
      additionalNotes: 'Virtual tour integration required. IDX/MLS feed compatibility needed.',
    },
    deliverables: [
      { name: 'Homepage Design', type: 'design', status: 'delivered', count: 3, bonusCount: 1 },
      { name: 'Property Listing Pages', type: 'design', status: 'delivered', count: 4, bonusCount: 0 },
      { name: 'Property Detail Page', type: 'design', status: 'delivered', count: 2, bonusCount: 1 },
      { name: 'Mobile Responsive Kit', type: 'design', status: 'delivered', count: 6, bonusCount: 2 },
    ],
  },

  // 3. March 2025 - Completed
  {
    name: 'PetPal - App Marketing Campaign',
    description: 'Launch campaign for pet care mobile app',
    status: 'done',
    priority: 'medium',
    projectType: 'marketing-campaign',
    startDate: '2025-03-10',
    dueDate: '2025-03-24',
    completedAt: '2025-03-23',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Create multi-channel marketing campaign for PetPal app launch. Campaign targets pet owners across social media, app stores, and digital ads.',
      targetAudience: 'Pet owners (dogs & cats primarily), millennials and Gen Z, ages 25-40',
      goals: '100K app downloads in first month, 4.5+ star rating, build community of engaged users',
      deliverables: 'App store screenshots, Social media ads, Influencer kit, Email welcome series',
      styleNotes: 'Playful and warm, bright cheerful colors (#F59E0B, #EC4899), cute pet illustrations, friendly tone',
      inspirations: 'Rover app, BarkBox branding, pet influencer aesthetics',
      finalMessaging: '"Happy pets, happy life", "Your pet\'s best friend in your pocket"',
      resourceLinks: 'App screenshots: figma.com/petpal, Pet photos: unsplash.com/collection/pets',
      timeline: 'Marketing Campaign (14 days) - Full launch campaign',
      additionalNotes: 'Pet influencer partnerships confirmed. Need assets for 5 different pet types.',
    },
    deliverables: [
      { name: 'App Store Screenshots', type: 'design', status: 'delivered', count: 10, bonusCount: 2 },
      { name: 'Social Media Ad Set', type: 'design', status: 'delivered', count: 15, bonusCount: 3 },
      { name: 'Influencer Marketing Kit', type: 'design', status: 'delivered', count: 8, bonusCount: 2 },
      { name: 'Email Welcome Series', type: 'design', status: 'delivered', count: 5, bonusCount: 1 },
    ],
  },

  // 4. April 2025 - Completed
  {
    name: 'Brew Brothers - Coffee Shop Rebrand',
    description: 'Visual identity refresh for local coffee chain',
    status: 'done',
    priority: 'medium',
    projectType: 'other',
    startDate: '2025-04-07',
    dueDate: '2025-04-21',
    completedAt: '2025-04-20',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Refresh brand identity for Brew Brothers, a 5-location artisan coffee chain. Modernize while maintaining craft coffee heritage.',
      targetAudience: 'Coffee enthusiasts, remote workers, young professionals, ages 22-45',
      goals: 'Attract younger demographic, increase brand recognition, support expansion to 10 locations',
      deliverables: 'Updated logo, Menu designs, Packaging (cups, bags), Signage templates, Social media kit',
      styleNotes: 'Modern craft aesthetic, warm earth tones (#78350F, #FEF3C7), hand-drawn elements, vintage-modern fusion',
      inspirations: 'Blue Bottle Coffee, Stumptown, local artisan cafes',
      finalMessaging: '"Crafted with care", "Your neighborhood coffee experts"',
      resourceLinks: 'Current branding: drive.google.com/brewbros, Location photos: dropbox.com/stores',
      timeline: 'Custom Project (15 days) - Full rebrand package',
      additionalNotes: 'Franchise kit needed for new location owners. Seasonal menu template required.',
    },
    deliverables: [
      { name: 'Logo Refresh & System', type: 'design', status: 'delivered', count: 6, bonusCount: 1 },
      { name: 'Menu Design System', type: 'design', status: 'delivered', count: 4, bonusCount: 1 },
      { name: 'Packaging Design Set', type: 'design', status: 'delivered', count: 8, bonusCount: 2 },
      { name: 'Store Signage Templates', type: 'design', status: 'delivered', count: 5, bonusCount: 0 },
    ],
  },

  // 5. May 2025 - Completed
  {
    name: 'TechStart - Pitch Deck Design',
    description: 'Investor pitch deck for AI startup',
    status: 'done',
    priority: 'urgent',
    projectType: 'other',
    startDate: '2025-05-12',
    dueDate: '2025-05-19',
    completedAt: '2025-05-18',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Design compelling investor pitch deck for TechStart, an AI-powered customer service platform seeking Series B funding.',
      targetAudience: 'Venture capitalists, angel investors, strategic partners',
      goals: 'Secure $15M Series B, clearly communicate value proposition, stand out from competitors',
      deliverables: 'Full pitch deck (30 slides), Executive summary (1-pager), Data visualization graphics',
      styleNotes: 'Professional tech aesthetic, confident and bold, dark theme with accent colors, clean data viz',
      inspirations: 'Sequoia pitch deck templates, successful YC company decks',
      finalMessaging: '"AI that understands your customers", "10x efficiency, 1/10th the cost"',
      resourceLinks: 'Company metrics: notion.so/techstart, Product demos: loom.com/techstart',
      timeline: 'Custom Project (7 days) - URGENT: VC meeting scheduled',
      additionalNotes: 'Demo Day presentation version needed. Include speaker notes.',
    },
    deliverables: [
      { name: 'Full Pitch Deck', type: 'design', status: 'delivered', count: 30, bonusCount: 5 },
      { name: 'Executive Summary', type: 'design', status: 'delivered', count: 1, bonusCount: 0 },
      { name: 'Data Visualization Set', type: 'design', status: 'delivered', count: 12, bonusCount: 3 },
    ],
  },

  // 6. June 2025 - Completed
  {
    name: 'Summer Vibes - Music Festival',
    description: 'Visual identity for outdoor music festival',
    status: 'done',
    priority: 'high',
    projectType: 'marketing-campaign',
    startDate: '2025-06-02',
    dueDate: '2025-06-16',
    completedAt: '2025-06-15',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Create complete visual identity and marketing materials for Summer Vibes Music Festival, a 3-day outdoor event.',
      targetAudience: 'Music lovers, festival-goers, ages 18-35, social media active',
      goals: 'Sell out 25,000 tickets, create viral social content, establish as annual must-attend event',
      deliverables: 'Event logo, Poster series, Social media kit, Wristband designs, Stage graphics, Merch designs',
      styleNotes: 'Vibrant and energetic, psychedelic-modern fusion, sunset color palette (#F97316, #EC4899, #8B5CF6)',
      inspirations: 'Coachella, Primavera Sound, modern festival aesthetics',
      finalMessaging: '"Feel the music, live the moment", "Summer starts here"',
      resourceLinks: 'Artist lineup: docs.google.com/lineup, Venue map: pdf/venue',
      timeline: 'Marketing Campaign (14 days) - Full festival branding',
      additionalNotes: 'Sponsor logo integration required. Need day-specific color variations.',
    },
    deliverables: [
      { name: 'Festival Logo & Identity', type: 'design', status: 'delivered', count: 5, bonusCount: 1 },
      { name: 'Poster Series', type: 'design', status: 'delivered', count: 6, bonusCount: 2 },
      { name: 'Social Media Campaign Kit', type: 'design', status: 'delivered', count: 30, bonusCount: 8 },
      { name: 'Merchandise Designs', type: 'design', status: 'delivered', count: 10, bonusCount: 3 },
      { name: 'Stage & Signage Graphics', type: 'design', status: 'delivered', count: 8, bonusCount: 0 },
    ],
  },

  // 7. July 2025 - Completed
  {
    name: 'FreshMart - E-commerce Redesign',
    description: 'Online grocery shopping platform redesign',
    status: 'done',
    priority: 'high',
    projectType: 'website-ui-design',
    startDate: '2025-07-07',
    dueDate: '2025-07-21',
    completedAt: '2025-07-19',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Complete redesign of FreshMart online grocery platform. Focus on speed, ease of use, and mobile-first experience.',
      targetAudience: 'Busy families, health-conscious shoppers, urban professionals, ages 28-55',
      goals: 'Increase conversion rate by 35%, reduce cart abandonment, improve reorder flow',
      deliverables: 'Homepage, Category pages, Product detail, Cart & checkout, Order tracking, Mobile app screens',
      styleNotes: 'Fresh and clean, appetite-appealing, green-focused palette (#22C55E, #F0FDF4), quick-scan layouts',
      inspirations: 'Instacart, Amazon Fresh, Whole Foods online',
      finalMessaging: '"Fresh to your door", "Grocery shopping made easy"',
      resourceLinks: 'Current analytics: mixpanel.com/freshmart, User research: notion.so/research',
      timeline: 'Website UI Design (11 days) - Full platform redesign',
      additionalNotes: 'Same-day delivery badge system needed. Recipe integration for meal planning.',
    },
    deliverables: [
      { name: 'Homepage & Navigation', type: 'design', status: 'delivered', count: 4, bonusCount: 1 },
      { name: 'Category & Search Pages', type: 'design', status: 'delivered', count: 6, bonusCount: 2 },
      { name: 'Cart & Checkout Flow', type: 'design', status: 'delivered', count: 5, bonusCount: 1 },
      { name: 'Mobile App Screens', type: 'design', status: 'delivered', count: 15, bonusCount: 4 },
    ],
  },

  // 8. August 2025 - Completed
  {
    name: 'Mindful - Meditation App UI',
    description: 'UI design for wellness meditation app',
    status: 'done',
    priority: 'medium',
    projectType: 'website-ui-design',
    startDate: '2025-08-04',
    dueDate: '2025-08-18',
    completedAt: '2025-08-17',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Design calming, intuitive UI for Mindful meditation and wellness app. Focus on reducing friction and promoting daily practice.',
      targetAudience: 'Stress-prone professionals, wellness seekers, beginners to meditation, ages 25-50',
      goals: 'Achieve 60% day-7 retention, increase session completion, build habit-forming experience',
      deliverables: 'Onboarding flow, Home dashboard, Meditation player, Progress tracking, Settings',
      styleNotes: 'Serene and minimal, soft gradients, nature-inspired palette (#A7F3D0, #DBEAFE, #FDE68A), gentle animations',
      inspirations: 'Headspace, Calm, minimalist wellness apps',
      finalMessaging: '"Find your peace", "Just breathe", "Your daily moment of calm"',
      resourceLinks: 'User personas: notion.so/mindful, Competitive analysis: figma.com/research',
      timeline: 'Website UI Design (11 days) - Full app UI',
      additionalNotes: 'Dark mode essential for nighttime use. Apple Watch companion screens needed.',
    },
    deliverables: [
      { name: 'Onboarding Flow', type: 'design', status: 'delivered', count: 8, bonusCount: 2 },
      { name: 'Core App Screens', type: 'design', status: 'delivered', count: 12, bonusCount: 3 },
      { name: 'Meditation Player UI', type: 'design', status: 'delivered', count: 4, bonusCount: 1 },
      { name: 'Apple Watch Screens', type: 'design', status: 'delivered', count: 6, bonusCount: 0 },
    ],
  },

  // 9. September 2025 - Completed
  {
    name: 'AutoPro - Car Dealership Website',
    description: 'Modern website for automotive dealership',
    status: 'done',
    priority: 'medium',
    projectType: 'website-ui-design',
    startDate: '2025-09-08',
    dueDate: '2025-09-22',
    completedAt: '2025-09-20',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Design modern, trust-building website for AutoPro car dealership. Streamline vehicle browsing and inquiry process.',
      targetAudience: 'Car buyers, first-time owners, families upgrading, ages 25-55',
      goals: 'Increase test drive bookings by 40%, improve lead quality, showcase inventory effectively',
      deliverables: 'Homepage, Vehicle listings, Vehicle detail, Financing calculator, Contact forms',
      styleNotes: 'Premium automotive feel, sleek and modern, dark with metallic accents (#1F2937, #D1D5DB)',
      inspirations: 'Tesla website, BMW configurator, modern car brand sites',
      finalMessaging: '"Drive your dream", "Fair deals, no hassle"',
      resourceLinks: 'Inventory feed: api.autopro.com, Current site: autopro.com',
      timeline: 'Website UI Design (11 days) - Full dealership site',
      additionalNotes: 'Vehicle comparison tool needed. Trade-in value estimator integration.',
    },
    deliverables: [
      { name: 'Homepage Design', type: 'design', status: 'delivered', count: 3, bonusCount: 1 },
      { name: 'Vehicle Listing Pages', type: 'design', status: 'delivered', count: 4, bonusCount: 1 },
      { name: 'Vehicle Detail & Config', type: 'design', status: 'delivered', count: 5, bonusCount: 2 },
      { name: 'Lead Generation Forms', type: 'design', status: 'delivered', count: 3, bonusCount: 0 },
    ],
  },

  // 10. October 2025 - Completed
  {
    name: 'SpookFest - Halloween Campaign',
    description: 'Halloween marketing campaign for retail brand',
    status: 'done',
    priority: 'high',
    projectType: 'marketing-campaign',
    startDate: '2025-10-01',
    dueDate: '2025-10-15',
    completedAt: '2025-10-14',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Create engaging Halloween marketing campaign for SpookFest retail brand. Drive seasonal sales across all channels.',
      targetAudience: 'Families, party planners, Halloween enthusiasts, ages 25-45',
      goals: 'Achieve 200% YoY sales increase, viral social engagement, clear inventory by Oct 31',
      deliverables: 'Email campaign, Social media kit, In-store displays, Website banners, Costume guide',
      styleNotes: 'Fun-spooky (not scary), orange/purple/black palette, playful illustrations, family-friendly',
      inspirations: 'Target Halloween, Spirit Halloween, Disney Halloween',
      finalMessaging: '"Make it a SpookFest!", "Halloween made easy"',
      resourceLinks: 'Product catalog: drive.google.com/spookfest, Last year campaign: figma.com/2024',
      timeline: 'Marketing Campaign (14 days) - Full Halloween push',
      additionalNotes: 'Kid-friendly versions for all assets. Pet costume section needed.',
    },
    deliverables: [
      { name: 'Email Campaign Series', type: 'design', status: 'delivered', count: 6, bonusCount: 2 },
      { name: 'Social Media Kit', type: 'design', status: 'delivered', count: 25, bonusCount: 5 },
      { name: 'In-Store Display Set', type: 'design', status: 'delivered', count: 8, bonusCount: 2 },
      { name: 'Website Banner Set', type: 'design', status: 'delivered', count: 10, bonusCount: 3 },
    ],
  },

  // 11. October 2025 - Completed
  {
    name: 'FinanceFlow - Dashboard Icons',
    description: 'Custom icon set for fintech dashboard',
    status: 'done',
    priority: 'low',
    projectType: 'website-assets',
    startDate: '2025-10-14',
    dueDate: '2025-10-21',
    completedAt: '2025-10-20',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Design comprehensive icon set for FinanceFlow fintech platform dashboard. Consistent style across all financial functions.',
      targetAudience: 'Finance professionals, business owners, accountants',
      goals: 'Improve dashboard usability, create consistent visual language, support dark/light modes',
      deliverables: '60 custom icons, 3 sizes each, Outline and filled variants, Dark mode versions',
      styleNotes: 'Professional and precise, 2px stroke weight, rounded corners, financial metaphors',
      inspirations: 'Stripe Dashboard, Plaid, modern fintech iconography',
      finalMessaging: 'Icons should feel: trustworthy, modern, precise, professional',
      resourceLinks: 'Dashboard mockups: figma.com/financeflow, Icon audit: notion.so/icons',
      timeline: 'Website Assets (5 days) - Complete icon system',
      additionalNotes: 'Include animated versions for key actions. Figma component library required.',
    },
    deliverables: [
      { name: 'Navigation Icons', type: 'design', status: 'delivered', count: 15, bonusCount: 3 },
      { name: 'Action Icons', type: 'design', status: 'delivered', count: 20, bonusCount: 4 },
      { name: 'Status & Alert Icons', type: 'design', status: 'delivered', count: 15, bonusCount: 2 },
      { name: 'Financial Category Icons', type: 'design', status: 'delivered', count: 10, bonusCount: 1 },
    ],
  },

  // 12. November 2025 - Completed
  {
    name: 'GreenLeaf - Product Launch',
    description: 'New plant-based product line launch',
    status: 'done',
    priority: 'high',
    projectType: 'marketing-campaign',
    startDate: '2025-11-03',
    dueDate: '2025-11-17',
    completedAt: '2025-11-15',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Launch campaign for GreenLeaf\'s new organic plant-based product line. Position as premium healthy alternative.',
      targetAudience: 'Health-conscious consumers, vegans/vegetarians, eco-aware shoppers, ages 25-45',
      goals: 'Achieve 50K units sold in launch month, build brand awareness, secure retail partnerships',
      deliverables: 'Product photography direction, Packaging design, Social campaign, Retail displays, PR kit',
      styleNotes: 'Fresh and natural, bright greens with earth tones, clean minimalist, sustainability-focused',
      inspirations: 'Beyond Meat, Oatly, premium organic brands',
      finalMessaging: '"Good for you, good for Earth", "Plant-powered living"',
      resourceLinks: 'Product samples: office, Competitor shelf: drive.google.com/retail',
      timeline: 'Marketing Campaign (14 days) - Full product launch',
      additionalNotes: 'Dietary certification badges required. Recipe card series for social.',
    },
    deliverables: [
      { name: 'Packaging Design System', type: 'design', status: 'delivered', count: 8, bonusCount: 2 },
      { name: 'Social Media Launch Kit', type: 'design', status: 'delivered', count: 20, bonusCount: 5 },
      { name: 'Retail Display Materials', type: 'design', status: 'delivered', count: 6, bonusCount: 1 },
      { name: 'PR & Media Kit', type: 'design', status: 'delivered', count: 5, bonusCount: 1 },
    ],
  },

  // 13. November 2025 - Completed
  {
    name: 'TravelNow - Email Templates',
    description: 'Email template system for travel booking platform',
    status: 'done',
    priority: 'medium',
    projectType: 'email-design',
    startDate: '2025-11-10',
    dueDate: '2025-11-17',
    completedAt: '2025-11-16',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Design comprehensive email template system for TravelNow booking platform. Cover all touchpoints from browsing to post-trip.',
      targetAudience: 'Travelers, vacation planners, business travelers, ages 25-60',
      goals: 'Increase email engagement by 40%, reduce booking abandonment, improve customer satisfaction',
      deliverables: 'Booking confirmation, Itinerary emails, Promotional templates, Review request, Re-engagement series',
      styleNotes: 'Exciting and aspirational, destination imagery, brand blue (#0284C7) with warm accents',
      inspirations: 'Airbnb emails, Booking.com, Expedia communications',
      finalMessaging: '"Your adventure awaits", "Travel made simple"',
      resourceLinks: 'Email analytics: klaviyo.com/travelnow, Brand guide: figma.com/brand',
      timeline: 'Email Design (7 days) - Complete email system',
      additionalNotes: 'Multi-language support needed. Mobile-first required - 70% mobile opens.',
    },
    deliverables: [
      { name: 'Transactional Emails', type: 'design', status: 'delivered', count: 8, bonusCount: 2 },
      { name: 'Promotional Templates', type: 'design', status: 'delivered', count: 5, bonusCount: 1 },
      { name: 'Automated Series', type: 'design', status: 'delivered', count: 6, bonusCount: 2 },
    ],
  },

  // 14. November 2025 - Completed
  {
    name: 'TechSummit 2025 - Conference',
    description: 'Annual tech conference branding refresh',
    status: 'done',
    priority: 'high',
    projectType: 'other',
    startDate: '2025-11-18',
    dueDate: '2025-12-02',
    completedAt: '2025-11-30',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Refresh branding for TechSummit 2025, the annual technology conference. Theme: "AI & The Future of Work".',
      targetAudience: 'Tech professionals, executives, entrepreneurs, investors, ages 28-55',
      goals: 'Sell 5000 tickets, attract top-tier sponsors, generate media coverage',
      deliverables: 'Event branding, Marketing materials, Digital assets, Signage, Swag designs, Sponsor kit',
      styleNotes: 'Futuristic and innovative, AI-inspired visuals, gradient meshes, dark theme with neon accents',
      inspirations: 'CES, Web Summit, Google I/O',
      finalMessaging: '"Shape the future", "Where innovation meets opportunity"',
      resourceLinks: 'Previous years: drive.google.com/techsummit, Venue specs: pdf/convention-center',
      timeline: 'Custom Project (15 days) - Full conference package',
      additionalNotes: 'Virtual attendance option branding needed. Speaker card templates required.',
    },
    deliverables: [
      { name: 'Event Branding System', type: 'design', status: 'delivered', count: 10, bonusCount: 3 },
      { name: 'Marketing Campaign Assets', type: 'design', status: 'delivered', count: 25, bonusCount: 6 },
      { name: 'Venue Signage Package', type: 'design', status: 'delivered', count: 15, bonusCount: 4 },
      { name: 'Sponsor & Speaker Kit', type: 'design', status: 'delivered', count: 8, bonusCount: 2 },
    ],
  },

  // 15. Early December 2025 - Completed
  {
    name: 'WinterWear - Holiday Collection',
    description: 'Holiday marketing for fashion brand',
    status: 'done',
    priority: 'urgent',
    projectType: 'marketing-campaign',
    startDate: '2025-11-25',
    dueDate: '2025-12-05',
    completedAt: '2025-12-04',
    wasReviewed: true,
    wasApproved: true,
    briefing: {
      projectOverview: 'Create holiday marketing campaign for WinterWear fashion brand. Focus on gift-giving and holiday party season.',
      targetAudience: 'Fashion-conscious consumers, gift shoppers, ages 25-45',
      goals: 'Achieve record Q4 sales, increase average order value, drive gift card sales',
      deliverables: 'Holiday lookbook, Gift guide, Social campaign, Email series, Website takeover',
      styleNotes: 'Elegant and festive, winter wonderland aesthetic, silver/gold accents, cozy yet glamorous',
      inspirations: 'Nordstrom holiday, Anthropologie, premium fashion campaigns',
      finalMessaging: '"Give the gift of style", "Make this season sparkle"',
      resourceLinks: 'Product shots: drive.google.com/winterwear, Holiday collection: shopify.com/admin',
      timeline: 'Marketing Campaign (10 days) - URGENT holiday timeline',
      additionalNotes: 'Black Friday and Cyber Monday specific assets. Gift wrap option promotion.',
    },
    deliverables: [
      { name: 'Holiday Lookbook', type: 'design', status: 'delivered', count: 15, bonusCount: 3 },
      { name: 'Gift Guide Collection', type: 'design', status: 'delivered', count: 10, bonusCount: 2 },
      { name: 'Social Media Campaign', type: 'design', status: 'delivered', count: 30, bonusCount: 8 },
      { name: 'Email Marketing Series', type: 'design', status: 'delivered', count: 8, bonusCount: 2 },
    ],
  },

  // ============================================
  // ACTIVE PROJECTS (5) - December 2025
  // ============================================

  // 16. In Progress - Due Dec 15
  {
    name: 'NovaTech - Product Demo Video',
    description: 'Animated product demo for SaaS platform',
    status: 'in_progress',
    priority: 'high',
    projectType: 'video-production',
    daysOffset: 6, // Due Dec 15
    briefing: {
      projectOverview: 'Create engaging animated product demo video for NovaTech AI analytics platform. Show key features and benefits.',
      targetAudience: 'Business decision makers, data analysts, tech-forward companies',
      goals: 'Increase demo requests by 50%, reduce sales cycle, improve landing page conversion',
      deliverables: '90-second main video, 30-second teaser, Social cuts (15sec), Thumbnail designs',
      styleNotes: 'Modern tech aesthetic, smooth animations, brand purple (#7C3AED), professional voiceover',
      inspirations: 'Slack product videos, Monday.com demos, Notion marketing',
      finalMessaging: '"See the future of analytics", "Insights in seconds, not hours"',
      resourceLinks: 'Platform walkthrough: loom.com/novatech, Brand assets: figma.com/nova',
      timeline: 'Video Production (7 days) - Product demo video',
      additionalNotes: 'Voiceover recording scheduled. Captions required in English and Spanish.',
    },
    deliverables: [
      { name: 'Main Demo Video (90s)', type: 'design', status: 'in_progress', count: 1, bonusCount: 0 },
      { name: 'Teaser Video (30s)', type: 'design', status: 'draft', count: 1, bonusCount: 0 },
      { name: 'Social Media Cuts', type: 'design', status: 'draft', count: 4, bonusCount: 1 },
      { name: 'Thumbnail Designs', type: 'design', status: 'in_progress', count: 3, bonusCount: 1 },
    ],
  },

  // 17. In Review - Due Dec 12
  {
    name: 'CryptoVault - App Redesign',
    description: 'Mobile app UI refresh for crypto wallet',
    status: 'review',
    priority: 'high',
    projectType: 'website-ui-design',
    daysOffset: 3, // Due Dec 12
    wasReviewed: false,
    briefing: {
      projectOverview: 'Redesign CryptoVault mobile wallet app for improved security UX and easier transactions. Trust and clarity are paramount.',
      targetAudience: 'Crypto investors, traders, DeFi users, ages 25-45',
      goals: 'Increase daily active users by 30%, reduce support tickets, improve transaction completion rate',
      deliverables: 'Dashboard, Send/receive flows, Portfolio view, Security settings, Onboarding',
      styleNotes: 'Secure and premium feel, dark theme default, accent green (#10B981), clean data display',
      inspirations: 'Coinbase Wallet, MetaMask, Trust Wallet',
      finalMessaging: '"Your crypto, secured", "Trade with confidence"',
      resourceLinks: 'Current app: app.cryptovault.io, User feedback: notion.so/feedback',
      timeline: 'Website UI Design (11 days) - Mobile app redesign',
      additionalNotes: 'Biometric auth flows needed. Gas fee estimation UI critical.',
    },
    deliverables: [
      { name: 'Core App Screens', type: 'design', status: 'in_review', count: 15, bonusCount: 3 },
      { name: 'Transaction Flows', type: 'design', status: 'in_review', count: 8, bonusCount: 2 },
      { name: 'Security & Settings', type: 'design', status: 'approved', count: 6, bonusCount: 1 },
      { name: 'Onboarding Sequence', type: 'design', status: 'in_review', count: 5, bonusCount: 1 },
    ],
  },

  // 18. Urgent - Due Dec 11
  {
    name: 'YearEnd Corp - Annual Report',
    description: 'Corporate annual report design',
    status: 'urgent',
    priority: 'urgent',
    projectType: 'other',
    daysOffset: 2, // Due Dec 11
    briefing: {
      projectOverview: 'Design 2025 annual report for YearEnd Corp. Professional document showcasing yearly achievements, financials, and future outlook.',
      targetAudience: 'Shareholders, board members, potential investors, employees',
      goals: 'Meet SEC filing deadline, impress stakeholders, clearly communicate growth story',
      deliverables: 'Full annual report (60 pages), Executive summary, Infographic highlights, Digital version',
      styleNotes: 'Corporate professional, clean layouts, brand navy (#1E3A8A), data visualization focused',
      inspirations: 'Apple annual reports, Tesla investor materials, premium corporate documents',
      finalMessaging: '"A year of growth", "Building the future, together"',
      resourceLinks: 'Financial data: sheets.google.com/yearend, CEO letter: docs.google.com/letter',
      timeline: 'Custom Project (7 days) - URGENT: Board meeting deadline',
      additionalNotes: 'Print-ready PDF required. Interactive digital version for website.',
    },
    deliverables: [
      { name: 'Full Annual Report', type: 'design', status: 'in_progress', count: 60, bonusCount: 10 },
      { name: 'Executive Summary', type: 'design', status: 'in_progress', count: 4, bonusCount: 1 },
      { name: 'Data Infographics', type: 'design', status: 'draft', count: 12, bonusCount: 3 },
    ],
  },

  // 19. In Progress - Due Dec 20
  {
    name: 'FoodieBox - Subscription Rebrand',
    description: 'Brand refresh for meal kit delivery',
    status: 'in_progress',
    priority: 'medium',
    projectType: 'other',
    daysOffset: 11, // Due Dec 20
    briefing: {
      projectOverview: 'Refresh brand identity for FoodieBox meal kit subscription service. Modernize while emphasizing quality ingredients.',
      targetAudience: 'Busy professionals, home cooks, health-conscious consumers, ages 28-50',
      goals: 'Increase subscriber retention, attract new demographics, justify premium pricing',
      deliverables: 'Updated logo, Packaging redesign, Website refresh, Marketing templates, Recipe card system',
      styleNotes: 'Fresh and appetizing, warm friendly colors, ingredient photography style, sustainable packaging',
      inspirations: 'HelloFresh, Blue Apron premium tier, gourmet food brands',
      finalMessaging: '"Chef-quality at home", "Fresh, fast, delicious"',
      resourceLinks: 'Current brand: figma.com/foodiebox, Customer research: notion.so/research',
      timeline: 'Custom Project (15 days) - Full rebrand',
      additionalNotes: 'Eco-friendly packaging requirement. Dietary preference iconography needed.',
    },
    deliverables: [
      { name: 'Logo & Identity Refresh', type: 'design', status: 'in_progress', count: 6, bonusCount: 2 },
      { name: 'Packaging System', type: 'design', status: 'in_progress', count: 10, bonusCount: 3 },
      { name: 'Website Page Updates', type: 'design', status: 'draft', count: 8, bonusCount: 2 },
      { name: 'Recipe Card Templates', type: 'design', status: 'draft', count: 5, bonusCount: 1 },
    ],
  },

  // 20. In Progress - Due Dec 23
  {
    name: 'NewYear Fitness - January Campaign',
    description: 'New Year fitness promotion campaign',
    status: 'in_progress',
    priority: 'high',
    projectType: 'marketing-campaign',
    daysOffset: 14, // Due Dec 23
    briefing: {
      projectOverview: 'Create comprehensive New Year campaign for NewYear Fitness gym chain. Capitalize on resolution season for membership growth.',
      targetAudience: 'Resolution makers, fitness beginners, returning gym-goers, ages 25-50',
      goals: 'Acquire 5000 new members in January, 40% membership upgrade rate, reduce Jan churn',
      deliverables: 'Full campaign kit: social, email, in-gym signage, website banners, promotional materials',
      styleNotes: 'Motivating and energetic, sunrise colors (#F97316, #FBBF24), transformation imagery, inclusive',
      inspirations: 'Equinox campaigns, Nike Training, aspirational fitness brands',
      finalMessaging: '"New Year, New You", "Your transformation starts here", "No excuses in 2026"',
      resourceLinks: 'Member testimonials: drive.google.com/stories, Gym photos: dropbox.com/facilities',
      timeline: 'Marketing Campaign (14 days) - January launch prep',
      additionalNotes: 'Early bird pricing tier graphics. Virtual class promotion included.',
    },
    deliverables: [
      { name: 'Social Media Campaign', type: 'design', status: 'in_progress', count: 25, bonusCount: 5 },
      { name: 'Email Series', type: 'design', status: 'draft', count: 8, bonusCount: 2 },
      { name: 'In-Gym Signage', type: 'design', status: 'draft', count: 12, bonusCount: 3 },
      { name: 'Website & Digital Ads', type: 'design', status: 'draft', count: 15, bonusCount: 4 },
    ],
  },
];

export function DeveloperTools() {
  const { isInMiro, miro } = useMiro();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
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

      if (authUser) {
        addProgress(`✓ Logged in as: ${authUser.name || authUser.email} (${authUser.role || 'unknown role'})`);

        if (authUser.role !== 'admin') {
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

      // Invalidate React Query cache to refresh the UI
      addProgress('Refreshing UI...');
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
      addProgress('✓ UI refreshed');

      addProgress('');
      addProgress('🧹 SYSTEM CLEARED!');
      addProgress('✅ The projects list is now empty.');

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
      // Step 1: Check authentication from context
      addProgress('Checking authentication...');

      if (!authUser) {
        throw new Error('Not authenticated. Please log in first.');
      }

      addProgress(`✓ Logged in as: ${authUser.name || authUser.email} (${authUser.role})`);

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

      // Step 4: Get current board ID and initialize Miro timeline if in Miro
      let currentBoardId: string | null = null;
      if (isInMiro && miro) {
        try {
          const boardInfo = await miro.board.getInfo();
          currentBoardId = boardInfo.id;
          addProgress(`✓ Current board: ${currentBoardId}`);
        } catch (err) {
          addProgress('⚠ Could not get board ID');
        }

        addProgress('Initializing Master Timeline...');
        await miroTimelineService.initializeTimeline();
        addProgress('✓ Master Timeline ready');
      }

      // Step 5: Create 20 test projects with full data
      addProgress('');
      addProgress('🚀 Creating 20 test projects (15 completed + 5 active)...');
      addProgress('');

      let successCount = 0;
      let deliverableCount = 0;

      for (let i = 0; i < TEST_PROJECTS.length; i++) {
        const testData = TEST_PROJECTS[i];
        if (!testData) continue;

        // Calculate dates based on whether project has fixed dates or offset
        const projectTypeConfig = PROJECT_TYPES.find(pt => pt.value === testData.projectType);
        let projectStartDate: string;
        let projectDueDate: string;

        if (testData.startDate && testData.dueDate) {
          // Use fixed dates for completed projects
          projectStartDate = testData.startDate;
          projectDueDate = testData.dueDate;
        } else {
          // Calculate dates based on offset for active projects
          const daysToAdd = testData.daysOffset ?? 7;
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + daysToAdd);

          const startDate = new Date();
          startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 5));

          projectStartDate = startDate.toISOString().split('T')[0]!;
          projectDueDate = dueDate.toISOString().split('T')[0]!;
        }

        addProgress(`[${i + 1}/20] Creating: ${testData.name}`);

        try {
          // Build complete briefing with projectType
          const fullBriefing: ProjectBriefing = {
            ...testData.briefing,
            projectType: testData.projectType,
            timeline: `${projectTypeConfig?.label || testData.projectType} (${projectTypeConfig?.days || 15} days) - ${testData.briefing.timeline || ''}`,
          };

          // Create project input - include miroBoardId if we're in Miro
          const projectInput: CreateProjectInput = {
            name: testData.name,
            description: testData.description,
            status: testData.status,
            priority: testData.priority,
            clientId,
            designerIds: designerIds.length > 0 ? [designerIds[i % designerIds.length]!] : [],
            dueDate: projectDueDate,
            startDate: projectStartDate,
            briefing: fullBriefing,
            dueDateApproved: true,
            googleDriveUrl: `https://drive.google.com/drive/folders/${testData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            // IMPORTANT: Associate with current board so projects appear in the list
            miroBoardId: currentBoardId,
          };

          // Create project in database
          const project = await projectService.createProject(projectInput);
          addProgress(`  ✓ Project created: ${project.id}`);

          // Update wasReviewed, wasApproved, and completedAt if needed
          if (testData.wasReviewed || testData.wasApproved || testData.completedAt) {
            const updateData: Record<string, unknown> = {};
            if (testData.wasReviewed) updateData.wasReviewed = true;
            if (testData.wasApproved) updateData.wasApproved = true;
            if (testData.completedAt) updateData.completedAt = testData.completedAt;

            await projectService.updateProject(project.id, updateData);
            addProgress(`  ✓ Status flags updated${testData.completedAt ? ' (completed)' : ''}`);
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

      // Invalidate React Query cache to refresh the projects list
      addProgress('Refreshing projects list...');
      await queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      addProgress('✓ Projects list refreshed');

      // Summary
      addProgress('═══════════════════════════════════════');
      addProgress('');
      addProgress(`✅ SUCCESS! Created ${successCount}/20 projects`);
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
      addProgress('📅 Projects span January - December 2025');
      addProgress('   • 15 completed projects (Jan-Dec)');
      addProgress('   • 5 active projects (due Dec 2025)');
      addProgress('');
      addProgress('✅ Projects should now appear in the list!');
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
        <h3 className={styles.sectionTitle}>🚀 Create 20 Test Projects</h3>
        <p className={styles.sectionDescription}>
          Create realistic test projects spanning the entire year of 2025 with full briefing data,
          deliverables, and assets. Perfect for testing reports and analytics.
        </p>

        <div className={styles.featureList}>
          <div className={styles.featureItem}>✓ 20 realistic design studio projects</div>
          <div className={styles.featureItem}>✓ 15 completed projects (Jan-Dec 2025)</div>
          <div className={styles.featureItem}>✓ 5 active projects (due December 2025)</div>
          <div className={styles.featureItem}>✓ Complete briefing, deliverables & assets</div>
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
          {isCreating ? 'Creating Projects...' : '✨ Create 20 Test Projects'}
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
