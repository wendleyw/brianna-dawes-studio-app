import * as fs from 'fs';
import * as path from 'path';

// Color mapping: hex -> token
const COLOR_MAP: Record<string, string> = {
  // Primary colors
  '#050038': 'var(--color-primary)',
  '#030025': 'var(--color-primary-dark)',
  '#030024': 'var(--color-primary-dark)',
  '#0A0050': 'var(--color-primary)',
  '#1A1A5C': 'var(--color-primary-light)',
  '#000000': 'var(--color-primary)',

  // Accent
  '#2563EB': 'var(--color-accent)',
  '#3B82F6': 'var(--color-accent-light)',
  '#1D4ED8': 'var(--color-accent-dark)',

  // Status colors - Success
  '#10B981': 'var(--color-success)',
  '#22C55E': 'var(--color-success)',
  '#16A34A': 'var(--color-success)',
  '#059669': 'var(--color-success-dark)',
  '#047857': 'var(--color-success-dark)',
  '#065F46': 'var(--color-success-dark)',
  '#D1FAE5': 'var(--color-success-light)',
  '#DCFCE7': 'var(--color-success-light)',
  '#BBF7D0': 'var(--color-success-light)',
  '#A7F3D0': 'var(--color-success-light)',
  '#ECFDF5': 'var(--color-success-light)',
  '#F0FDF4': 'var(--color-success-light)',
  '#86EFAC': 'var(--color-success-light)',

  // Status colors - Warning
  '#F59E0B': 'var(--color-warning)',
  '#FBBF24': 'var(--color-warning)',
  '#EAB308': 'var(--color-warning)',
  '#FFC107': 'var(--color-warning)',
  '#D97706': 'var(--color-warning-dark)',
  '#92400E': 'var(--color-warning-dark)',
  '#78350F': 'var(--color-warning-dark)',
  '#B45309': 'var(--color-warning-dark)',
  '#854D0E': 'var(--color-warning-dark)',
  '#B8860B': 'var(--color-warning-dark)',
  '#664D03': 'var(--color-warning-dark)',
  '#856404': 'var(--color-warning-dark)',
  '#FFB300': 'var(--color-warning)',
  '#FEF3C7': 'var(--color-warning-light)',
  '#FFFBEB': 'var(--color-warning-light)',
  '#FDE68A': 'var(--color-warning-light)',
  '#FEFCE8': 'var(--color-warning-light)',
  '#FCD34D': 'var(--color-warning-light)',
  '#FFF3CD': 'var(--color-warning-light)',
  '#FFF8E1': 'var(--color-warning-light)',
  '#FFE082': 'var(--color-warning-light)',

  // Status colors - Error
  '#EF4444': 'var(--color-error)',
  '#DC2626': 'var(--color-error)',
  '#B91C1C': 'var(--color-error)',
  '#991B1B': 'var(--color-error-dark)',
  '#9A3412': 'var(--color-error-dark)',
  '#FEE2E2': 'var(--color-error-light)',
  '#FEF2F2': 'var(--color-error-light)',
  '#FECACA': 'var(--color-error-light)',

  // Status colors - Info
  '#6366F1': 'var(--color-info)',
  '#4F46E5': 'var(--color-info)',
  '#1E40AF': 'var(--color-info-dark)',
  '#1E3A8A': 'var(--color-info-dark)',
  '#DBEAFE': 'var(--color-info-light)',
  '#EFF6FF': 'var(--color-info-light)',
  '#BFDBFE': 'var(--color-info-light)',
  '#93C5FD': 'var(--color-info-light)',
  '#E0E7FF': 'var(--color-info-light)',
  '#C7D2FE': 'var(--color-info-light)',

  // Cyan/Teal
  '#0EA5E9': 'var(--color-accent)',
  '#0891B2': 'var(--color-accent)',
  '#0284C7': 'var(--color-accent)',
  '#14B8A6': 'var(--color-success)',
  '#0C4A6E': 'var(--color-accent-dark)',
  '#F0F9FF': 'var(--color-info-light)',
  '#CFFAFE': 'var(--color-info-light)',

  // Purple (changes requested)
  '#8B5CF6': 'var(--color-purple-500)',
  '#A855F7': 'var(--color-purple-500)',
  '#7C3AED': 'var(--color-purple-600)',
  '#6D28D9': 'var(--color-purple-700)',
  '#5B21B6': 'var(--color-purple-700)',
  '#6B21A8': 'var(--color-purple-700)',
  '#EDE9FE': 'var(--color-purple-500)',
  '#F3E8FF': 'var(--color-purple-500)',
  '#F5F3FF': 'var(--color-purple-500)',
  '#FDF4FF': 'var(--color-purple-500)',

  // Pink
  '#EC4899': 'var(--priority-high)',
  '#DB2777': 'var(--priority-high)',
  '#FCE7F3': 'var(--color-error-light)',

  // Other colors
  '#84CC16': 'var(--color-success)',
  '#ECFCCB': 'var(--color-success-light)',
  '#3F6212': 'var(--color-success-dark)',
  '#E91E63': 'var(--priority-high)',
  '#9C27B0': 'var(--color-purple-600)',
  '#673AB7': 'var(--color-purple-700)',
  '#3F51B5': 'var(--color-info)',
  '#2196F3': 'var(--color-accent-light)',
  '#00BCD4': 'var(--color-accent)',
  '#009688': 'var(--color-success)',
  '#4CAF50': 'var(--color-success)',
  '#FF9800': 'var(--color-warning)',
  '#FFEDD5': 'var(--color-warning-light)',
  '#EA580C': 'var(--priority-high)',

  // Priority colors
  '#F97316': 'var(--priority-high)',

  // Brand gold
  '#D4A574': 'var(--color-brand-gold)',

  // Grays
  '#F9FAFB': 'var(--color-gray-50)',
  '#F8F9FA': 'var(--color-gray-50)',
  '#F9F9F9': 'var(--color-gray-50)',
  '#FAFAFA': 'var(--color-gray-50)',
  '#F3F4F6': 'var(--color-gray-100)',
  '#F5F5F5': 'var(--color-gray-100)',
  '#F0F0F0': 'var(--color-gray-100)',
  '#F0F0FF': 'var(--color-gray-100)',
  '#F8F8FF': 'var(--color-gray-100)',
  '#F0F4FF': 'var(--color-gray-100)',
  '#E8F4F8': 'var(--color-gray-100)',
  '#F8FAFC': 'var(--color-gray-50)',
  '#E5E7EB': 'var(--color-gray-200)',
  '#E0E0E0': 'var(--color-gray-200)',
  '#D1D5DB': 'var(--color-gray-300)',
  '#CCC': 'var(--color-gray-300)',
  '#9CA3AF': 'var(--color-gray-400)',
  '#888': 'var(--color-gray-400)',
  '#888888': 'var(--color-gray-400)',
  '#6B7280': 'var(--color-gray-500)',
  '#666': 'var(--color-gray-500)',
  '#666666': 'var(--color-gray-500)',
  '#607D8B': 'var(--color-gray-500)',
  '#4B5563': 'var(--color-gray-600)',
  '#374151': 'var(--color-gray-700)',
  '#333333': 'var(--color-gray-700)',
  '#3F3F3F': 'var(--color-gray-700)',
  '#1F2937': 'var(--color-gray-800)',
  '#111827': 'var(--color-gray-900)',

  // White
  '#FFFFFF': 'var(--color-text-inverse)',
  '#FFF': 'var(--color-text-inverse)',
  '#FFFBF7': 'var(--color-bg-primary)',
  '#EEF2FF': 'var(--color-info-light)',

  // Legacy grays (mapped to closest token)
  '#A1A1AA': 'var(--color-gray-400)',
  '#166534': 'var(--color-success-dark)',

  // Add more mappings as needed
};

interface MigrationResult {
  file: string;
  replacements: number;
  unmappedColors: Set<string>;
}

function findHexColors(content: string): string[] {
  const hexPattern = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;
  const matches = content.match(hexPattern) || [];
  return matches.map(hex => hex.toUpperCase());
}

function replaceColors(
  content: string,
  colorMap: Record<string, string>
): { newContent: string; count: number; unmapped: Set<string> } {
  let newContent = content;
  let count = 0;
  const unmapped = new Set<string>();

  const hexColors = findHexColors(content);

  for (const hex of hexColors) {
    const normalizedHex = hex.toUpperCase();
    const token = colorMap[normalizedHex];

    if (token) {
      // Create a regex that matches the hex color with word boundary
      const escapedHex = hex.replace(/#/, '\\#');
      const regex = new RegExp(escapedHex + '\\b', 'gi');
      newContent = newContent.replace(regex, token);
      count++;
    } else {
      unmapped.add(normalizedHex);
    }
  }

  return { newContent, count, unmapped };
}

async function migrateFile(
  filePath: string,
  dryRun: boolean = true
): Promise<MigrationResult> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const { newContent, count, unmapped } = replaceColors(content, COLOR_MAP);

  if (!dryRun && count > 0) {
    await fs.promises.writeFile(filePath, newContent, 'utf-8');
  }

  return {
    file: filePath,
    replacements: count,
    unmappedColors: unmapped,
  };
}

async function migrateDirectory(
  dirPath: string,
  extensions: string[] = ['.css', '.tsx', '.ts'],
  dryRun: boolean = true
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  async function walk(dir: string) {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        // Skip node_modules and dist
        if (
          file.name !== 'node_modules' &&
          file.name !== 'dist' &&
          file.name !== '.git' &&
          file.name !== '.claude'
        ) {
          await walk(fullPath);
        }
      } else if (file.isFile()) {
        const ext = path.extname(file.name);
        if (extensions.includes(ext)) {
          const result = await migrateFile(fullPath, dryRun);
          if (result.replacements > 0 || result.unmappedColors.size > 0) {
            results.push(result);
          }
        }
      }
    }
  }

  await walk(dirPath);
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const targetDir = args.find(arg => !arg.startsWith('--')) || './src';

  console.log('🎨 Color Migration Script');
  console.log(
    `Mode: ${dryRun ? 'DRY RUN (use --apply to write changes)' : 'APPLY CHANGES'}`
  );
  console.log(`Target: ${targetDir}\n`);

  const results = await migrateDirectory(
    targetDir,
    ['.css', '.tsx', '.ts'],
    dryRun
  );

  // Summary
  const totalReplacements = results.reduce((sum, r) => sum + r.replacements, 0);
  const allUnmapped = new Set<string>();
  results.forEach(r => r.unmappedColors.forEach(c => allUnmapped.add(c)));

  console.log('\n📊 Migration Summary:');
  console.log(`Files processed: ${results.length}`);
  console.log(`Total replacements: ${totalReplacements}`);
  console.log(`Unmapped colors: ${allUnmapped.size}\n`);

  if (allUnmapped.size > 0) {
    console.log('⚠️  Unmapped Colors (need token definitions):');
    allUnmapped.forEach(color => console.log(`  ${color}`));
    console.log('');
  }

  // Detailed results
  if (results.length > 0) {
    console.log('📝 File Details:');
    results.forEach(result => {
      if (result.replacements > 0) {
        console.log(`  ✓ ${result.file}: ${result.replacements} replacements`);
      }
      if (result.unmappedColors.size > 0) {
        console.log(
          `    ⚠️  Unmapped: ${Array.from(result.unmappedColors).join(', ')}`
        );
      }
    });
  }

  if (dryRun) {
    console.log('\n💡 This was a dry run. Use --apply to write changes.');
  } else {
    console.log('\n✅ Changes applied successfully!');
  }
}

main().catch(console.error);
