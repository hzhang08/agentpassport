import type { ApprovalRequest, PolicyResult, ToolCallRequest } from "./types";
import { agentRegistry } from "./registry";

const productionWriteTools = new Set(["firewall.policy.rollback", "incident.write"]);
const credentialTools = new Set(["firewall.policy.rollback"]);

export const policyCatalog = [
  {
    id: "registered-passport",
    name: "Registered passport required",
    scope: "All tool calls",
    decision: "deny",
    rule: "Deny calls without an issued Agent Passport or with passport claims that do not match the agent registry."
  },
  {
    id: "trusted-runtime",
    name: "Trusted workload namespace",
    scope: "All tool calls",
    decision: "deny",
    rule: "Deny runtime identities outside spiffe://airline.com/prod/agent/."
  },
  {
    id: "passport-tool-scope",
    name: "Tool must be in passport scope",
    scope: "All scoped tools",
    decision: "deny",
    rule: "Deny any tool call missing from the short-lived passport's allowed_tools claim."
  },
  {
    id: "production-write-approval",
    name: "Production write approval",
    scope: "firewall.policy.rollback, incident.write",
    decision: "require_approval",
    rule: "Require human approval before production write or remediation actions execute."
  },
  {
    id: "scoped-credential",
    name: "Scoped credential after approval",
    scope: "firewall.policy.rollback",
    decision: "require_scoped_credential",
    rule: "After approval, require a temporary credential bound to the approved action, target, tool, incident, and agent."
  },
  {
    id: "prompt-injection-risk",
    name: "Prompt injection risk gate",
    scope: "Prompts containing policy-bypass language",
    decision: "require_approval",
    rule: "Escalate suspicious instructions such as ignore policy to human approval before execution."
  },
  {
    id: "read-allow",
    name: "Scoped reads allowed",
    scope: "*.read tools",
    decision: "allow",
    rule: "Allow read actions when the passport is valid and the requested read tool is in scope."
  }
] as const;

export class PolicyEngine {
  private approvals = new Map<string, ApprovalRequest>();
  private approvalCounter = 1;

  evaluate(request: ToolCallRequest): PolicyResult {
    const passport = request.passport;
    const now = Math.floor(Date.now() / 1000);
    const riskScore = this.scoreRisk(request);

    if (!passport) {
      return { decision: "deny", reason: "No Agent Passport was presented.", risk_score: riskScore };
    }
    const registeredAgent = agentRegistry[passport.agent_id];
    if (!registeredAgent) {
      return { decision: "deny", reason: "Agent Passport subject is not registered.", risk_score: riskScore };
    }
    if (
      passport.runtime !== registeredAgent.runtime_id ||
      passport.agent_version !== registeredAgent.agent_version ||
      passport.owner !== registeredAgent.owner
    ) {
      return { decision: "deny", reason: "Agent Passport claims do not match the registered workload identity.", risk_score: riskScore };
    }
    if (passport.exp <= now) {
      return { decision: "deny", reason: "Agent Passport is expired.", risk_score: riskScore };
    }
    if (!passport.runtime.startsWith("spiffe://airline.com/prod/agent/")) {
      return { decision: "deny", reason: "Runtime identity is outside the trusted production namespace.", risk_score: riskScore };
    }
    if (!passport.allowed_tools.includes(request.tool)) {
      return { decision: "deny", reason: `Tool ${request.tool} is not in the passport scope.`, risk_score: riskScore };
    }
    if (request.prompt?.toLowerCase().includes("ignore policy")) {
      const approval = this.createApproval(request, riskScore, "Prompt injection signal detected.");
      if (approval.status === "rejected") {
        return {
          decision: "deny",
          reason: "Previously rejected prompt-injection action remains blocked.",
          approval_id: approval.approval_id,
          risk_score: riskScore
        };
      }
      if (approval.status === "approved") {
        return {
          decision: "allow",
          reason: "Previously approved prompt-injection risk gate is recorded for this exact action.",
          approval_id: approval.approval_id,
          risk_score: riskScore
        };
      }
      return {
        decision: "require_approval",
        reason: "Suspicious instruction increased risk and requires human approval.",
        approval_id: approval.approval_id,
        risk_score: riskScore
      };
    }
    if (productionWriteTools.has(request.tool)) {
      const approval = this.createApproval(request, riskScore, "Production write action requires human approval.");
      if (approval.status === "rejected") {
        return {
          decision: "deny",
          reason: "Human approver rejected this production remediation.",
          approval_id: approval.approval_id,
          risk_score: riskScore
        };
      }
      if (approval.status === "approved" && credentialTools.has(request.tool)) {
        return {
          decision: "require_scoped_credential",
          reason: "Approval granted; scoped credential is required before execution.",
          approval_id: approval.approval_id,
          risk_score: riskScore
        };
      }
      if (approval.status === "approved") {
        return {
          decision: "allow",
          reason: "Production write action was approved by a human approver.",
          approval_id: approval.approval_id,
          risk_score: riskScore
        };
      }
      return {
        decision: "require_approval",
        reason: "Production remediation requires approval before execution.",
        approval_id: approval.approval_id,
        risk_score: riskScore
      };
    }
    if (credentialTools.has(request.tool)) {
      return { decision: "require_scoped_credential", reason: "Scoped credential required.", risk_score: riskScore };
    }
    if (request.tool.endsWith(".read") || request.action.toLowerCase().includes("read")) {
      return { decision: "allow", reason: "Read action is within passport scope.", risk_score: riskScore };
    }
    return { decision: "log_only", reason: "Action is in scope and only requires audit logging.", risk_score: riskScore };
  }

  approve(approvalId: string, approved: boolean): ApprovalRequest | undefined {
    const approval = this.approvals.get(approvalId);
    if (!approval) return undefined;
    approval.status = approved ? "approved" : "rejected";
    return approval;
  }

  getApproval(approvalId: string): ApprovalRequest | undefined {
    return this.approvals.get(approvalId);
  }

  listApprovals(): ApprovalRequest[] {
    return [...this.approvals.values()];
  }

  private createApproval(request: ToolCallRequest, riskScore: number, reason: string): ApprovalRequest {
    const existing = [...this.approvals.values()].find(
      (approval) =>
        approval.agent_id === request.passport?.agent_id &&
        approval.action === request.action &&
        approval.target === request.target
    );
    if (existing) return existing;

    const approval: ApprovalRequest = {
      approval_id: `appr-${String(this.approvalCounter++).padStart(3, "0")}`,
      incident_id: request.passport!.incident_id,
      agent_id: request.passport!.agent_id,
      action: request.action,
      target: request.target,
      reason,
      risk_score: riskScore,
      status: "pending"
    };
    this.approvals.set(approval.approval_id, approval);
    return approval;
  }

  private scoreRisk(request: ToolCallRequest): number {
    let score = request.risk_score ?? 20;
    if (productionWriteTools.has(request.tool)) score += 45;
    if (request.target.toLowerCase().includes("prod")) score += 15;
    if (request.prompt?.toLowerCase().includes("ignore policy")) score += 30;
    return Math.min(score, 100);
  }
}
