# Agent Passport Demo Task Plan

This folder breaks the Airline Check-In Outage demo into implementation tasks.

## Demo Goal

Build a demo that shows multiple AI agents resolving an airline check-in outage while Agent Passport controls identity, permissions, delegation, approval, secrets access, and auditability.

## Task Files

1. [01-demo-scope.md](01-demo-scope.md)
2. [02-agent-passport-model.md](02-agent-passport-model.md)
3. [03-backend-services.md](03-backend-services.md)
4. [04-agent-simulation.md](04-agent-simulation.md)
5. [05-demo-ui.md](05-demo-ui.md)
6. [06-demo-script.md](06-demo-script.md)
7. [07-enhancements.md](07-enhancements.md)

## Recommended MVP

Build these first:

- Agent Passport service
- Static agent registry
- Policy engine
- Audit log
- Simulated agents
- Simple web UI
- Approval flow
- Mock 1Password credential release

## Success Criteria

- Outage is detected automatically
- Incident is created automatically
- Each agent is verified before action
- Delegation is visible and controlled
- Risky remediation requires approval
- Credential release is scoped to the approved action
- Audit timeline shows every agent action and decision
