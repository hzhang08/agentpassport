# Phase 4: Build Agent Simulation

## Objective

Simulate the multi-agent incident response flow without needing real airline, ServiceNow, firewall, or cloud systems.

## Tasks

### Task 4.1: Monitoring Agent Simulation

Simulate outage detection:

- Check-in timeout spike
- Identity validation failures
- Affected services: kiosk, mobile check-in, bag drop

Deliverable:

- Monitoring Agent event that starts the incident

### Task 4.2: ServiceNow Agent Simulation

Simulate incident coordination:

- Create incident
- Search mock knowledge base
- Invoke specialized agents
- Correlate findings
- Update timeline

Deliverable:

- ServiceNow Agent workflow controller

### Task 4.3: Specialized Agent Simulations

Each agent returns evidence:

- Cloud Agent: cloud identity service is healthy
- Network Agent: routing and tunnels are normal
- Identity Agent: token validation failures are increasing
- Firewall Agent: recent firewall policy change found
- Airport Ops Agent: check-in business impact confirmed

Deliverable:

- Mock investigation results for all specialized agents

### Task 4.4: Remediation Simulation

Simulate:

- Firewall Agent requests rollback
- Agent Passport requires approval
- Human approval is granted
- Scoped credential is released
- Rollback executes
- Check-in validation succeeds

Deliverable:

- Complete incident response sequence from outage to recovery

## Acceptance Criteria

- Agents cannot call tools without a passport
- ServiceNow Agent delegation is visible
- Root cause is correlated from multiple agent findings
- Remediation only executes after approval
- Recovery state is clearly shown
