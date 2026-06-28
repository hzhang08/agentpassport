import { AuditLog } from "./audit";
import { PolicyEngine } from "./policy";
import { agentRegistry, findAgentByRuntime } from "./registry";
import { SecretsBroker } from "./secretsBroker";
import type { AgentId, AgentRecord, ApprovalRequest, AuditEvent, Passport, PolicyResult, ToolCallRequest } from "./types";

export class AgentPassportService {
  readonly audit = new AuditLog();
  readonly policy = new PolicyEngine();
  readonly secrets = new SecretsBroker();
  private readonly issuedPassports = new Map<string, Passport>();
  private readonly verifiedWorkloads = new Map<string, AgentRecord>();

  verifyWorkload(runtime_id: string, incident_id: string): AgentRecord {
    const agent = findAgentByRuntime(runtime_id);
    if (!agent) {
      this.audit.record({
        agent_identity: "unknown",
        runtime_identity: runtime_id,
        incident_id,
        requested_action: "verify workload",
        tool_called: "passport.verify-workload",
        decision: "deny",
        reason: "Workload runtime is not registered."
      });
      throw new Error("Unregistered workload identity.");
    }
    this.audit.record({
      agent_identity: agent.agent_id,
      runtime_identity: agent.runtime_id,
      incident_id,
      requested_action: "verify workload certificate",
      tool_called: "passport.verify-workload",
      decision: "verified",
      reason: "SPIFFE-style workload identity matched the static agent registry."
    });
    this.verifiedWorkloads.set(`${incident_id}:${agent.agent_id}`, agent);
    return agent;
  }

  issuePassport(input: { agent_id: AgentId; incident_id: string; delegated_by?: AgentId; ttl_seconds?: number }): Passport {
    const agent = agentRegistry[input.agent_id];
    if (!this.verifiedWorkloads.has(`${input.incident_id}:${input.agent_id}`)) {
      throw new Error("Cannot issue passport before successful workload verification for this incident.");
    }
    if (input.delegated_by) {
      const delegator = agentRegistry[input.delegated_by];
      if (!this.verifiedWorkloads.has(`${input.incident_id}:${input.delegated_by}`)) {
        throw new Error("Cannot issue delegated passport before delegator workload is verified for this incident.");
      }
      if (!delegator.delegation_rules.includes(input.agent_id)) {
        throw new Error(`${input.delegated_by} is not allowed to delegate to ${input.agent_id}.`);
      }
    }
    const now = Math.floor(Date.now() / 1000);
    const passport: Passport = {
      token: `demo.${base64Url(`${input.agent_id}:${input.incident_id}:${now}`)}.sig`,
      iss: "agent-passport-demo",
      sub: agent.runtime_id,
      agent_id: agent.agent_id,
      agent_version: agent.agent_version,
      owner: agent.owner,
      runtime: agent.runtime_id,
      delegated_by: input.delegated_by,
      incident_id: input.incident_id,
      allowed_tools: agent.allowed_tools,
      approval_required: agent.allowed_tools.filter((tool) => tool.includes("rollback") || tool === "incident.write"),
      exp: now + (input.ttl_seconds ?? 900)
    };
    this.audit.record({
      agent_identity: agent.agent_id,
      runtime_identity: agent.runtime_id,
      incident_id: input.incident_id,
      requested_action: "issue short-lived passport",
      tool_called: "passport.issue-passport",
      decision: "issued",
      reason: input.delegated_by ? `Passport delegated by ${input.delegated_by}.` : "Passport issued for incident scope."
    });
    this.issuedPassports.set(passport.token, passport);
    return passport;
  }

  evaluateToolCall(request: ToolCallRequest): PolicyResult {
    if (request.passport && !this.isIssuedPassport(request.passport)) {
      const result: PolicyResult = {
        decision: "deny",
        reason: "Agent Passport token was not issued by this Agent Passport service.",
        risk_score: request.risk_score ?? 20
      };
      this.audit.record({
        agent_identity: request.passport.agent_id ?? "unknown",
        runtime_identity: request.passport.runtime ?? "unknown",
        incident_id: request.passport.incident_id ?? "unknown",
        requested_action: request.action,
        tool_called: request.tool,
        decision: result.decision,
        reason: result.reason
      });
      return result;
    }
    const result = this.policy.evaluate(request);
    this.audit.record({
      agent_identity: request.passport?.agent_id ?? "unknown",
      runtime_identity: request.passport?.runtime ?? "unknown",
      incident_id: request.passport?.incident_id ?? "unknown",
      requested_action: request.action,
      tool_called: request.tool,
      decision: result.decision,
      reason: result.reason,
      approval_id: result.approval_id
    });
    return result;
  }

  approveAction(approval_id: string, approved: boolean): ApprovalRequest {
    const approval = this.policy.approve(approval_id, approved);
    if (!approval) {
      throw new Error(`Approval ${approval_id} was not found.`);
    }
    this.audit.record({
      agent_identity: approval.agent_id,
      runtime_identity: agentRegistry[approval.agent_id].runtime_id,
      incident_id: approval.incident_id,
      requested_action: approval.action,
      tool_called: "passport.approve-action",
      decision: approved ? "allow" : "deny",
      reason: approved ? "Human approver accepted the risk gate." : "Human approver rejected the risk gate.",
      approval_id
    });
    return approval;
  }

  releaseScopedCredential(passport: Passport, approval_id: string, request: { action: string; target: string; tool: string }): string {
    if (!this.isIssuedPassport(passport)) {
      throw new Error("Credential release rejected: passport token was not issued by this Agent Passport service.");
    }
    if (passport.exp <= Math.floor(Date.now() / 1000)) {
      throw new Error("Credential release rejected: Agent Passport is expired.");
    }
    const approval = this.policy.getApproval(approval_id);
    const credential = this.secrets.releaseFirewallCredential(passport, approval, request);
    this.audit.record({
      agent_identity: passport.agent_id,
      runtime_identity: passport.runtime,
      incident_id: passport.incident_id,
      requested_action: `release scoped credential for ${request.action}`,
      tool_called: "secrets.release",
      decision: "credential_released",
      reason: `Temporary firewall rollback credential released for ${request.target} only.`,
      approval_id
    });
    return credential;
  }

  getAuditLog(): AuditEvent[] {
    return this.audit.list();
  }

  getApprovals(): ApprovalRequest[] {
    return this.policy.listApprovals();
  }

  private isIssuedPassport(passport: Passport): boolean {
    const issued = this.issuedPassports.get(passport.token);
    return (
      Boolean(issued) &&
      issued?.agent_id === passport.agent_id &&
      issued?.agent_version === passport.agent_version &&
      issued?.owner === passport.owner &&
      issued?.runtime === passport.runtime &&
      issued?.incident_id === passport.incident_id &&
      issued?.exp === passport.exp
    );
  }
}

function base64Url(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value).toString("base64url");
  }
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
