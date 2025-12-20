# Icon System Documentation

## Overview

This document describes all available icons in the Brianna Dawes Studio Miro App icon system. All icons are stroke-based SVGs following the Feather icon style, with a default viewBox of 24x24.

## Icon Library

### User & Role Icons

#### UserIcon
- **Import**: `import { UserIcon } from '@shared/ui/Icons';`
- **Usage**: Single user representation, client context
- **Aliases**: `ClientIcon`
- **Size Guidelines**:
  - Buttons: 16px
  - List items: 18px
  - Headers: 24px
- **Color**: Use `currentColor` (inherits from parent)

#### UsersIcon
- **Import**: `import { UsersIcon } from '@shared/ui/Icons';`
- **Usage**: Multiple users, team context, collaboration
- **Aliases**: `TeamIcon`
- **Size Guidelines**: Same as UserIcon
- **Color**: Use `currentColor`

### Navigation & Layout Icons

#### GridIcon / BoardIcon / BoardsIcon
- **Import**: `import { GridIcon, BoardIcon, BoardsIcon } from '@shared/ui/Icons';`
- **Usage**: Board views, canvas, grid layouts
- **Size Guidelines**: 16-24px
- **Color**: Use `currentColor`

#### DashboardIcon
- **Import**: `import { DashboardIcon } from '@shared/ui/Icons';`
- **Usage**: Dashboard/overview navigation, analytics summaries
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### ChartIcon
- **Import**: `import { ChartIcon } from '@shared/ui/Icons';`
- **Usage**: Analytics, reporting, data visualization
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

### File & Document Icons

#### FileIcon / DocumentIcon
- **Import**: `import { FileIcon, DocumentIcon } from '@shared/ui/Icons';`
- **Usage**: Generic files, documents
- **Difference**: DocumentIcon includes text lines showing document content
- **Size Guidelines**: 16-20px
- **Color**: Use `currentColor`

#### PDFIcon
- **Import**: `import { PDFIcon } from '@shared/ui/Icons';`
- **Usage**: PDF file identification
- **Size Guidelines**: 20-24px
- **Color**: Use `currentColor`

#### FolderIcon
- **Import**: `import { FolderIcon } from '@shared/ui/Icons';`
- **Usage**: Folders, directories, collections
- **Size Guidelines**: 16-24px
- **Color**: Use `currentColor`

#### ImageIcon
- **Import**: `import { ImageIcon } from '@shared/ui/Icons';`
- **Usage**: Image/photo management, media galleries
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### VideoIcon
- **Import**: `import { VideoIcon } from '@shared/ui/Icons';`
- **Usage**: Video content, multimedia
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

### Project Type Icons

#### SocialPostIcon
- **Import**: `import { SocialPostIcon } from '@shared/ui/Icons';`
- **Usage**: Social media deliverables (Instagram, LinkedIn, Twitter posts)
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`
- **Example**:
```tsx
<SocialPostIcon size={20} />
```

#### EmailIcon
- **Import**: `import { EmailIcon } from '@shared/ui/Icons';`
- **Usage**: Email templates, email marketing deliverables
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### HeroIcon
- **Import**: `import { HeroIcon } from '@shared/ui/Icons';`
- **Usage**: Hero images, banner images
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### AdIcon
- **Import**: `import { AdIcon } from '@shared/ui/Icons';`
- **Usage**: Advertisement deliverables, ad campaigns
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### PrintIcon
- **Import**: `import { PrintIcon } from '@shared/ui/Icons';`
- **Usage**: Print deliverables, printed materials
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

### Status Icons

#### CheckCircleIcon
- **Import**: `import { CheckCircleIcon } from '@shared/ui/Icons';`
- **Usage**: Completed, approved, or success status
- **Size Guidelines**: 18-24px
- **Color**: Success green (#10B981) recommended
- **Example**:
```tsx
<CheckCircleIcon size={20} style={{ color: '#10B981' }} />
```

#### WarningCircleIcon
- **Import**: `import { WarningCircleIcon } from '@shared/ui/Icons';`
- **Usage**: Warning, pending review status
- **Size Guidelines**: 18-24px
- **Color**: Warning amber (#F59E0B) recommended
- **Example**:
```tsx
<WarningCircleIcon size={20} style={{ color: '#F59E0B' }} />
```

#### ErrorCircleIcon
- **Import**: `import { ErrorCircleIcon } from '@shared/ui/Icons';`
- **Usage**: Error, failed, or rejected status
- **Size Guidelines**: 18-24px
- **Color**: Error red (#EF4444) recommended

#### InfoCircleIcon
- **Import**: `import { InfoCircleIcon } from '@shared/ui/Icons';`
- **Usage**: Information, help text, neutral status
- **Size Guidelines**: 18-24px
- **Color**: Info blue (#2563EB) recommended

### Action Icons

#### UploadIcon
- **Import**: `import { UploadIcon } from '@shared/ui/Icons';`
- **Usage**: Upload files, upload action
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### DownloadIcon
- **Import**: `import { DownloadIcon } from '@shared/ui/Icons';`
- **Usage**: Download files, export action
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### FilterIcon
- **Import**: `import { FilterIcon } from '@shared/ui/Icons';`
- **Usage**: Filter data, refine results
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### SortIcon
- **Import**: `import { SortIcon } from '@shared/ui/Icons';`
- **Usage**: Sort data, change order
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### AttachIcon
- **Import**: `import { AttachIcon } from '@shared/ui/Icons';`
- **Usage**: Attachments, linked files
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### SearchIcon
- **Import**: `import { SearchIcon } from '@shared/ui/Icons';`
- **Usage**: Search functionality
- **Size Guidelines**: 16-24px
- **Color**: Use `currentColor`

#### PlusIcon
- **Import**: `import { PlusIcon } from '@shared/ui/Icons';`
- **Usage**: Add, create, expand actions
- **Size Guidelines**: 16-24px
- **Color**: Use `currentColor`

#### EditIcon
- **Import**: `import { EditIcon } from '@shared/ui/Icons';`
- **Usage**: Edit, modify content
- **Size Guidelines**: 16-24px
- **Color**: Use `currentColor`

#### TrashIcon
- **Import**: `import { TrashIcon } from '@shared/ui/Icons';`
- **Usage**: Delete, remove action
- **Size Guidelines**: 16-24px
- **Color**: Error red recommended

#### ExternalLinkIcon
- **Import**: `import { ExternalLinkIcon } from '@shared/ui/Icons';`
- **Usage**: Links to external resources
- **Size Guidelines**: 14-18px
- **Color**: Use `currentColor`

### Content & Communication Icons

#### MessageIcon
- **Import**: `import { MessageIcon } from '@shared/ui/Icons';`
- **Usage**: Comments, messages, communication
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### BellIcon
- **Import**: `import { BellIcon } from '@shared/ui/Icons';`
- **Usage**: Notifications, alerts
- **Size Guidelines**: 18-24px
- **Color**: Warning amber for unread
- **Example**:
```tsx
<BellIcon size={20} style={{ color: '#F59E0B' }} />
```

#### CalendarIcon
- **Import**: `import { CalendarIcon } from '@shared/ui/Icons';`
- **Usage**: Dates, scheduling, timelines
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### ClockIcon
- **Import**: `import { ClockIcon } from '@shared/ui/Icons';`
- **Usage**: Time, duration, deadlines
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

### Utility Icons

#### RefreshIcon / SyncIcon
- **Import**: `import { RefreshIcon, SyncIcon } from '@shared/ui/Icons';`
- **Usage**: Refresh data, synchronize, reload
- **Size Guidelines**: 16-24px
- **Color**: Use `currentColor`

#### CheckIcon
- **Import**: `import { CheckIcon } from '@shared/ui/Icons';`
- **Usage**: Simple checkmark, inline validation
- **Size Guidelines**: 14-18px
- **Color**: Use `currentColor`

#### CloseIcon / X
- **Import**: `import { CloseIcon } from '@shared/ui/Icons';`
- **Usage**: Close dialogs, cancel actions, remove
- **Size Guidelines**: 16-20px
- **Color**: Use `currentColor`

#### ChevronDownIcon
- **Import**: `import { ChevronDownIcon } from '@shared/ui/Icons';`
- **Usage**: Expandable/collapsible content, dropdowns
- **Size Guidelines**: 16-20px
- **Color**: Use `currentColor`
- **Special Props**:
```tsx
// Rotates automatically based on isOpen prop
<ChevronDownIcon size={18} isOpen={isExpanded} />
```

#### ArrowLeftIcon / BackIcon
- **Import**: `import { ArrowLeftIcon, BackIcon } from '@shared/ui/Icons';`
- **Usage**: Navigate back, previous
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

### Role & Admin Icons

#### ShieldIcon / AdminIcon
- **Import**: `import { ShieldIcon, AdminIcon } from '@shared/ui/Icons';`
- **Usage**: Admin role, security, protection
- **Aliases**: `AdminIcon`
- **Size Guidelines**: 18-24px
- **Color**: Primary brand color (#050038) for admin context

#### BriefcaseIcon / DesignerIcon
- **Import**: `import { BriefcaseIcon, DesignerIcon } from '@shared/ui/Icons';`
- **Usage**: Designer role, projects, work
- **Aliases**: `DesignerIcon`
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

### Special Purpose Icons

#### StarIcon
- **Import**: `import { StarIcon } from '@shared/ui/Icons';`
- **Usage**: Favorites, ratings, importance
- **Size Guidelines**: 16-24px
- **Color**: Warning amber recommended
- **Special Props**:
```tsx
// Filled star for selected/active state
<StarIcon size={20} filled={true} />
// Outline star for unselected state
<StarIcon size={20} filled={false} />
```

#### PackageIcon
- **Import**: `import { PackageIcon } from '@shared/ui/Icons';`
- **Usage**: Packages, deliverables, items
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### TagIcon
- **Import**: `import { TagIcon } from '@shared/ui/Icons';`
- **Usage**: Tags, labels, categorization
- **Size Guidelines**: 16-20px
- **Color**: Use `currentColor`

#### ArchiveIcon
- **Import**: `import { ArchiveIcon } from '@shared/ui/Icons';`
- **Usage**: Archive, store, inactive items
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### CodeIcon / DeveloperIcon
- **Import**: `import { CodeIcon, DeveloperIcon } from '@shared/ui/Icons';`
- **Usage**: Developer tools, technical content
- **Aliases**: `DeveloperIcon`
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### EyeIcon
- **Import**: `import { EyeIcon } from '@shared/ui/Icons';`
- **Usage**: View, visibility, preview
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### SettingsIcon
- **Import**: `import { SettingsIcon } from '@shared/ui/Icons';`
- **Usage**: Settings, preferences, configuration
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

#### DriveIcon
- **Import**: `import { DriveIcon } from '@shared/ui/Icons';`
- **Usage**: Google Drive integration
- **Note**: This is a filled icon (not stroke-based)
- **Size Guidelines**: 18-24px
- **Color**: Use `currentColor`

## Usage Patterns

### Basic Usage
```tsx
import { UserIcon, UploadIcon, CheckCircleIcon } from '@shared/ui/Icons';

export function MyComponent() {
  return (
    <div>
      <UserIcon size={20} />
      <UploadIcon size={18} />
      <CheckCircleIcon size={24} style={{ color: '#10B981' }} />
    </div>
  );
}
```

### With Custom Colors
```tsx
import { ErrorCircleIcon } from '@shared/ui/Icons';

export function ErrorStatus() {
  return (
    <ErrorCircleIcon
      size={24}
      style={{ color: '#EF4444' }}
      className="error-icon"
    />
  );
}
```

### With Conditional Styling
```tsx
import { StarIcon } from '@shared/ui/Icons';

export function Favorite({ isFavorite }) {
  return (
    <StarIcon
      size={20}
      filled={isFavorite}
      style={{ color: isFavorite ? '#F59E0B' : '#D1D5DB' }}
    />
  );
}
```

## Size Guidelines by Context

| Context | Recommended Size | Icons |
|---------|------------------|-------|
| Inline text | 14-16px | CheckIcon, ExternalLinkIcon |
| Buttons | 16-18px | PlusIcon, TrashIcon, EditIcon |
| List items | 18-20px | UserIcon, FileIcon, UploadIcon |
| Headers/Cards | 20-24px | DashboardIcon, ChartIcon, CheckCircleIcon |
| Large displays | 24-32px | Any icon in prominent positions |

## Color Recommendations

### By Status
- **Success/Approved**: Use #10B981 (CheckCircleIcon)
- **Warning/Pending**: Use #F59E0B (WarningCircleIcon, BellIcon)
- **Error/Failed**: Use #EF4444 (ErrorCircleIcon, TrashIcon)
- **Info/Neutral**: Use #2563EB (InfoCircleIcon)
- **Default**: Use `currentColor` for flexibility

### By Role
- **Admin**: Use primary color #050038 with ShieldIcon/AdminIcon
- **Designer**: Use secondary color with BriefcaseIcon/DesignerIcon
- **Client**: Use neutral color with UserIcon/ClientIcon

## Implementation Notes

### All icons use `IconBase` component
- Consistent stroke width of 2
- Feather-style SVG design (stroke-based, not filled)
- Support for size, className, and style props
- Proper aria-hidden attribute for accessibility

### Custom Icon Props
```typescript
interface IconProps {
  size?: number;           // Default: 16
  className?: string;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean; // Default: true
}
```

### Accessibility
- All icons have `aria-hidden="true"` by default
- Use alongside text labels in buttons and interactive elements
- Don't rely on icons alone for critical information

## Future Considerations

These icons will replace emoji usage in:
- `/src/features/boards/services/constants/colors.constants.ts`
- `/src/features/admin/components/tabs/OverviewTab.tsx`
- AdminDashboard.tsx and other component files

See the icon showcase HTML file for an interactive preview of all icons.
