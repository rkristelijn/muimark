export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: 'block' | 'inline' | 'diagram';
  /** Markdown content to insert */
  insert: string;
}

export const slashCommands: SlashCommand[] = [
  {
    id: 'table',
    label: 'Table',
    description: 'Insert a markdown table',
    icon: '⊞',
    category: 'block',
    insert: `| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`,
  },
  {
    id: 'mermaid',
    label: 'Mermaid Diagram',
    description: 'Insert a mermaid diagram block',
    icon: '◇',
    category: 'diagram',
    insert: `\`\`\`mermaid
flowchart LR
  A[Start] --> B{Decision}
  B -->|Yes| C[Done]
  B -->|No| D[Retry]
\`\`\``,
  },
  {
    id: 'code',
    label: 'Code Block',
    description: 'Insert a fenced code block',
    icon: '⟨⟩',
    category: 'block',
    insert: `\`\`\`bash

\`\`\``,
  },
  {
    id: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    category: 'block',
    insert: '# ',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    category: 'block',
    insert: '## ',
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    category: 'block',
    insert: '### ',
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Horizontal rule',
    icon: '―',
    category: 'block',
    insert: '\n---\n',
  },
  {
    id: 'quote',
    label: 'Quote',
    description: 'Block quote',
    icon: '❝',
    category: 'block',
    insert: '> ',
  },
  {
    id: 'checklist',
    label: 'Checklist',
    description: 'Task list with checkboxes',
    icon: '☑',
    category: 'block',
    insert: `- [ ] Task 1
- [ ] Task 2
- [ ] Task 3`,
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    description: 'Unordered list',
    icon: '•',
    category: 'block',
    insert: `- Item 1
- Item 2
- Item 3`,
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    description: 'Ordered list',
    icon: '1.',
    category: 'block',
    insert: `1. First
2. Second
3. Third`,
  },
  {
    id: 'sequence',
    label: 'Sequence Diagram',
    description: 'Mermaid sequence diagram',
    icon: '↔',
    category: 'diagram',
    insert: `\`\`\`mermaid
sequenceDiagram
  participant A as Client
  participant B as Server
  A->>B: Request
  B-->>A: Response
\`\`\``,
  },
  {
    id: 'note',
    label: 'Note',
    description: 'Info/note admonition',
    icon: 'ℹ',
    category: 'block',
    insert: `:::note
Important information here.
:::`,
  },
  {
    id: 'tip',
    label: 'Tip',
    description: 'Tip admonition',
    icon: '💡',
    category: 'block',
    insert: `:::tip
Helpful tip here.
:::`,
  },
  {
    id: 'warning',
    label: 'Warning',
    description: 'Warning admonition',
    icon: '⚠',
    category: 'block',
    insert: `:::caution
Be careful with this.
:::`,
  },
  {
    id: 'danger',
    label: 'Danger',
    description: 'Danger admonition',
    icon: '🚨',
    category: 'block',
    insert: `:::danger
Critical warning here.
:::`,
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Insert an image (paste or use toolbar 📷)',
    icon: '🖼',
    category: 'inline',
    insert: `![alt text](url)`,
  },
];
