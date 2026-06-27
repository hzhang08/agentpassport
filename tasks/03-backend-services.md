# Phase 3: Build Backend Demo Services

## Objective

Implement the backend services that make Agent Passport believable: verification, policy, approval, audit, and credential brokering.

## Tasks

### Task 3.1: Build Agent Passport Service

Required endpoints:

- `POST /verify-workload`
- `POST /issue-passport`
- `POST /evaluate-tool-call`
- `POST /approve-action`
- `GET /audit-log`

Deliverable:

- Running API service with mock data

### Task 3.2: Build Agent Registry

Create static records for:

- Monitoring Agent
- ServiceNow Agent
- Cloud Agent
- Network Agent
- Identity Agent
- Firewall Agent
- Airport Ops Agent

Deliverable:

- Registry data file used by the API

### Task 3.3: Build Policy Engine

Implement rules:

- Read actions are allowed if included in passport
- Production write actions require approval
- Unknown tools are denied
- Expired passports are denied
- Untrusted runtimes are denied

Deliverable:

- Deterministic policy evaluator with clear allow, deny, and approval decisions

### Task 3.4: Build Audit Log Service

Record:

- Timestamp
- Agent identity
- Runtime identity
- Incident ID
- Requested action
- Tool called
- Decision
- Reason
- Approval ID, when present

Deliverable:

- Queryable audit timeline for the UI

### Task 3.5: Build Secrets Broker Mock

Simulate 1Password or Vault:

- Release credential only after Agent Passport approval
- Return a scoped temporary credential
- Log credential access
- Reject credential requests without approval

Deliverable:

- Mock credential release flow for firewall rollback

## Acceptance Criteria

- Backend can issue passports
- Backend can evaluate tool calls
- Backend can require approval for firewall rollback
- Backend can release a scoped credential after approval
- Backend records all major events in audit log
