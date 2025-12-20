import * as fs from 'fs';
import * as path from 'path';

// Color mapping: hex -> token
const COLOR_MAP: Record<string, string> = {
  // Primary colors
  '#050038': 'var(--color-primary)',
  '#030025': 'var(--color-primary-dark)',

  // Accent
  '#2563EB': 'var(--color-accent)',

  // Status colors
  '#10B981': 'var(--color-success)',
  '#059669': 'var(--color-success-dark)',
  '#F59E0B': 'var(--color-warning)',
  '#D97706': 'var(--color-warning-dark)',
  '#EF4444': 'var(--color-error)',

  // Priority colors
  '#F97316': 'var(--priority-high)',
  '#3B82F6': 'var(--priority-medium)',

  // Purple (changes requested)
  '#8B5CF6': 'var(--color-purple-500)',
  '#7C3AED': 'var(--color-purple-600)',
  '#6D28D9': 'var(--color-purple-700)',

  // Brand gold
  '#D4A574': 'var(--color-brand-gold)',

  // Text colors
  '#FFFFFF': 'var(--color-text-inverse)',
  '#000000': 'var(--color-primary)',
  '#6B7280': 'var(--color-text-secondary)',

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
