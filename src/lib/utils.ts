import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export const PHASE_LABELS: Record<string, string> = {
  FAT: "FAT",
  GAT: "GAT",
  PAT: "PAT",
};

export const PHASE_DESCRIPTIONS: Record<string, string> = {
  FAT: "Functionele Acceptatietest",
  GAT: "Gebruikers Acceptatietest",
  PAT: "Productie Acceptatietest",
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  PENDING: "bg-gray-100 text-gray-500",
  PASSED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  BLOCKED: "bg-orange-100 text-orange-700",
  CLOSED: "bg-slate-200 text-slate-600",
  NEW: "bg-blue-100 text-blue-700",
  QUESTION: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-green-100 text-green-700",
  OPEN: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  WITHDRAWN: "bg-gray-100 text-gray-500",
};

export const IMPACT_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-green-100 text-green-800 border-green-200",
};

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  BUG: "Fout",
  WISH: "Wens",
  BLOCKER: "Blokkade",
};

export const ISSUE_IMPACT_LABELS: Record<string, string> = {
  CRITICAL: "Kritiek",
  HIGH: "Hoog",
  MEDIUM: "Middel",
  LOW: "Laag",
};

export const ISSUE_STATUS_LABELS: Record<string, string> = {
  NEW: "Nieuw",
  IN_PROGRESS: "In behandeling",
  QUESTION: "Vraag",
  RESOLVED: "Opgelost",
  REJECTED: "Afgewezen",
  WITHDRAWN: "Ingetrokken",
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  STEP_EXECUTION: "Stap uitvoeren",
  RETEST: "Hertest",
  QUESTION: "Vraag beantwoorden",
};

// SLA thresholds in days per impact level
export const SLA_DAYS: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 3,
  MEDIUM: 7,
  LOW: 14,
};

export function getIssueSlaInfo(createdAt: string | Date, impact: string, status: string): {
  ageDays: number;
  ageLabel: string;
  isOverdue: boolean;
  slaDays: number;
} {
  const resolved = ["RESOLVED", "REJECTED", "WITHDRAWN"].includes(status);
  const created = new Date(createdAt);
  const now = new Date();
  const ageDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  const slaDays = SLA_DAYS[impact] ?? 7;
  const isOverdue = !resolved && ageDays > slaDays;

  let ageLabel: string;
  if (ageDays === 0) ageLabel = "Vandaag";
  else if (ageDays === 1) ageLabel = "1 dag";
  else if (ageDays < 7) ageLabel = `${ageDays} dagen`;
  else if (ageDays < 30) ageLabel = `${Math.floor(ageDays / 7)}w`;
  else ageLabel = `${Math.floor(ageDays / 30)}m`;

  return { ageDays, ageLabel, isOverdue, slaDays };
}
