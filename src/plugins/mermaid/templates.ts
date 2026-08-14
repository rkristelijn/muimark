export interface MermaidTemplate {
  id: string;
  label: string;
  description: string;
  code: string;
}

export const templates: MermaidTemplate[] = [
  {
    id: 'flowchart-lr',
    label: 'Flowchart (LR)',
    description: 'Left-to-right flowchart',
    code: `flowchart LR
  A[Start] --> B{Decision}
  B -->|Yes| C[Action 1]
  B -->|No| D[Action 2]
  C --> E[End]
  D --> E`,
  },
  {
    id: 'flowchart-td',
    label: 'Flowchart (TD)',
    description: 'Top-down flowchart',
    code: `flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action 1]
  B -->|No| D[Action 2]
  C --> E[End]
  D --> E`,
  },
  {
    id: 'sequence',
    label: 'Sequence Diagram',
    description: 'Interaction between actors over time',
    code: `sequenceDiagram
  participant Client
  participant Server
  participant Database

  Client->>Server: HTTP Request
  activate Server
  Server->>Database: Query
  activate Database
  Database-->>Server: Results
  deactivate Database
  Server-->>Client: HTTP Response
  deactivate Server`,
  },
  {
    id: 'class',
    label: 'Class Diagram',
    description: 'Object-oriented class relationships',
    code: `classDiagram
  class Service {
    +String name
    +String status
    +start()
    +stop()
    +healthCheck() bool
  }
  class Host {
    +String hostname
    +String ip
    +List~Service~ services
  }
  class Alert {
    +String severity
    +String message
    +DateTime triggered
  }

  Host "1" --> "*" Service : runs
  Service "1" --> "*" Alert : generates`,
  },
  {
    id: 'state',
    label: 'State Diagram',
    description: 'State machine transitions',
    code: `stateDiagram-v2
  [*] --> Open
  Open --> InProgress : Assigned
  InProgress --> Resolved : Fix applied
  Resolved --> Closed : Verified
  Resolved --> Open : Reopened
  InProgress --> OnHold : Waiting
  OnHold --> InProgress : Unblocked`,
  },
  {
    id: 'er',
    label: 'ER Diagram',
    description: 'Entity relationship diagram',
    code: `erDiagram
  HOST ||--o{ SERVICE : runs
  SERVICE ||--o{ INCIDENT : causes
  INCIDENT }o--|| PROBLEM : linked_to
  HOST {
    string hostname
    string ip
    string os
  }
  SERVICE {
    string name
    string version
    string status
  }
  INCIDENT {
    string id
    string severity
    date detected
    date resolved
  }
  PROBLEM {
    string id
    string root_cause
    string workaround
  }`,
  },
  {
    id: 'gantt',
    label: 'Gantt Chart',
    description: 'Project timeline and scheduling',
    code: `gantt
  title Project Plan
  dateFormat YYYY-MM-DD
  section Planning
    Research           :a1, 2024-01-01, 7d
    Design            :a2, after a1, 5d
  section Implementation
    Development       :b1, after a2, 14d
    Testing           :b2, after b1, 7d
  section Deployment
    Staging           :c1, after b2, 3d
    Production        :c2, after c1, 2d`,
  },
  {
    id: 'c4-context',
    label: 'C4 Context',
    description: 'System context diagram (C4 model)',
    code: `C4Context
  title System Context Diagram

  Person(user, "User", "Interacts with the system")
  System(system, "Our System", "Core application")
  System_Ext(ext, "External API", "Third-party service")

  Rel(user, system, "Uses")
  Rel(system, ext, "Calls")`,
  },
  {
    id: 'network',
    label: 'Network Topology',
    description: 'Infrastructure network layout',
    code: `flowchart TD
  subgraph Internet
    CF[Cloudflare DNS]
  end
  subgraph DMZ
    TR[Traefik Proxy]
  end
  subgraph Internal
    subgraph K3s Cluster
      SVC1[Service A]
      SVC2[Service B]
    end
    NAS[NAS Storage]
  end

  CF --> TR
  TR --> SVC1
  TR --> SVC2
  SVC1 --> NAS
  SVC2 --> NAS`,
  },
];
