/**
 * Feature Coverage Registry
 *
 * Single source of truth for all product features.
 * Place `// @feature <ID>` markers in source code where features are implemented.
 * Tests reference features with `// @covers <ID>` or via test names.
 *
 * Run `npm run feature-coverage` to generate the traceability report.
 */

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'editor' | 'navigation' | 'data' | 'media' | 'config';
  priority: 'must' | 'should' | 'nice';
}

/**
 * All features of the application.
 * Add new features here first, then mark them in source + tests.
 */
export const features: Feature[] = [
  // === CORE ===
  { id: 'F-001', name: 'Folder listing', description: 'List markdown files in configured folders', category: 'core', priority: 'must' },
  { id: 'F-002', name: 'File CRUD', description: 'Create, read, update, delete markdown files', category: 'core', priority: 'must' },
  { id: 'F-003', name: 'Frontmatter parsing', description: 'Parse YAML frontmatter as structured metadata', category: 'core', priority: 'must' },
  { id: 'F-004', name: 'Auto-numbering', description: 'Auto-assign IDs to new files based on folder prefix', category: 'core', priority: 'must' },
  { id: 'F-005', name: 'Config discovery', description: 'Load .muimark.yaml or .config/itsm.yaml config', category: 'config', priority: 'must' },
  { id: 'F-006', name: 'Folder discovery', description: 'Auto-discover folders when no config exists', category: 'config', priority: 'should' },

  // === NAVIGATION ===
  { id: 'F-010', name: 'Sidebar navigation', description: 'Folder tree in sidebar with icons', category: 'navigation', priority: 'must' },
  { id: 'F-011', name: 'File grid', description: 'Tabular view of files with metadata columns', category: 'navigation', priority: 'must' },
  { id: 'F-012', name: 'URL routing', description: 'Direct URL access to any folder/file', category: 'navigation', priority: 'must' },
  { id: 'F-013', name: 'Relation navigation', description: 'Click #ID references to navigate between files', category: 'navigation', priority: 'should' },
  { id: 'F-014', name: 'Full-text search', description: 'Search across all files and metadata', category: 'navigation', priority: 'should' },

  // === EDITOR ===
  { id: 'F-020', name: 'WYSIWYG editing', description: 'Rich-text markdown editing with MDXEditor', category: 'editor', priority: 'must' },
  { id: 'F-021', name: 'Source mode toggle', description: 'Switch between WYSIWYG and raw markdown', category: 'editor', priority: 'must' },
  { id: 'F-022', name: 'Auto-save', description: 'Debounced auto-save on content change', category: 'editor', priority: 'must' },
  { id: 'F-023', name: 'Slash commands', description: 'Type / to insert blocks, tables, diagrams', category: 'editor', priority: 'should' },
  { id: 'F-024', name: 'Code blocks', description: 'Fenced code with syntax highlighting (20+ languages)', category: 'editor', priority: 'must' },
  { id: 'F-025', name: 'Tables', description: 'Markdown table editing with toolbar', category: 'editor', priority: 'must' },
  { id: 'F-026', name: 'Admonitions', description: ':::note, :::tip, :::caution, :::danger blocks', category: 'editor', priority: 'should' },

  // === MEDIA ===
  { id: 'F-030', name: 'Image paste', description: 'Paste/drop images into editor, auto-upload', category: 'media', priority: 'must' },
  { id: 'F-031', name: 'Image insert dialog', description: 'Insert image via URL or file picker', category: 'media', priority: 'should' },
  { id: 'F-032', name: 'Image serving', description: 'Serve uploaded images via API with caching', category: 'media', priority: 'must' },
  { id: 'F-033', name: 'Mermaid diagrams', description: 'Mermaid diagram editor with live preview', category: 'media', priority: 'should' },

  // === DATA ===
  { id: 'F-040', name: 'Grid inline editing', description: 'Edit frontmatter fields directly in grid cells', category: 'data', priority: 'must' },
  { id: 'F-041', name: 'Column configuration', description: 'Configure visible columns per folder', category: 'data', priority: 'should' },
  { id: 'F-042', name: 'CSV view', description: 'View and edit CSV files in grid format', category: 'data', priority: 'nice' },
  { id: 'F-043', name: 'Dashboard KPIs', description: 'Dashboard with folder statistics', category: 'data', priority: 'nice' },
];

export function getFeature(id: string): Feature | undefined {
  return features.find(f => f.id === id);
}

export function getFeaturesByCategory(category: Feature['category']): Feature[] {
  return features.filter(f => f.category === category);
}
