# Phase 5: Build Demo UI

## Objective

Build a simple, polished interface that makes Agent Passport visible as the trust layer behind multi-agent remediation.

## Tasks

### Task 5.1: Incident Dashboard

Show:

- Incident ID
- Status
- Severity
- Affected systems
- Business impact
- Current phase

Deliverable:

- Primary dashboard view for the outage

### Task 5.2: Agent Passport Panel

Show selected agent details:

- Agent ID
- Owner
- Version
- Workload certificate or SPIFFE-style runtime identity
- Passport claims
- Allowed tools
- Delegated by
- Expiration

Deliverable:

- Inspector panel for agent identity and passport state

### Task 5.3: Agent Collaboration View

Show:

- Agents involved
- Delegation path
- Investigation status
- Evidence returned by each agent
- Tool calls allowed or denied

Deliverable:

- Visual collaboration workflow

### Task 5.4: Risk Approval View

Show:

- Requested action
- Target system
- Risk score
- Approval reason
- Approve button
- Reject button

Deliverable:

- Interactive approval gate for firewall rollback

### Task 5.5: Audit Timeline

Show events:

- Certificate verified
- Passport issued
- Tool call allowed
- Delegation approved
- Action required approval
- Credential released
- Remediation completed

Deliverable:

- End-to-end audit trail visible in the UI

## Acceptance Criteria

- User can understand the outage at a glance
- User can see why each agent is trusted
- User can approve or reject risky remediation
- User can inspect the audit trail after recovery
