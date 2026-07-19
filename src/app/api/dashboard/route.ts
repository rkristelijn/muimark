import { NextResponse } from "next/server";
import { listFiles } from "@/shared/lib/files";
import type { FileEntry } from "@/shared/lib/files";

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

function extractDate(file: FileEntry): string | null {
  const fm = file.frontmatter;
  const dateVal = fm.date || fm.datum || fm.created || fm.Date || fm.Datum;
  if (typeof dateVal === "string") {
    const match = dateVal.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
  }
  return null;
}

function extractStatus(file: FileEntry): string {
  const fm = file.frontmatter;
  const status = fm.status || fm.Status || "";
  return typeof status === "string" ? status : "";
}

function extractSeverity(file: FileEntry): string {
  const fm = file.frontmatter;
  const sev = fm.severity || fm.ernst || fm.Severity || fm.Ernst || "";
  return typeof sev === "string" ? sev : "";
}

function isWithinDays(dateStr: string, days: number): boolean {
  const date = new Date(dateStr);
  const ago = new Date();
  ago.setDate(ago.getDate() - days);
  return date >= ago;
}

function isThisYear(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date.getFullYear() === new Date().getFullYear();
}

export async function GET() {
  const now = new Date();

  // --- Incidents ---
  let incidents: FileEntry[] = [];
  try {
    incidents = listFiles("incidents").filter((f) => f.id.startsWith("I-"));
  } catch {
    // folder might not exist
  }

  let incOpen = 0;
  let incClosed = 0;
  let incThisWeek = 0;
  let incThisMonth = 0;
  let incThisYear = 0;
  let incCritical = 0;
  let incHigh = 0;
  const incOpenList: { id: string; title: string; actions: number }[] = [];

  for (const inc of incidents) {
    const status = extractStatus(inc);
    const date = extractDate(inc);
    const severity = extractSeverity(inc);

    const isClosed =
      /opgelost|resolved|closed/i.test(status);

    if (isClosed) {
      incClosed++;
    } else {
      incOpen++;
      incOpenList.push({ id: inc.id, title: inc.title, actions: 0 });
    }

    if (date) {
      if (isWithinDays(date, 7)) incThisWeek++;
      if (isWithinDays(date, 30)) incThisMonth++;
      if (isThisYear(date)) incThisYear++;
    }

    if (/critical|critisch/i.test(severity)) incCritical++;
    if (/high|hoog/i.test(severity)) incHigh++;
  }

  // --- Changes ---
  let changes: FileEntry[] = [];
  try {
    changes = listFiles("changes").filter((f) => f.id.startsWith("SC-"));
  } catch {
    // folder might not exist
  }

  let chgOpen = 0;
  let chgClosed = 0;
  let chgInProgress = 0;
  let chgPlanned = 0;
  const chgOpenList: { id: string; title: string; status: string }[] = [];

  for (const chg of changes) {
    const status = extractStatus(chg);

    if (/closed|voltooid|done/i.test(status)) {
      chgClosed++;
    } else if (/progress|uitvoering|implementing/i.test(status)) {
      chgInProgress++;
      chgOpen++;
      chgOpenList.push({ id: chg.id, title: chg.title, status });
    } else if (/plan|ready|gepland|wacht/i.test(status)) {
      chgPlanned++;
      chgOpen++;
      chgOpenList.push({ id: chg.id, title: chg.title, status });
    } else {
      chgOpen++;
      chgOpenList.push({ id: chg.id, title: chg.title, status: status || "Unknown" });
    }
  }

  // --- Problems ---
  let problems: FileEntry[] = [];
  try {
    problems = listFiles("problems");
  } catch {
    // folder might not exist
  }

  let prbOpen = 0;
  for (const prb of problems) {
    const status = extractStatus(prb);
    if (!/closed|resolved/i.test(status)) {
      prbOpen++;
    }
  }

  // --- Quality ---
  const totalInc = incidents.length;
  const resolutionRate = totalInc > 0 ? Math.round((incClosed / totalInc) * 100) : 0;
  const dayOfYear = Math.ceil(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000
  );
  const weeksElapsed = Math.max(1, dayOfYear / 7);
  const incidentsPerWeek = Math.round((incThisYear / weeksElapsed) * 10) / 10;

  // --- Risks ---
  const risks: string[] = [];
  if (chgOpen > 5) {
    risks.push(`${chgOpen} open changes — change backlog growing`);
  }
  if (incOpen > 5) {
    risks.push(`${incOpen} open incidents without resolution`);
  }

  const metrics: DashboardMetrics = {
    timestamp: now.toISOString(),
    incidents: {
      total: totalInc,
      open: incOpen,
      closed: incClosed,
      thisWeek: incThisWeek,
      thisMonth: incThisMonth,
      thisYear: incThisYear,
      critical: incCritical,
      high: incHigh,
      openActions: 0,
      openList: incOpenList,
    },
    changes: {
      total: changes.length,
      open: chgOpen,
      inProgress: chgInProgress,
      planned: chgPlanned,
      closed: chgClosed,
      openList: chgOpenList,
    },
    problems: {
      total: problems.length,
      open: prbOpen,
    },
    quality: {
      resolutionRate,
      incidentsPerWeek,
    },
    risks,
  };

  return NextResponse.json(metrics);
}
