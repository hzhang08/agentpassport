import type { AgentId, AgentRecord } from "./types";

export const agentRegistry: Record<AgentId, AgentRecord> = {
  "monitoring-agent": {
    agent_id: "monitoring-agent",
    display_name: "Monitoring Agent",
    agent_version: "1.8.2",
    owner: "SRE Observability",
    runtime_id: "spiffe://airline.com/prod/agent/monitoring-agent",
    allowed_tools: ["metrics.read", "incident.create"],
    delegation_rules: ["servicenow-agent"],
    trust_level: "standard",
    role: "Detects check-in failures and opens the incident."
  },
  "servicenow-agent": {
    agent_id: "servicenow-agent",
    display_name: "ServiceNow Agent",
    agent_version: "2.4.0",
    owner: "ITSM Automation",
    runtime_id: "spiffe://airline.com/prod/agent/servicenow-agent",
    allowed_tools: ["incident.read", "incident.write", "kb.search", "agent.delegate"],
    delegation_rules: ["cloud-agent", "network-agent", "identity-agent", "firewall-agent", "airport-ops-agent"],
    trust_level: "elevated",
    role: "Coordinates response, delegates investigation, and correlates evidence."
  },
  "cloud-agent": {
    agent_id: "cloud-agent",
    display_name: "Cloud Agent",
    agent_version: "1.3.7",
    owner: "Cloud Platform",
    runtime_id: "spiffe://airline.com/prod/agent/cloud-agent",
    allowed_tools: ["cloud.identity.read", "cloud.health.read"],
    delegation_rules: [],
    trust_level: "standard",
    role: "Checks cloud identity platform health."
  },
  "network-agent": {
    agent_id: "network-agent",
    display_name: "Network Agent",
    agent_version: "3.1.1",
    owner: "Network Engineering",
    runtime_id: "spiffe://airline.com/prod/agent/network-agent",
    allowed_tools: ["network.route.read", "network.tunnel.read"],
    delegation_rules: [],
    trust_level: "standard",
    role: "Validates routing, tunnels, and airport connectivity."
  },
  "identity-agent": {
    agent_id: "identity-agent",
    display_name: "Identity Agent",
    agent_version: "2.0.5",
    owner: "Identity Services",
    runtime_id: "spiffe://airline.com/prod/agent/identity-agent",
    allowed_tools: ["identity.logs.read", "identity.token.validate"],
    delegation_rules: [],
    trust_level: "standard",
    role: "Investigates token validation failures."
  },
  "firewall-agent": {
    agent_id: "firewall-agent",
    display_name: "Firewall Agent",
    agent_version: "4.6.3",
    owner: "Security Engineering",
    runtime_id: "spiffe://airline.com/prod/agent/firewall-agent",
    allowed_tools: ["firewall.policy.read", "firewall.policy.rollback"],
    delegation_rules: [],
    trust_level: "elevated",
    role: "Finds recent policy changes and performs approved rollback."
  },
  "airport-ops-agent": {
    agent_id: "airport-ops-agent",
    display_name: "Airport Ops Agent",
    agent_version: "1.6.0",
    owner: "Airport Operations",
    runtime_id: "spiffe://airline.com/prod/agent/airport-ops-agent",
    allowed_tools: ["airport.kiosk.read", "airport.bagdrop.read", "passenger.impact.read"],
    delegation_rules: [],
    trust_level: "standard",
    role: "Confirms real-world operational impact."
  }
};

export function findAgentByRuntime(runtimeId: string): AgentRecord | undefined {
  return Object.values(agentRegistry).find((agent) => agent.runtime_id === runtimeId);
}
