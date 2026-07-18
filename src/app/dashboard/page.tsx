"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Warning,
  Build,
  BugReport,
  CheckCircle,
  TrendingUp,
  Error as ErrorIcon,
  ArrowBack,
  Refresh,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface DashboardMetrics {
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

function KpiCard({
  title,
  value,
  subtitle,
  color,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ textAlign: "center", py: 2 }}>
        {icon && <Box sx={{ color: color || "text.secondary", mb: 0.5 }}>{icon}</Box>}
        <Typography variant="h3" sx={{ color: color || "text.primary", fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function StatusChip({ status }: { status: string }) {
  let color: "default" | "success" | "warning" | "error" | "info" = "default";
  if (/progress|uitvoering|implementing/i.test(status)) color = "warning";
  else if (/plan|ready|gepland/i.test(status)) color = "info";
  else if (/closed|done|voltooid/i.test(status)) color = "success";
  return <Chip label={status} size="small" color={color} variant="outlined" />;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, refetch } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
    refetchInterval: 60000, // refresh every minute
  });

  if (isLoading || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: "center" }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Tooltip title="Back to ITSM">
          <IconButton onClick={() => router.push("/")} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
        </Tooltip>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
          ITSM Dashboard
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={() => refetch()}>
            <Refresh />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {new Date(data.timestamp).toLocaleString("nl-NL")}
        </Typography>
      </Box>

      {/* Risks */}
      {data.risks.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {data.risks.map((risk, i) => (
            <Alert key={i} severity="warning" sx={{ mb: 1 }}>
              {risk}
            </Alert>
          ))}
        </Box>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard
            title="Open Incidents"
            value={data.incidents.open}
            subtitle={`of ${data.incidents.total} total`}
            color={data.incidents.open > 0 ? "#d32f2f" : "#2e7d32"}
            icon={<Warning />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard
            title="Open Changes"
            value={data.changes.open}
            subtitle={`${data.changes.inProgress} in progress`}
            color={data.changes.inProgress > 0 ? "#ed6c02" : undefined}
            icon={<Build />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard
            title="Open Problems"
            value={data.problems.open}
            subtitle={`of ${data.problems.total} total`}
            icon={<BugReport />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard
            title="Resolution Rate"
            value={`${data.quality.resolutionRate}%`}
            subtitle={`${data.quality.incidentsPerWeek}/week avg`}
            color={data.quality.resolutionRate > 80 ? "#2e7d32" : "#ed6c02"}
            icon={<CheckCircle />}
          />
        </Grid>
      </Grid>

      {/* Trends Row */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          <TrendingUp fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
          Incident Trends
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {data.incidents.thisWeek}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This week
            </Typography>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {data.incidents.thisMonth}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This month
            </Typography>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {data.incidents.thisYear}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This year
            </Typography>
          </Grid>
        </Grid>
        {(data.incidents.critical > 0 || data.incidents.high > 0) && (
          <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
            {data.incidents.critical > 0 && (
              <Chip
                icon={<ErrorIcon />}
                label={`${data.incidents.critical} Critical`}
                color="error"
                size="small"
              />
            )}
            {data.incidents.high > 0 && (
              <Chip label={`${data.incidents.high} High`} color="warning" size="small" />
            )}
          </Box>
        )}
      </Paper>

      {/* Open Items */}
      <Grid container spacing={2}>
        {/* Open Incidents */}
        {data.incidents.openList.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                <Warning fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5, color: "#d32f2f" }} />
                Open Incidents ({data.incidents.open})
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <List dense disablePadding>
                {data.incidents.openList.map((inc) => (
                  <ListItem key={inc.id} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {inc.id}
                      </Typography>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" noWrap>
                          {inc.title}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}

        {/* Open Changes */}
        {data.changes.openList.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                <Build fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5, color: "#1976d2" }} />
                Open Changes ({data.changes.open})
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <List dense disablePadding>
                {data.changes.openList.map((chg) => (
                  <ListItem key={chg.id} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 56 }}>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {chg.id}
                      </Typography>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" noWrap>
                          {chg.title}
                        </Typography>
                      }
                      secondary={<StatusChip status={chg.status} />}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
