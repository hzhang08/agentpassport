import type { AuditEvent } from "./types";

export class AuditLog {
  private events: AuditEvent[] = [];
  private counter = 1;

  record(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
    const auditEvent: AuditEvent = {
      id: `evt-${String(this.counter++).padStart(3, "0")}`,
      timestamp: new Date(Date.now() + this.counter * 1000).toISOString(),
      ...event
    };
    this.events.push(auditEvent);
    return auditEvent;
  }

  list(): AuditEvent[] {
    return [...this.events];
  }
}
