# Color Migration Guide

This guide explains how to use the automated color migration script to transition hard-coded color values to design tokens across the Brianna Dawes Miro App codebase.

## Overview

The color migration script scans TypeScript, TSX, and CSS files for hard-coded hex color values and replaces them with CSS variable tokens. The script operates in a **non-destructive dry-run mode by default**, allowing you to review changes before applying them.

## Prerequisites

Ensure you have the required dependencies installed:

```bash
npm install
```

The script requires `tsx` which has been added to `devDependencies` in `package.json`.

## Quick Start

### 1. Preview Changes (Dry Run)

See what colors would be migrated without making any changes:

```bash
npm run migrate:colors
```

This command:
- Scans the `src/` directory by default
- Reports all found hex colors
- Shows which colors can be mapped to tokens
- Lists unmapped colors that need new token definitions
- Does NOT modify any files

### 2. Apply Changes

After reviewing the dry run results, apply the changes:

```bash
npm run migrate:colors:apply
```

This command:
- Performs the same scan as dry run
- Writes all replacements to files
- Creates backups automatically (recommended - see below)

## Command Options

### Specify a Target Directory

Migrate a specific directory instead of the default `src/`:

```bash
# Dry run on a specific directory
npm run migrate:colors -- ./src/features

# Apply changes to a specific directory
npm run migrate:colors:apply -- ./src/features/boards
```

### Direct Script Execution with tsx

For more control, run the script directly:

```bash
# Dry run
npx tsx scripts/migrateColors.ts

# Apply changes
npx tsx scripts/migrateColors.ts --apply

# Dry run on specific directory
npx tsx scripts/migrateColors.ts ./src/features/boards

# Apply to specific directory
npx tsx scripts/migrateColors.ts ./src/features/boards --apply
```

## Safety First: Creating Backups

Before applying changes, create a git commit or backup:

```bash
# Option 1: Git approach (recommended)
git add -A
git commit -m "backup: before color migration"

# Option 2: Manual backup
cp -r src src.backup

# After successful migration, delete backup
rm -rf src.backup
```

## Understanding the Output

### Dry Run Example Output

```
🎨 Color Migration Script
Mode: DRY RUN (use --apply to write changes)
Target: ./src

📊 Migration Summary:
Files processed: 24
Total replacements: 47
Unmapped colors: 3

⚠️  Unmapped Colors (need token definitions):
  #FF1493
  #00CED1
  #FFEAA7

📝 File Details:
  ✓ ./src/features/boards/components/Board.tsx: 5 replacements
  ✓ ./src/shared/ui/Button.module.css: 8 replacements
    ⚠️  Unmapped: #FF1493, #00CED1
  ✓ ./src/features/projects/pages/ProjectDetail.tsx: 12 replacements

💡 This was a dry run. Use --apply to write changes.
```

### Key Sections Explained

- **Files processed**: Number of files with color occurrences
- **Total replacements**: Total number of hex colors found
- **Unmapped colors**: Colors that don't have token definitions yet
- **File Details**: Per-file breakdown of replacements and unmapped colors

## Adding New Color Mappings

When you encounter unmapped colors during migration, add them to the color map.

### Step 1: Edit the Script

Open `/scripts/migrateColors.ts` and find the `COLOR_MAP` constant:

```typescript
const COLOR_MAP: Record<string, string> = {
  // Primary colors
  '#050038': 'var(--color-primary)',
  // ... existing mappings ...

  // Add new mappings here
  '#FF1493': 'var(--color-custom-pink)',
  '#00CED1': 'var(--color-custom-teal)',
};
```

### Step 2: Define the Token

Add the CSS variable to your design tokens file. This is typically in:

```
src/shared/ui/tokens.css
src/styles/tokens.css
src/shared/styles/design-system.css
```

Example:

```css
:root {
  /* Existing tokens */
  --color-primary: #050038;
  --color-accent: #2563EB;

  /* New tokens */
  --color-custom-pink: #FF1493;
  --color-custom-teal: #00CED1;
}
```

### Step 3: Test the Migration

Run the script again to verify the new mappings:

```bash
npm run migrate:colors
```

## Handling Unmapped Colors

If you encounter colors that you intentionally want to keep as hard-coded values:

### Option 1: Add Placeholder Tokens

Create placeholder CSS variables even if you haven't finalized the token:

```typescript
// In scripts/migrateColors.ts
'#FF1493': 'var(--color-placeholder-1)',  // TODO: Define theme
```

```css
/* In design tokens */
--color-placeholder-1: #FF1493; /* TODO: Rename and define purpose */
```

### Option 2: Exclude from Migration

If a color should not be migrated, you have these options:

1. **Don't add it to COLOR_MAP** - The script will report it as unmapped but skip it
2. **Comment it in your code** - Add a comment indicating it's intentional:
   ```typescript
   // Intentional hard-coded color - Brand-specific gradient start
   background: '#FF1493';
   ```

### Option 3: Create a Specialized Token

For context-specific colors, create descriptive tokens:

```typescript
// In COLOR_MAP
'#FF1493': 'var(--color-error-highlight)',
'#00CED1': 'var(--color-info-highlight)',
```

## Supported File Types

The script processes these file types:

- `.ts` - TypeScript files
- `.tsx` - React component files
- `.css` - CSS stylesheets

## Color Map Reference

### Current Mappings

```typescript
// Primary colors
'#050038' -> 'var(--color-primary)'
'#030025' -> 'var(--color-primary-dark)'

// Accent
'#2563EB' -> 'var(--color-accent)'

// Status colors
'#10B981' -> 'var(--color-success)'
'#059669' -> 'var(--color-success-dark)'
'#F59E0B' -> 'var(--color-warning)'
'#D97706' -> 'var(--color-warning-dark)'
'#EF4444' -> 'var(--color-error)'

// Priority colors
'#F97316' -> 'var(--priority-high)'
'#3B82F6' -> 'var(--priority-medium)'

// Purple
'#8B5CF6' -> 'var(--color-purple-500)'
'#7C3AED' -> 'var(--color-purple-600)'
'#6D28D9' -> 'var(--color-purple-700)'

// Brand gold
'#D4A574' -> 'var(--color-brand-gold)'

// Text colors
'#FFFFFF' -> 'var(--color-text-inverse)'
'#000000' -> 'var(--color-primary)'
'#6B7280' -> 'var(--color-text-secondary)'
```

## Troubleshooting

### Script Won't Run

**Error: `command not found: tsx`**

Solution: Install dependencies
```bash
npm install
```

### File Permissions Error

**Error: `EACCES: permission denied`**

Solution: Ensure the scripts directory has correct permissions
```bash
chmod +x scripts/migrateColors.ts
```

### Wrong Directory Scanned

**Issue: Only migrated one file, expected more**

Solution: Verify the target directory path
```bash
# Correct - absolute or relative to current directory
npm run migrate:colors -- ./src

# Verify which directory is being scanned
pwd  # Shows current working directory
ls src/  # Confirms src directory exists
```

### Colors Not Being Replaced

**Issue: Hex colors appear unchanged after --apply**

Check these possibilities:
1. Color is not in COLOR_MAP - add the mapping
2. Color format is non-standard (e.g., shorthand `#FFF` vs `#FFFFFF`)
3. Color has no word boundary - script skips inline formats

Solution: Run dry run first to see what's detected
```bash
npm run migrate:colors
```

## Workflow Example

### Complete Migration Flow

```bash
# 1. Create a backup commit
git add -A
git commit -m "backup: before color migration"

# 2. Preview what will change
npm run migrate:colors

# 3. Check output for unmapped colors
# (Add mappings if needed)

# 4. Apply changes
npm run migrate:colors:apply

# 5. Verify changes in git
git diff

# 6. Run tests to ensure nothing broke
npm run typecheck
npm run lint
npm run build

# 7. Commit the changes
git add -A
git commit -m "refactor: migrate hard-coded colors to design tokens"
```

## Design Tokens Architecture

The project follows a centralized design tokens approach:

### Token Organization

```css
/* Semantic tokens by purpose */
:root {
  /* Color primitives */
  --color-primary: #050038;
  --color-accent: #2563EB;

  /* Semantic tokens */
  --color-text-primary: var(--color-primary);
  --color-text-inverse: #FFFFFF;
  --color-border-default: #E5E7EB;

  /* Component tokens */
  --button-bg: var(--color-primary);
  --button-text: var(--color-text-inverse);
}
```

### Token Naming Convention

- `--color-[semantic]-[variant]`
  - Examples: `--color-primary`, `--color-success-dark`
- `--[component]-[property]`
  - Examples: `--button-bg`, `--card-border`
- `--[context]-[state]`
  - Examples: `--priority-high`, `--status-in-progress`

## Performance Considerations

The migration script:

- **Reads files once**: Each file is read once and processed
- **Skips directories**: Automatically excludes `node_modules`, `dist`, `.git`, `.claude`
- **Batch processing**: Processes multiple files in parallel via directory walk

For large codebases (10,000+ files), the script may take 30-60 seconds.

## Post-Migration Cleanup

After successfully applying color migrations:

1. **Remove old color definitions**
   - Search codebase for any remaining hard-coded color patterns
   - Check for duplicate or deprecated token definitions

2. **Update documentation**
   - Ensure design tokens documentation is current
   - Add new tokens to design system guide if created

3. **Review token usage**
   - Verify tokens are being used consistently
   - Check for opportunities to consolidate similar tokens

## Questions or Issues?

Refer to the main project documentation:
- **CLAUDE.md** - Project overview and architecture
- **src/shared/ui/** - Design system components
- **Design Tokens** - See `docs/design-tokens.md`

## Related Commands

```bash
# Format code (runs Prettier)
npm run format

# Check types
npm run typecheck

# Run linter
npm run lint

# Fix lint issues
npm run lint:fix

# Build for production
npm run build
```
