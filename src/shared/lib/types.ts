export interface DashboardMetrics {
  timestamp: string;
  incidents: {
    total: number;
    open: number;
    closed: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    critical: number;
    high: number;
    openActions: number;
    openList: { id: string; title: string; actions: number }[];
  };
  changes: {
    total: number;
    open: number;
    inProgress: number;
    planned: number;
    closed: number;
    openList: { id: string; title: string; status: string }[];
  };
  problems: {
    total: number;
    open: number;
  };
  quality: {
    resolutionRate: number;
    incidentsPerWeek: number;
  };
  risks: string[];
}
