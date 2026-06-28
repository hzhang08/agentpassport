import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Clock3,
  Database,
  FileSearch,
  KeyRound,
  LockKeyhole,
  Network,
  Play,
  ShieldCheck,
  ShieldX,
  TicketCheck,
  XCircle
} from "lucide-react";
import { policyCatalog } from "./domain/policy";
import { agentRegistry } from "./domain/registry";
import { createDemoRuntime, demoPersonas, getPresenterStepData, incidentFacts, incidentOpening, presenterSteps, shouldShowApprovalGate } from "./domain/simulation";
import type { AgentId, AgentRun, ApprovalRequest, AuditEvent, DemoState } from "./domain/types";

export function App() {
  const runtime = useMemo(() => createDemoRuntime(), []);
  const [state, setState] = useState<DemoState>(runtime.state);
  const [stepIndex, setStepIndex] = useState(-1);
  const pendingApproval = selectFirewallApproval(state.approvals, "pending");
  const presentation = getPresenterStepData(state, stepIndex);
  const presenterStep = presentation.step;
  const nextStep = presenterSteps[stepIndex + 1];
  const selected =
    presentation.visibleAgents.find((agent) => agent.agent_id === presentation.selectedAgentId) ?? presentation.visibleAgents.at(-1) ?? state.agents[0];

  function triggerPresenterStep(index: number) {
    const nextStep = presenterSteps[index];
    let nextState = state;
    if (index >= 4) {
      const approval = selectFirewallApproval(state.approvals, "pending");
      if (approval) {
        nextState = runtime.approveRollback(approval.approval_id);
      }
    }
    setStepIndex(index);
    setState({ ...nextState, selectedAgentId: nextStep.selectedAgentId });
  }

  function revealNextPresenterStep() {
    const nextIndex = Math.min(stepIndex + 1, presenterSteps.length - 1);
    triggerPresenterStep(nextIndex);
  }

  return (
    <main className="appShell">
      <header className="topBar">
        <div>
          <p className="eyebrow">Agent Passport Control Plane</p>
          <h1>Airline Check-In Outage</h1>
        </div>
        <div className={`statusPill status-${state.incident.status}`}>
          {state.incident.status === "recovered" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {state.incident.status.replace("_", " ")}
        </div>
      </header>

      <section className="summaryBand">
        <div className="incidentCopy">
          <p>{incidentOpening}</p>
          <div className="personaRow">
            {demoPersonas.map((persona) => (
              <span key={persona.name} title={persona.goal}>
                {persona.name}
              </span>
            ))}
          </div>
        </div>
        <Metric label="Timeout rate" value={`${state.incident.metrics.checkinTimeoutRate}%`} />
        <Metric label="Validation failures" value={state.incident.metrics.identityValidationFailures.toLocaleString()} />
        <Metric label="Elapsed" value={`${state.incident.metrics.elapsedMinutes}m`} />
      </section>

      <section className="storyBand">
        <div className="presenterMode">
          <div className="panelTitle">
            <Play size={20} />
            <h2>Presenter Mode</h2>
          </div>
          <button
            type="button"
            className="advanceStageButton"
            disabled={!nextStep}
            onClick={revealNextPresenterStep}
            aria-label={nextStep ? `Show stage ${stepIndex + 2}` : "All stages shown"}
          >
            <Play size={26} aria-hidden="true" />
          </button>
          <div className="stepTabs" role="tablist" aria-label="Demo talk track">
            {presenterSteps.slice(0, stepIndex + 1).map((step, index) => (
              <button
                key={step.title}
                type="button"
                className={index === stepIndex ? "selectedStep" : ""}
                onClick={() => triggerPresenterStep(index)}
                aria-pressed={index === stepIndex}
              >
                <span>{index + 1}</span>
                <small>{step.title.replace(/^\d+\.\s*/, "")}</small>
              </button>
            ))}
          </div>
          {presenterStep ? (
            <>
              <h3>{presenterStep.title}</h3>
              <p>{presenterStep.notice}</p>
            </>
          ) : (
            <p className="presenterStart">Click the green button to reveal the first stage.</p>
          )}
        </div>
        <div className="factRail">
          {incidentFacts
            .filter((fact) => presentation.visibleFactLabels.has(fact.label))
            .map((fact) => (
            <div key={fact.label} className={presentation.newFactLabels.has(fact.label) ? "newReveal" : ""}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <ControlPlaneLane state={state} visibleGateCount={presentation.visibleGateCount} activeStepIndex={stepIndex} />

      <section className="dashboardGrid">
        <IncidentPanel state={state} highlight={stepIndex === 0 || stepIndex >= 4} />
        <ApprovalPanel
          state={state}
          visible={shouldShowApprovalGate(stepIndex)}
          highlight={stepIndex === 3 || stepIndex === 4}
          onApprove={(approvalId) => setState(runtime.approveRollback(approvalId))}
          onReject={(approvalId) => setState(runtime.rejectRollback(approvalId))}
        />
        <PassportPanel agent={selected} highlight={presentation.newAgentIds.has(selected.agent_id) || stepIndex === 1} />
      </section>

      <section className="workGrid">
        <CollaborationPanel
          agents={presentation.visibleAgents}
          selectedAgentId={selected.agent_id}
          newAgentIds={presentation.newAgentIds}
          onSelect={(agentId) => setState({ ...state, selectedAgentId: agentId })}
        />
        <AuditTimeline audit={presentation.visibleAudit} newAuditIds={presentation.newAuditIds} />
      </section>

      <ControlPanel state={state} visibleAudit={presentation.visibleAudit} newAuditIds={presentation.newAuditIds} />

      <section className="failureBand">
        <div>
          <p className="eyebrow">Failure Demos</p>
          <h2>Policy rejections stay visible in audit</h2>
        </div>
        <div className="buttonRow">
          <button type="button" onClick={() => setState(runtime.runBadAgentDemo())}>
            <ShieldX size={17} /> Bad agent
          </button>
          <button type="button" onClick={() => setState(runtime.runExpiredPassportDemo())}>
            <Clock3 size={17} /> Expired passport
          </button>
          <button type="button" onClick={() => setState(runtime.runPromptInjectionDemo())}>
            <AlertTriangle size={17} /> Prompt injection
          </button>
        </div>
        {pendingApproval ? <span className="smallNote">Pending approval: {pendingApproval.approval_id}</span> : null}
      </section>
    </main>
  );
}

function ControlPlaneLane({
  state,
  visibleGateCount,
  activeStepIndex
}: {
  state: DemoState;
  visibleGateCount: number;
  activeStepIndex: number;
}) {
  const hasApproval = state.approvals.some((approval) => approval.status === "approved");
  const gates = [
    { label: "Workload verified", value: "SPIFFE runtime matched registry", active: true },
    { label: "Passport issued", value: "Short-lived incident scope", active: true },
    { label: "Delegation checked", value: "ServiceNow -> specialist agents", active: true },
    {
      label: "Risk policy",
      value: hasApproval ? "Rollback approved" : "Firewall rollback blocked",
      active: true,
      warn: !hasApproval
    },
    {
      label: "Scoped credential",
      value: state.scopedCredential ? "Temporary secret released" : "Held until approval",
      active: Boolean(state.scopedCredential)
    },
    {
      label: "Audit proof",
      value: `${state.audit.length} immutable demo events`,
      active: state.audit.length > 0
    }
  ];

  return (
    <section className="controlPlaneLane" aria-label="Agent Passport control plane gates">
      <div className="laneHeader">
        <p className="eyebrow">Agent Passport Trust Layer</p>
        <h2>Every agent action passes through identity, delegation, policy, approval, credentials, and audit.</h2>
      </div>
      <div className="gateFlow">
        {gates.slice(0, visibleGateCount).map((gate, index) => (
          <div
            key={gate.label}
            className={`gateNode ${gate.active ? "active" : ""} ${gate.warn ? "warn" : ""} ${index === activeStepIndex ? "newReveal" : ""}`}
          >
            <span>{gate.label}</span>
            <strong>{gate.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IncidentPanel({ state, highlight }: { state: DemoState; highlight: boolean }) {
  return (
    <section className={`panel incidentPanel ${highlight ? "newReveal" : ""}`}>
      <div className="panelTitle">
        <TicketCheck size={20} />
        <h2>Incident Dashboard</h2>
      </div>
      <dl className="definitionGrid">
        <dt>Incident</dt>
        <dd>{state.incident.id}</dd>
        <dt>Severity</dt>
        <dd>{state.incident.severity}</dd>
        <dt>Phase</dt>
        <dd>{state.incident.phase}</dd>
        <dt>Impact</dt>
        <dd>{state.incident.business_impact}</dd>
      </dl>
      <div className="affectedList">
        {state.incident.affected_systems.map((system) => (
          <span key={system}>{system}</span>
        ))}
      </div>
      {state.recoveryNote ? <p className="recoveryNote">{state.recoveryNote}</p> : null}
    </section>
  );
}

function ApprovalPanel({
  state,
  visible,
  highlight,
  onApprove,
  onReject
}: {
  state: DemoState;
  visible: boolean;
  highlight: boolean;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}) {
  const approval = selectFirewallApproval(state.approvals);
  return (
    <section className={`panel approvalPanel ${highlight ? "newReveal" : ""}`}>
      <div className="panelTitle">
        <LockKeyhole size={20} />
        <h2>Approval Gate</h2>
      </div>
      {!visible ? (
        <p className="emptyState">Risky remediation is hidden until the risk-gate step.</p>
      ) : approval ? (
        <>
          <div className={`riskDial risk-${approval.status}`}>
            <strong>{approval.risk_score}</strong>
            <span>Risk score</span>
          </div>
          <dl className="definitionGrid compact">
            <dt>Action</dt>
            <dd>{approval.action}</dd>
            <dt>Target</dt>
            <dd>{approval.target}</dd>
            <dt>Reason</dt>
            <dd>{approval.reason}</dd>
            <dt>Status</dt>
            <dd>{approval.status}</dd>
          </dl>
          <div className="buttonRow">
            <button type="button" disabled={approval.status !== "pending"} onClick={() => onApprove(approval.approval_id)}>
              <CheckCircle2 size={17} /> Approve
            </button>
            <button type="button" className="secondary" disabled={approval.status !== "pending"} onClick={() => onReject(approval.approval_id)}>
              <XCircle size={17} /> Reject
            </button>
          </div>
          {state.scopedCredential ? (
            <p className="credential">
              <KeyRound size={16} /> {state.scopedCredential}
            </p>
          ) : null}
        </>
      ) : (
        <p className="emptyState">No high-risk action is waiting for approval.</p>
      )}
    </section>
  );
}

function selectFirewallApproval(approvals: ApprovalRequest[], status?: ApprovalRequest["status"]): ApprovalRequest | undefined {
  const firewallApprovals = approvals.filter((item) => item.agent_id === "firewall-agent" && (!status || item.status === status));
  return firewallApprovals.at(-1);
}

function PassportPanel({ agent, highlight }: { agent: AgentRun; highlight: boolean }) {
  const registry = agentRegistry[agent.agent_id];
  const passport = agent.passport;
  return (
    <section className={`panel passportPanel ${highlight ? "newReveal" : ""}`}>
      <div className="panelTitle">
        <BadgeCheck size={20} />
        <h2>Passport Inspector</h2>
      </div>
      <dl className="definitionGrid">
        <dt>Agent</dt>
        <dd>{registry.display_name}</dd>
        <dt>Owner</dt>
        <dd>{passport?.owner}</dd>
        <dt>Version</dt>
        <dd>{passport?.agent_version}</dd>
        <dt>Runtime</dt>
        <dd className="mono">{passport?.runtime}</dd>
        <dt>Delegated by</dt>
        <dd>{passport?.delegated_by ?? "Direct incident scope"}</dd>
        <dt>Expires</dt>
        <dd>{passport ? new Date(passport.exp * 1000).toLocaleTimeString() : "No passport"}</dd>
      </dl>
      <div className="toolList">
        {passport?.allowed_tools.map((tool) => (
          <span key={tool}>{tool}</span>
        ))}
      </div>
    </section>
  );
}

function CollaborationPanel({
  agents,
  selectedAgentId,
  newAgentIds,
  onSelect
}: {
  agents: AgentRun[];
  selectedAgentId: AgentId;
  newAgentIds: Set<AgentId>;
  onSelect: (agentId: AgentId) => void;
}) {
  return (
    <section className="panel collaborationPanel">
      <div className="panelTitle">
        <Network size={20} />
        <h2>Agent Collaboration</h2>
      </div>
      <div className="agentList">
        {agents.map((agent) => {
          const registry = agentRegistry[agent.agent_id];
          return (
            <button
              type="button"
              key={agent.agent_id}
              className={`agentRow ${agent.agent_id === selectedAgentId ? "selected" : ""} ${newAgentIds.has(agent.agent_id) ? "newReveal" : ""}`}
              onClick={() => onSelect(agent.agent_id)}
            >
              <span className={`phaseDot phase-${agent.phase}`} />
              <span>
                <strong>{registry.display_name}</strong>
                <small>{agent.delegated_by ? `Delegated by ${agentRegistry[agent.delegated_by].display_name}` : registry.role}</small>
              </span>
              <em>{agent.decision ?? "pending"}</em>
              <p>{agent.evidence}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AuditTimeline({ audit, newAuditIds }: { audit: AuditEvent[]; newAuditIds: Set<string> }) {
  return (
    <section className="panel auditPanel">
      <div className="panelTitle">
        <ClipboardCheck size={20} />
        <h2>Audit Timeline</h2>
      </div>
      <AuditLogList audit={audit} newAuditIds={newAuditIds} />
    </section>
  );
}

function AuditLogList({ audit, newAuditIds }: { audit: AuditEvent[]; newAuditIds: Set<string> }) {
  return (
    <ol className="timeline">
      {audit.map((event) => (
        <li key={event.id} className={newAuditIds.has(event.id) ? "newReveal" : ""}>
          <span className="timelineIcon">{event.decision === "deny" ? <ShieldX size={15} /> : <ShieldCheck size={15} />}</span>
          <div>
            <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
            <strong>
              {event.agent_identity} · {event.tool_called}
            </strong>
            <p>{event.reason}</p>
            {event.approval_id ? <small>{event.approval_id}</small> : null}
          </div>
          <span className={`decision decision-${event.decision}`}>
            <CircleDot size={12} /> {event.decision}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ControlPanel({
  state,
  visibleAudit,
  newAuditIds
}: {
  state: DemoState;
  visibleAudit: AuditEvent[];
  newAuditIds: Set<string>;
}) {
  return (
    <section className="controlPanel" aria-label="Complete control panel">
      <div className="controlPanelHeader">
        <div>
          <p className="eyebrow">Control Panel</p>
          <h2>Complete Operator Data</h2>
        </div>
        <span>{state.audit.length} audit events</span>
      </div>
      <div className="controlPanelGrid">
        <section className="panel registryPanel">
          <div className="panelTitle">
            <Database size={20} />
            <h2>Agent Registry</h2>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Owner</th>
                  <th>Runtime</th>
                  <th>Tools</th>
                  <th>Delegates</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(agentRegistry).map((agent) => (
                  <tr key={agent.agent_id}>
                    <td>
                      <strong>{agent.display_name}</strong>
                      <small>{agent.agent_version} · {agent.trust_level}</small>
                    </td>
                    <td>{agent.owner}</td>
                    <td className="mono">{agent.runtime_id}</td>
                    <td>{agent.allowed_tools.join(", ")}</td>
                    <td>{agent.delegation_rules.length ? agent.delegation_rules.join(", ") : "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel policiesPanel">
          <div className="panelTitle">
            <ShieldCheck size={20} />
            <h2>Policies</h2>
          </div>
          <div className="policyList">
            {policyCatalog.map((policy) => (
              <article key={policy.id}>
                <div>
                  <strong>{policy.name}</strong>
                  <small>{policy.scope}</small>
                </div>
                <span className={`decision decision-${policy.decision}`}>
                  <CircleDot size={12} /> {policy.decision}
                </span>
                <p>{policy.rule}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel idpPanel">
          <div className="panelTitle">
            <FileSearch size={20} />
            <h2>IDP Debugger</h2>
          </div>
          <div className="idpList">
            {Object.values(agentRegistry).map((agent) => (
              <div key={agent.agent_id}>
                <span className="mono">{agent.runtime_id}</span>
                <strong>{agent.agent_id}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel fullAuditPanel">
          <div className="panelTitle">
            <ClipboardCheck size={20} />
            <h2>Stage Audit Logs</h2>
          </div>
          <AuditLogList audit={visibleAudit} newAuditIds={newAuditIds} />
        </section>
      </div>
    </section>
  );
}
