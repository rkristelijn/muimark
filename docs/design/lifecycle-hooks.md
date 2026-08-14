# Lifecycle Hooks

Hooks allow custom logic to execute at specific points during CRUD operations.
They enable extensibility without modifying core code.

Inspired by: Payload CMS, Strapi, Webiny.

---

## Hook Points

```
CREATE:  beforeValidate → beforeCreate → [write to disk] → afterCreate
UPDATE:  beforeValidate → beforeChange → [write to disk] → afterChange
DELETE:  beforeDelete   → [remove file] → afterDelete
READ:    beforeRead     → [read file]   → afterRead
```

---

## Hook Levels

| Level | Scope | Example |
|-------|-------|---------|
| **Global** | All entities, all operations | Audit logging, error tracking |
| **Entity** | One entity, all operations | Auto-assign, notifications |
| **Field** | One field, specific operations | Normalize email, mask PII |

---

## Configuration

### Entity Hooks

```yaml
folders:
  - id: incidents
    hooks:
      beforeValidate: hooks/incidents/beforeValidate.ts
      beforeCreate: hooks/incidents/beforeCreate.ts
      afterCreate: hooks/incidents/afterCreate.ts
      beforeChange: hooks/incidents/beforeChange.ts
      afterChange: hooks/incidents/afterChange.ts
      beforeDelete: hooks/incidents/beforeDelete.ts
      afterDelete: hooks/incidents/afterDelete.ts
      beforeRead: hooks/incidents/beforeRead.ts
      afterRead: hooks/incidents/afterRead.ts
```

### Global Hooks

```yaml
hooks:
  afterError: hooks/global/logError.ts
  afterChange: hooks/global/auditLog.ts
  afterCreate: hooks/global/auditLog.ts
  afterDelete: hooks/global/auditLog.ts
```

### Field Hooks

```yaml
fields:
  - name: email
    type: text
    hooks:
      beforeValidate: hooks/fields/normalizeEmail.ts
      afterRead: hooks/fields/maskEmail.ts
```

---

## Hook Interface

```typescript
// types for all hooks

interface HookContext {
  entity: string;                    // "incidents"
  operation: 'create' | 'update' | 'delete' | 'read';
  data: Record<string, unknown>;     // current record data
  originalData?: Record<string, unknown>;  // previous state (updates only)
  user?: { email: string; role: string };  // null in local mode
  config: EntityConfig;              // entity configuration
  context: Map<string, unknown>;     // shared state between hooks in same request
}

// Field hook context adds:
interface FieldHookContext extends HookContext {
  field: string;                     // field name
  value: unknown;                    // current field value
}
```

---

## Before Hooks (blocking, can modify or abort)

Before hooks **must return data** (modified or unchanged). Throw to abort.

### beforeValidate

Runs before validation rules execute. Can transform data.

```typescript
// hooks/incidents/beforeValidate.ts
import type { HookContext } from '@/logic/hooks/types';

export default async ({ data }: HookContext) => {
  // Normalize title
  if (data.title && typeof data.title === 'string') {
    data.title = data.title.trim();
  }
  return data;
};
```

### beforeCreate

Runs after validation, before write. Can enrich or reject.

```typescript
// hooks/incidents/beforeCreate.ts
export default async ({ data, user }: HookContext) => {
  return {
    ...data,
    created_by: user?.email ?? 'system',
    created_at: new Date().toISOString(),
  };
};
```

### beforeChange

Runs on updates. Has access to previous state.

```typescript
// hooks/incidents/beforeChange.ts
export default async ({ data, originalData }: HookContext) => {
  // Prevent reopening closed incidents
  if (originalData?.status === 'Closed' && data.status !== 'Closed') {
    throw new Error('Cannot reopen a closed incident. Create a new one.');
  }

  // Auto-set resolved date
  if (data.status === 'Resolved' && !data.resolved_at) {
    data.resolved_at = new Date().toISOString();
  }

  return data;
};
```

### beforeDelete

Can prevent deletion by throwing.

```typescript
// hooks/incidents/beforeDelete.ts
export default async ({ data }: HookContext) => {
  if (data.status !== 'Closed') {
    throw new Error('Only closed incidents can be deleted.');
  }
};
```

### beforeRead

Can filter or redact fields based on user role.

```typescript
// hooks/incidents/beforeRead.ts
export default async ({ data, user }: HookContext) => {
  if (user?.role === 'viewer') {
    delete data.internal_notes;
    delete data.cost_estimate;
  }
  return data;
};
```

---

## After Hooks (non-blocking, side effects only)

After hooks do NOT return data. They fire after the operation completes.
They should not throw (errors are logged but don't affect the response).

### afterCreate

```typescript
// hooks/incidents/afterCreate.ts
export default async ({ data, entity }: HookContext) => {
  // Notify on critical incidents
  if (data.severity === 'Critical') {
    await fetch('https://hooks.slack.com/...', {
      method: 'POST',
      body: JSON.stringify({ text: `🚨 Critical: ${data.title}` }),
    });
  }
};
```

### afterChange

```typescript
// hooks/incidents/afterChange.ts
export default async ({ data, originalData, user }: HookContext) => {
  // Git auto-commit
  if (process.env.MUIMARK_MODE === 'enterprise') {
    await gitCommit(data._path, `${user?.email}: update ${data.id}`);
  }

  // Rebuild relation index if links changed
  if (data.related_change !== originalData?.related_change) {
    await rebuildRelationsFor(data._path);
  }
};
```

### afterDelete

```typescript
// hooks/incidents/afterDelete.ts
export default async ({ data }: HookContext) => {
  // Remove from relation index
  await removeRelationsFor(data._path);
};
```

---

## Global Hooks

Fire on every entity, every operation. Useful for cross-cutting concerns.

```typescript
// hooks/global/auditLog.ts
export default async ({ entity, operation, data, originalData, user }: HookContext) => {
  await db.insert('audit_log', {
    entity,
    operation,
    record_id: data.id ?? data._path,
    user: user?.email ?? 'anonymous',
    timestamp: new Date().toISOString(),
    changes: operation === 'update' ? computeDiff(originalData, data) : null,
  });
};
```

```typescript
// hooks/global/logError.ts
export default async ({ error, entity, operation }) => {
  console.error(`[${entity}/${operation}]`, error.message);
  // Could send to Sentry, DataDog, etc.
};
```

---

## Field Hooks

Operate on a single field value. Useful for normalization and access control.

```typescript
// hooks/fields/normalizeEmail.ts
export default ({ value }: FieldHookContext) => {
  return typeof value === 'string' ? value.toLowerCase().trim() : value;
};
```

```typescript
// hooks/fields/maskEmail.ts
export default ({ value, user }: FieldHookContext) => {
  if (user?.role === 'viewer') return '***@***.com';
  return value;
};
```

---

## Hook Context (shared state)

Hooks in the same request share a `context` Map. This prevents duplicate
work and avoids infinite loops.

```typescript
// hooks/incidents/beforeChange.ts
export default async ({ data, context }: HookContext) => {
  // Expensive lookup — only do once
  if (!context.has('enrichedProfile')) {
    const profile = await fetchProfile(data.assigned_to);
    context.set('enrichedProfile', profile);
  }

  data.team = context.get('enrichedProfile').team;
  return data;
};
```

---

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Before hooks are blocking | They must be able to modify data or abort |
| After hooks are fire-and-forget | Side effects must not slow the response |
| Hooks are server-only | Never bundled into client JS |
| Throw to abort | A throw in before-hook cancels the operation |
| Keep beforeRead lightweight | Runs on every single read request |
| Use context to share state | Prevents duplicate work across hooks |
| Make hooks idempotent | Safe to run multiple times |
| No circular updates | An afterChange that updates same entity → infinite loop |
| Offload heavy work | Long tasks should be async/queued, not blocking |
| Hooks are optional | Everything works without them |

---

## Execution Rules

1. **Multiple hooks at same point** run in series (array order in config)
2. **Before hooks** that return a Promise are awaited
3. **After hooks** that return void are non-blocking
4. **Global hooks** run AFTER entity hooks
5. **Field hooks** run BEFORE entity hooks (for beforeValidate)
6. **Errors in after-hooks** are logged but do not affect the response
7. **Errors in before-hooks** abort the operation and return error to client

---

## Where Hooks Live

```
project-root/
├── hooks/                    # User-defined hooks directory
│   ├── global/
│   │   ├── auditLog.ts
│   │   └── logError.ts
│   ├── incidents/
│   │   ├── beforeCreate.ts
│   │   ├── afterCreate.ts
│   │   └── afterChange.ts
│   ├── changes/
│   │   └── beforeChange.ts
│   └── fields/
│       ├── normalizeEmail.ts
│       └── maskEmail.ts
├── data/
│   └── .muimark.yaml        # References hooks by path
└── src/                      # muimark core (does NOT contain user hooks)
```

Hooks are part of the **user's project**, not the muimark package.
They are loaded at runtime via dynamic import based on paths in config.
