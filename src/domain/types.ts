export type AgentId =
  | "monitoring-agent"
  | "servicenow-agent"
  | "cloud-agent"
  | "network-agent"
  | "identity-agent"
  | "firewall-agent"
  | "airport-ops-agent";

export type PolicyDecision = "allow" | "deny" | "require_approval" | "require_scoped_credential" | "log_only";

export type AgentPhase = "waiting" | "verified" | "investigating" | "blocked" | "complete";

export interface AgentRecord {
  agent_id: AgentId;
  display_name: string;
  agent_version: string;
  owner: string;
  runtime_id: string;
  allowed_tools: string[];
  delegation_rules: AgentId[];
  trust_level: "standard" | "elevated" | "restricted";
  role: string;
}

export interface Passport {
  token: string;
  iss: "agent-passport-demo";
  sub: string;
  agent_id: AgentId;
  agent_version: string;
  owner: string;
  runtime: string;
  delegated_by?: AgentId;
  incident_id: string;
  allowed_tools: string[];
  approval_required: string[];
  exp: number;
}

export interface Incident {
  id: string;
  title: string;
  status: "detecting" | "investigating" | "awaiting_approval" | "remediating" | "recovered";
  severity: "SEV-1" | "SEV-2";
  phase: string;
  affected_systems: string[];
  business_impact: string;
  metrics: {
    checkinTimeoutRate: number;
    identityValidationFailures: number;
    affectedPassengers: number;
    elapsedMinutes: number;
  };
}

export interface ToolCallRequest {
  passport?: Passport;
  tool: string;
  action: string;
  target: string;
  risk_score?: number;
  prompt?: string;
}

export interface PolicyResult {
  decision: PolicyDecision;
  reason: string;
  approval_id?: string;
  risk_score: number;
}

export interface ApprovalRequest {
  approval_id: string;
  incident_id: string;
  agent_id: AgentId;
  action: string;
  target: string;
  reason: string;
  risk_score: number;
  status: "pending" | "approved" | "rejected";
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  agent_identity: string;
  runtime_identity: string;
  incident_id: string;
  requested_action: string;
  tool_called: string;
  decision: PolicyDecision | "issued" | "verified" | "credential_released" | "completed" | "detected";
  reason: string;
  approval_id?: string;
}

export interface AgentRun {
  agent_id: AgentId;
  phase: AgentPhase;
  delegated_by?: AgentId;
  evidence: string;
  tool: string;
  decision?: PolicyDecision;
  passport?: Passport;
}

export interface DemoState {
  incident: Incident;
  agents: AgentRun[];
  approvals: ApprovalRequest[];
  audit: AuditEvent[];
  selectedAgentId: AgentId;
  scopedCredential?: string;
  recoveryNote?: string;
}
