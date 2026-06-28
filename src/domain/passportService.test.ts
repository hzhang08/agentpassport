import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentPassportService } from "./passportService";
import { agentRegistry } from "./registry";
import { createDemoRuntime, getPresenterStepData, shouldShowApprovalGate } from "./simulation";
import type { AgentId } from "./types";

describe("Agent Passport policy flow", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("issues incident-scoped passports after workload verification", () => {
    const service = new AgentPassportService();
    service.verifyWorkload(agentRegistry["monitoring-agent"].runtime_id, "INC-1");
    const agent = service.verifyWorkload(agentRegistry["servicenow-agent"].runtime_id, "INC-1");
    const passport = service.issuePassport({ agent_id: agent.agent_id, incident_id: "INC-1", delegated_by: "monitoring-agent" });

    expect(passport.agent_id).toBe("servicenow-agent");
    expect(passport.delegated_by).toBe("monitoring-agent");
    expect(passport.allowed_tools).toContain("agent.delegate");
    expect(service.getAuditLog().map((event) => event.decision)).toEqual(["verified", "verified", "issued"]);
  });

  it("allows scoped read calls and denies unknown tools", () => {
    const service = new AgentPassportService();
    service.verifyWorkload(agentRegistry["identity-agent"].runtime_id, "INC-2");
    const passport = service.issuePassport({ agent_id: "identity-agent", incident_id: "INC-2" });

    expect(
      service.evaluateToolCall({
        passport,
        tool: "identity.logs.read",
        action: "read validation failures",
        target: "prod-identity"
      }).decision
    ).toBe("allow");

    expect(
      service.evaluateToolCall({
        passport,
        tool: "firewall.policy.rollback",
        action: "rollback firewall",
        target: "prod-edge-firewall"
      }).decision
    ).toBe("deny");
  });

  it("requires approval and scoped credential for firewall rollback", () => {
    const runtime = createDemoRuntime();
    const approval = runtime.state.approvals.find((item) => item.agent_id === "firewall-agent");

    expect(approval?.status).toBe("pending");
    const recovered = runtime.approveRollback();

    expect(recovered.incident.status).toBe("recovered");
    expect(recovered.scopedCredential).toContain("op://temporary/firewall-rollback");
    expect(recovered.audit.some((event) => event.decision === "require_scoped_credential")).toBe(true);
    expect(recovered.audit.some((event) => event.decision === "credential_released")).toBe(true);
    expect(recovered.audit.some((event) => event.decision === "completed")).toBe(true);
  });

  it("denies missing and expired passports", () => {
    const runtime = createDemoRuntime();

    const afterBadAgent = runtime.runBadAgentDemo();
    expect(afterBadAgent.audit.at(-1)?.reason).toContain("No Agent Passport");

    const afterExpired = runtime.runExpiredPassportDemo();
    expect(afterExpired.audit.at(-1)?.reason).toContain("expired");
  });

  it("denies forged passports that do not match the registry", () => {
    const service = new AgentPassportService();

    const result = service.evaluateToolCall({
      passport: {
        token: "forged",
        iss: "agent-passport-demo",
        sub: "agent:evil-agent",
        agent_id: "firewall-agent",
        agent_version: "0.0.1",
        owner: "unknown",
        runtime: "spiffe://airline.com/prod/agent/evil-agent",
        incident_id: "INC-FORGED",
        allowed_tools: ["firewall.policy.rollback"],
        approval_required: ["firewall.policy.rollback"],
        exp: Math.floor(Date.now() / 1000) + 300
      },
      tool: "firewall.policy.rollback",
      action: "forged rollback",
      target: "prod-edge-firewall"
    });

    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("not issued");
  });

  it("denies valid-looking passports that were not issued by the service", () => {
    const service = new AgentPassportService();
    const registered = agentRegistry["firewall-agent"];
    const result = service.evaluateToolCall({
      passport: {
        token: "forged-valid-looking",
        iss: "agent-passport-demo",
        sub: registered.runtime_id,
        agent_id: "firewall-agent",
        agent_version: registered.agent_version,
        owner: registered.owner,
        runtime: registered.runtime_id,
        incident_id: "INC-FORGED-VALID",
        allowed_tools: [...registered.allowed_tools],
        approval_required: ["firewall.policy.rollback"],
        exp: Math.floor(Date.now() / 1000) + 300
      },
      tool: "firewall.policy.rollback",
      action: "rollback change FW-4429 blocking token validation",
      target: "prod-edge-firewall"
    });

    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("not issued");
  });

  it("records prompt-injection signal as an approval event", () => {
    const runtime = createDemoRuntime();
    const next = runtime.runPromptInjectionDemo();
    const last = next.audit.at(-1);

    expect(last?.decision).toBe("require_approval");
    expect(last?.reason).toContain("Suspicious instruction");
  });

  it("binds scoped credentials to the approved action and target", () => {
    const service = new AgentPassportService();
    service.verifyWorkload(agentRegistry["firewall-agent"].runtime_id, "INC-SCOPE");
    const passport = service.issuePassport({ agent_id: "firewall-agent", incident_id: "INC-SCOPE" });
    const approvalResult = service.evaluateToolCall({
      passport,
      tool: "firewall.policy.rollback",
      action: "rollback change FW-4429 blocking token validation",
      target: "prod-edge-firewall",
      risk_score: 40
    });

    service.approveAction(approvalResult.approval_id!, true);

    expect(() =>
      service.releaseScopedCredential(passport, approvalResult.approval_id!, {
        action: "rollback different policy",
        target: "prod-edge-firewall",
        tool: "firewall.policy.rollback"
      })
    ).toThrow("approved scope");

    expect(
      service.releaseScopedCredential(passport, approvalResult.approval_id!, {
        action: "rollback change FW-4429 blocking token validation",
        target: "prod-edge-firewall",
        tool: "firewall.policy.rollback"
      })
    ).toContain("op://temporary/firewall-rollback");
  });

  it("rejects credential release with a forged valid-looking passport", () => {
    const service = new AgentPassportService();
    service.verifyWorkload(agentRegistry["firewall-agent"].runtime_id, "INC-CRED-FORGE");
    const issued = service.issuePassport({ agent_id: "firewall-agent", incident_id: "INC-CRED-FORGE" });
    const approvalResult = service.evaluateToolCall({
      passport: issued,
      tool: "firewall.policy.rollback",
      action: "rollback change FW-4429 blocking token validation",
      target: "prod-edge-firewall",
      risk_score: 40
    });
    service.approveAction(approvalResult.approval_id!, true);

    expect(() =>
      service.releaseScopedCredential({ ...issued, token: "forged-valid-looking" }, approvalResult.approval_id!, {
        action: "rollback change FW-4429 blocking token validation",
        target: "prod-edge-firewall",
        tool: "firewall.policy.rollback"
      })
    ).toThrow("not issued");
  });

  it("rejects credential release after an issued passport expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-27T12:00:00Z"));
    const service = new AgentPassportService();
    service.verifyWorkload(agentRegistry["firewall-agent"].runtime_id, "INC-EXPIRED-CRED");
    const issued = service.issuePassport({ agent_id: "firewall-agent", incident_id: "INC-EXPIRED-CRED", ttl_seconds: 1 });
    const approvalResult = service.evaluateToolCall({
      passport: issued,
      tool: "firewall.policy.rollback",
      action: "rollback change FW-4429 blocking token validation",
      target: "prod-edge-firewall",
      risk_score: 40
    });
    service.approveAction(approvalResult.approval_id!, true);

    vi.setSystemTime(new Date("2026-06-27T12:00:02Z"));
    expect(() =>
      service.releaseScopedCredential(issued, approvalResult.approval_id!, {
        action: "rollback change FW-4429 blocking token validation",
        target: "prod-edge-firewall",
        tool: "firewall.policy.rollback"
      })
    ).toThrow("expired");
  });

  it("requires verified workload and valid delegation before issuing passports", () => {
    const service = new AgentPassportService();

    expect(() => service.issuePassport({ agent_id: "firewall-agent", incident_id: "INC-DELEGATION" })).toThrow("workload verification");

    service.verifyWorkload(agentRegistry["network-agent"].runtime_id, "INC-DELEGATION");
    service.verifyWorkload(agentRegistry["firewall-agent"].runtime_id, "INC-DELEGATION");

    expect(() =>
      service.issuePassport({ agent_id: "firewall-agent", incident_id: "INC-DELEGATION", delegated_by: "network-agent" })
    ).toThrow("not allowed to delegate");
  });

  it("approves the selected approval instead of the first pending firewall approval", () => {
    const runtime = createDemoRuntime();
    const next = runtime.runPromptInjectionDemo();
    const latest = next.approvals.at(-1)!;

    const approved = runtime.approveRollback(latest.approval_id);
    const original = approved.approvals.find((approval) => approval.approval_id !== latest.approval_id && approval.agent_id === "firewall-agent");
    const selected = approved.approvals.find((approval) => approval.approval_id === latest.approval_id);

    expect(selected?.status).toBe("approved");
    expect(original?.status).toBe("pending");
  });

  it("scopes presenter data by step and highlights newly revealed records", () => {
    const runtime = createDemoRuntime();

    const unrevealed = getPresenterStepData(runtime.state, -1);
    expect(unrevealed.step).toBeUndefined();
    expect(unrevealed.visibleAgents).toEqual([]);
    expect(unrevealed.visibleAudit).toEqual([]);
    expect(unrevealed.visibleGateCount).toBe(0);

    const outage = getPresenterStepData(runtime.state, 0);
    expect(outage.visibleAgents.map((agent) => agent.agent_id)).toEqual(["monitoring-agent"]);
    expect(outage.visibleAudit.every((event) => ["metrics.read", "incident.create"].includes(event.tool_called))).toBe(true);
    expect(outage.newAgentIds.has("monitoring-agent")).toBe(true);

    const riskGate = getPresenterStepData(runtime.state, 3);
    expect(riskGate.visibleAgents.map((agent) => agent.agent_id)).toContain("firewall-agent");
    expect(riskGate.visibleAudit.some((event) => event.decision === "require_approval")).toBe(true);
    expect(riskGate.newAgentIds.has("firewall-agent")).toBe(true);

    const auditProof = getPresenterStepData(runtime.approveRollback(), 5);
    expect(auditProof.visibleAudit).toHaveLength(auditProof.visibleAudit.length);
    expect(auditProof.visibleAudit.length).toBe(runtime.service.getAuditLog().length);
    expect(auditProof.visibleGateCount).toBe(6);
  });

  it("does not leak future agent audit or approval data into early presenter steps", () => {
    const runtime = createDemoRuntime();
    const passportStep = getPresenterStepData(runtime.state, 1);
    const visibleAgentIds = new Set(passportStep.visibleAgents.map((agent) => agent.agent_id));

    expect([...visibleAgentIds]).toEqual(["monitoring-agent", "servicenow-agent"]);
    expect(passportStep.visibleAudit.every((event) => visibleAgentIds.has(event.agent_identity as AgentId))).toBe(true);
    expect(passportStep.visibleAudit.some((event) => event.agent_identity === "firewall-agent")).toBe(false);
    expect(shouldShowApprovalGate(0)).toBe(false);
    expect(shouldShowApprovalGate(1)).toBe(false);
    expect(shouldShowApprovalGate(2)).toBe(false);
    expect(shouldShowApprovalGate(3)).toBe(true);
  });
});
