import type { ApprovalRequest, Passport } from "./types";

export class SecretsBroker {
  releaseFirewallCredential(
    passport: Passport,
    approval: ApprovalRequest | undefined,
    request: { action: string; target: string; tool: string }
  ): string {
    if (!approval || approval.status !== "approved") {
      throw new Error("Credential release rejected: approved Agent Passport action is required.");
    }
    if (passport.agent_id !== approval.agent_id || passport.incident_id !== approval.incident_id) {
      throw new Error("Credential release rejected: approval does not match passport claims.");
    }
    if (request.tool !== "firewall.policy.rollback" || !passport.allowed_tools.includes(request.tool)) {
      throw new Error("Credential release rejected: requested tool is outside the approved firewall rollback scope.");
    }
    if (request.action !== approval.action || request.target !== approval.target) {
      throw new Error("Credential release rejected: requested action and target must match the approved scope.");
    }
    return `op://temporary/firewall-rollback/${approval.approval_id}/${passport.agent_id}`;
  }
}
