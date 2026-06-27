# Phase 2: Design Core Agent Passport Model

## Objective

Define the data model for agent identity, workload verification, passport issuance, permissions, delegation, risk, and approval.

## Tasks

### Task 2.1: Define Agent Registry Schema

Create a static registry schema with:

- `agent_id`
- `agent_version`
- `owner`
- `runtime_id`
- `allowed_tools`
- `delegation_rules`
- `trust_level`

Deliverable:

- JSON schema or TypeScript type for registered agents

### Task 2.2: Define Workload Identity Model

Use demo-friendly SPIFFE-style identities:

```text
spiffe://airline.com/prod/agent/firewall-agent
```

Deliverable:

- Workload identity examples for every demo agent

### Task 2.3: Define Passport Token Schema

Use short-lived JWT-style passports with:

- `iss`
- `sub`
- `agent_id`
- `agent_version`
- `owner`
- `runtime`
- `delegated_by`
- `incident_id`
- `allowed_tools`
- `approval_required`
- `exp`

Deliverable:

- Example passport payloads for ServiceNow Agent and Firewall Agent

### Task 2.4: Define Policy Rules

Define policy decisions:

- Allow
- Deny
- Require approval
- Require scoped credential
- Log only

Deliverable:

- Policy matrix for read tools, write tools, and production remediation

## Acceptance Criteria

- Every agent can be mapped from workload identity to agent identity
- Every tool call can be evaluated by policy
- High-risk production changes require approval
- Passport tokens are short-lived and incident-scoped
