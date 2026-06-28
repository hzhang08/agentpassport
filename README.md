# Airline Check-In Agent Passport Demo

Demo implementation of Agent Passport as the identity, policy, delegation, approval, secrets, and audit control plane for enterprise AI agents during an airline check-in outage.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

Optional API adapter:

```bash
npm run api
```

API listens on `http://127.0.0.1:8787`.

## Verify

```bash
npm run verify
```

This runs Vitest coverage for the passport/policy/simulation flow and then builds the Vite app.

## Demo Flow

1. Monitoring Agent detects kiosk, mobile check-in, and bag-drop failures.
2. Agent Passport verifies workload identity and issues an incident-scoped passport.
3. ServiceNow Agent coordinates the incident and delegates to specialist agents.
4. Specialist agents present passports and return evidence.
5. Firewall Agent finds policy `FW-4429` blocking identity token validation.
6. Firewall rollback is classified as high-risk production remediation and requires approval.
7. Approval releases a scoped temporary credential from the mock secrets broker.
8. Rollback completes, check-in recovers, and the audit timeline preserves every decision.

## API Surface

- `POST /verify-workload`
- `POST /issue-passport`
- `POST /evaluate-tool-call`
- `POST /approve-action`
- `POST /release-scoped-credential`
- `GET /audit-log`
- `GET /demo-state`
- `POST /demo/approve-rollback`
- `POST /demo/reject-rollback`
- `POST /demo/bad-agent`
- `POST /demo/expired-passport`
- `POST /demo/prompt-injection`

## Demo Data

The static registry includes:

- Monitoring Agent
- ServiceNow Agent
- Cloud Agent
- Network Agent
- Identity Agent
- Firewall Agent
- Airport Ops Agent

Workload identities use SPIFFE-style values such as:

```text
spiffe://airline.com/prod/agent/firewall-agent
```

Failure demos cover unregistered/no-passport rollback, expired passport rejection, and prompt-injection risk escalation.

The UI includes a presenter mode for the 5-minute judge walkthrough plus a central Agent Passport trust-layer lane showing workload verification, passport issuance, delegation, policy, approval, scoped credential release, and audit proof.
