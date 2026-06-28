import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createDemoRuntime } from "../domain/simulation";
import type { Passport } from "../domain/types";

const runtime = createDemoRuntime();
const port = Number(process.env.PORT ?? 8787);

const routes: Record<string, (body: unknown) => unknown> = {
  "POST /verify-workload": (body) => {
    const input = body as { runtime_id: string; incident_id?: string };
    return runtime.service.verifyWorkload(input.runtime_id, input.incident_id ?? runtime.state.incident.id);
  },
  "POST /issue-passport": (body) => runtime.service.issuePassport(body as Parameters<typeof runtime.service.issuePassport>[0]),
  "POST /evaluate-tool-call": (body) => runtime.service.evaluateToolCall(body as Parameters<typeof runtime.service.evaluateToolCall>[0]),
  "POST /approve-action": (body) => {
    const input = body as { approval_id: string; approved: boolean };
    return runtime.service.approveAction(input.approval_id, input.approved);
  },
  "POST /release-scoped-credential": (body) => {
    const input = body as { passport: Passport; approval_id: string; action: string; target: string; tool?: string };
    return {
      credential: runtime.service.releaseScopedCredential(input.passport, input.approval_id, {
        action: input.action,
        target: input.target,
        tool: input.tool ?? "firewall.policy.rollback"
      })
    };
  },
  "GET /audit-log": () => runtime.service.getAuditLog(),
  "GET /demo-state": () => runtime.state,
  "POST /demo/approve-rollback": () => runtime.approveRollback(),
  "POST /demo/reject-rollback": () => runtime.rejectRollback(),
  "POST /demo/bad-agent": () => runtime.runBadAgentDemo(),
  "POST /demo/expired-passport": () => runtime.runExpiredPassportDemo(),
  "POST /demo/prompt-injection": () => runtime.runPromptInjectionDemo()
};

createServer(async (req, res) => {
  try {
    applyCors(req, res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const key = `${req.method} ${req.url?.split("?")[0]}`;
    const handler = routes[key];
    if (!handler) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const body = req.method === "GET" ? undefined : await readJson(req);
    sendJson(res, 200, handler(body));
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Unknown error" });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Agent Passport API listening on http://127.0.0.1:${port}`);
});

function applyCors(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
