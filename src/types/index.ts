import type { DefaultSession } from "next-auth";

// ─── Domain types ────────────────────────────────────────────────────────────

export type ProjectType = "IMPLEMENTATION" | "OPTIMIZATION" | "RELEASE";
export type ProjectStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type PhaseType = "FAT" | "GAT" | "PAT";
export type PhaseStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ACCEPTED" | "REJECTED";
export type FlowStatus = "ACTIVE" | "CLOSED";
export type RunStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ACCEPTED" | "REJECTED";
export type StepStatus = "PENDING" | "IN_PROGRESS" | "PASSED" | "FAILED" | "BLOCKED";
export type IssueType = "BUG" | "WISH" | "BLOCKER";
export type IssueStatus = "NEW" | "IN_PROGRESS" | "QUESTION" | "RESOLVED" | "REJECTED" | "WITHDRAWN";
export type IssueImpact = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type TaskType = "STEP_EXECUTION" | "RETEST" | "QUESTION";
export type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE";
export type TenantRole = "TENANT_ADMIN" | "SCRIPT_WRITER" | "TESTER" | "FUNCTIONAL_MANAGER";

export type UserSummary = { id: string; name: string };

export type Project = {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  type: ProjectType;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  phases?: TestPhase[];
  goLiveCriteria?: GoLiveCriteria | null;
};

export type TestPhase = {
  id: string;
  projectId: string;
  tenantId: string;
  name: PhaseType;
  title?: string | null;
  order: number;
  status: PhaseStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  flows?: Flow[];
  stepTotal?: number;
  stepDone?: number;
  openTaskCount?: number;
  openIssueCount?: number;
};

export type Flow = {
  id: string;
  phaseId: string;
  tenantId: string;
  name: string;
  description?: string | null;
  status: FlowStatus;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  createdAt: string;
  updatedAt: string;
  versions?: FlowVersion[];
};

export type FlowVersion = {
  id: string;
  flowId: string;
  tenantId: string;
  version: string;
  isActive: boolean;
  createdAt: string;
  steps?: FlowStep[];
  runs?: TestRun[];
  _count?: { steps?: number; runs?: number };
};

export type FlowStep = {
  id: string;
  flowVersionId: string;
  tenantId: string;
  order: number;
  title: string;
  instruction: string;
  expectedResult?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  assignees?: FlowStepAssignee[];
};

export type FlowStepAssignee = {
  id: string;
  flowStepId: string;
  userId: string;
  tenantId: string;
  user?: UserSummary;
};

export type TestRun = {
  id: string;
  flowVersionId: string;
  phaseId: string;
  projectId: string;
  tenantId: string;
  name: string;
  status: RunStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  steps?: RunStep[];
  flowVersion?: FlowVersion & { flow?: Flow & { phase?: TestPhase & { project?: Project } } };
};

export type RunStep = {
  id: string;
  runId: string;
  tenantId: string;
  order: number;
  title: string;
  instruction: string;
  expectedResult?: string | null;
  status: StepStatus;
  result?: string | null;
  notes?: string | null;
  doneById?: string | null;
  doneAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignees?: RunStepAssignee[];
  issues?: Issue[];
  tasks?: Task[];
  attachments?: Attachment[];
  run?: TestRun;
};

export type RunStepAssignee = {
  id: string;
  runStepId: string;
  userId: string;
  tenantId: string;
  completedAt?: string | null;
  completedStatus?: StepStatus | null;
  user?: UserSummary;
};

export type Issue = {
  id: string;
  runStepId: string;
  tenantId: string;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  impact: IssueImpact;
  hasWorkaround: boolean;
  workaroundNote?: string | null;
  businessAccepted: boolean;
  businessAcceptNote?: string | null;
  retestRequired: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserSummary;
  comments?: IssueComment[];
  attachments?: Attachment[];
  tasks?: Task[];
  runStep?: RunStep;
  _count?: { comments?: number };
};

export type IssueComment = {
  id: string;
  issueId: string;
  tenantId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: UserSummary;
};

export type Attachment = {
  id: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
  issueId?: string | null;
  runStepId?: string | null;
  createdAt: string;
};

export type Task = {
  id: string;
  tenantId: string;
  userId: string;
  type: TaskType;
  title: string;
  description?: string | null;
  status: TaskStatus;
  runStepId?: string | null;
  issueId?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: UserSummary;
  runStep?: RunStep;
  issue?: Issue;
};

export type TenantUser = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: TenantRole[];
  isActive: boolean;
  isBlocked: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GoLiveCriteria = {
  id: string;
  tenantId: string;
  projectId: string;
  goLiveDate?: string | null;
  goNoGoDate?: string | null;
  maxCritical?: number | null;
  maxHigh?: number | null;
  maxMedium?: number | null;
  maxLow?: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
  user?: UserSummary;
};

export type Template = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  versions?: TemplateVersion[];
};

export type TemplateVersion = {
  id: string;
  templateId: string;
  version: string;
  changelog?: string | null;
  isActive: boolean;
  createdAt: string;
  steps?: TemplateStep[];
};

export type TemplateStep = {
  id: string;
  templateVersionId: string;
  order: number;
  title: string;
  instruction: string;
  expectedResult?: string | null;
};

// ─── API response wrapper ────────────────────────────────────────────────────

export type ApiSuccess<T> = { data: T };
export type ApiError = { error: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      userType: "platform" | "tenant";
      tenantId: string | null;
      roles: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    userType: "platform" | "tenant";
    tenantId: string | null;
    roles: string[];
    name: string;
    email: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    userType: "platform" | "tenant";
    tenantId: string | null;
    roles: string[];
  }
}

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  userType: "platform" | "tenant";
  tenantId: string | null;
  roles: string[];
};

export function isPlatformUser(user: SessionUser): boolean {
  return user.userType === "platform";
}

export function isSuperAdmin(user: SessionUser): boolean {
  return user.userType === "platform" && user.roles.includes("SUPER_ADMIN");
}

export function isTenantAdmin(user: SessionUser): boolean {
  return user.roles.includes("TENANT_ADMIN");
}

export function isScriptWriter(user: SessionUser): boolean {
  return user.roles.includes("SCRIPT_WRITER") || user.roles.includes("TENANT_ADMIN");
}

export function isTester(user: SessionUser): boolean {
  return (
    user.roles.includes("TESTER") ||
    user.roles.includes("TENANT_ADMIN") ||
    user.roles.includes("SCRIPT_WRITER")
  );
}

export function isFunctionalManager(user: SessionUser): boolean {
  return (
    user.roles.includes("FUNCTIONAL_MANAGER") || user.roles.includes("TENANT_ADMIN")
  );
}
