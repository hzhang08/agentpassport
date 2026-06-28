from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

OUT = "/Users/henry/Documents/workspace/agentpassport/output/pdf/agent-passport-presenter-guide.pdf"

W, H = landscape((13.333 * inch, 7.5 * inch))

BG = colors.HexColor("#07110f")
PANEL = colors.HexColor("#10201c")
PANEL_2 = colors.HexColor("#162b25")
LINE = colors.HexColor("#2e4a42")
TEXT = colors.HexColor("#f4fbf7")
MUTED = colors.HexColor("#aac2b8")
GREEN = colors.HexColor("#55d69e")
MINT = colors.HexColor("#a7f3d0")
AMBER = colors.HexColor("#f7b955")
RED = colors.HexColor("#ff6b6b")
BLUE = colors.HexColor("#73b7ff")


def wrap_text(text, font, size, max_width):
    lines = []
    for raw in text.split("\n"):
        words = raw.split()
        if not words:
            lines.append("")
            continue
        line = words[0]
        for word in words[1:]:
            test = f"{line} {word}"
            if stringWidth(test, font, size) <= max_width:
                line = test
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines


def draw_wrapped(c, text, x, y, max_width, font="Helvetica", size=16, color=TEXT, leading=None, max_lines=None):
    c.setFont(font, size)
    c.setFillColor(color)
    leading = leading or size * 1.25
    lines = wrap_text(text, font, size, max_width)
    if max_lines:
        lines = lines[:max_lines]
    for i, line in enumerate(lines):
        c.drawString(x, y - i * leading, line)
    return y - len(lines) * leading


def rect(c, x, y, w, h, fill=PANEL, stroke=LINE, radius=8):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def rule(c, x, y, w, color=GREEN, h=3):
    c.setFillColor(color)
    c.rect(x, y, w, h, fill=1, stroke=0)


def header(c, title, page, kicker="AGENT PASSPORT PRESENTER GUIDE"):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    draw_wrapped(c, kicker, 54, H - 48, 360, "Helvetica-Bold", 11, GREEN)
    draw_wrapped(c, title, 54, H - 86, 760, "Helvetica-Bold", 30, TEXT, 36)
    rule(c, 54, H - 126, 142, GREEN, 3)
    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    c.drawString(54, 32, f"Airline Check-In Outage Demo | {page}/8")


def pill(c, text, x, y, color=GREEN):
    c.setFont("Helvetica-Bold", 10)
    pad_x = 10
    width = stringWidth(text, "Helvetica-Bold", 10) + pad_x * 2
    c.setFillColor(colors.Color(color.red, color.green, color.blue, alpha=0.12))
    c.setStrokeColor(color)
    c.roundRect(x, y, width, 22, 11, fill=1, stroke=1)
    c.setFillColor(color)
    c.drawString(x + pad_x, y + 6, text)
    return width


def bullet(c, text, x, y, width, color=GREEN, size=15):
    c.setFillColor(color)
    c.circle(x + 4, y - 4, 3.4, fill=1, stroke=0)
    return draw_wrapped(c, text, x + 18, y, width - 18, "Helvetica", size, TEXT, size * 1.25)


def talk_card(c, title, body, x, y, w, h, accent=GREEN, size=15):
    rect(c, x, y, w, h, PANEL, LINE, 8)
    rule(c, x + 18, y + h - 26, 80, accent, 3)
    draw_wrapped(c, title, x + 18, y + h - 52, w - 36, "Helvetica-Bold", 18, TEXT)
    draw_wrapped(c, body, x + 18, y + h - 86, w - 36, "Helvetica", size, MUTED, size * 1.25)


def slide_1(c):
    header(c, "Agent Passport", 1, "HACKATHON JUDGE TALK TRACK")
    draw_wrapped(
        c,
        "Runtime identity and delegation verification for AI agents.",
        56,
        H - 168,
        560,
        "Helvetica-Bold",
        22,
        MINT,
        28,
    )
    draw_wrapped(
        c,
        "In this demo, an airline check-in outage is resolved by multiple AI agents. Agent Passport is the trust layer that decides which agent may act, when approval is required, when a scoped secret can be released, and how every action is audited.",
        56,
        H - 226,
        560,
        "Helvetica",
        17,
        MUTED,
        23,
    )
    rect(c, 650, 112, 250, 300, PANEL_2, LINE, 10)
    draw_wrapped(c, "Opening line", 680, 370, 190, "Helvetica-Bold", 19, GREEN)
    draw_wrapped(
        c,
        "Enterprise AI agents should not get production access just because they can reason. They need a passport: identity, runtime, delegation, policy, approval, secrets, and audit in one control plane.",
        680,
        330,
        190,
        "Helvetica",
        16,
        TEXT,
        21,
    )
    pill(c, "5 minute demo", 56, 112, GREEN)
    pill(c, "Judges: security + product story", 170, 112, BLUE)
    pill(c, "Final message: Okta-like IAM for agents", 398, 112, AMBER)


def slide_2(c):
    header(c, "Run of show - 5 minutes", 2)
    items = [
        ("0:00-0:35", "Hook", "Holiday check-in outage. 18,400 passengers affected. 312 departures exposed."),
        ("0:35-1:15", "Why now", "Autonomous agents are useful, but unmanaged production agents are unacceptable."),
        ("1:15-2:30", "Trust layer", "Show workload verification, passport claims, delegation, and policy lane."),
        ("2:30-3:45", "Approval moment", "Firewall rollback is blocked until exact action and target are approved."),
        ("3:45-4:30", "Recovery", "Scoped credential is released, rollback executes, check-in recovers in 12 minutes."),
        ("4:30-5:00", "Close", "Agent Passport is identity, policy, delegation, secrets, and audit for enterprise agents."),
    ]
    positions = [(58, 324), (508, 324), (58, 222), (508, 222), (58, 120), (508, 120)]
    for (time, title, body), (x, y) in zip(items, positions):
        rect(c, x, y, 392, 78, PANEL, LINE, 8)
        draw_wrapped(c, time, x + 18, y + 50, 92, "Helvetica-Bold", 12, GREEN)
        draw_wrapped(c, title, x + 116, y + 50, 210, "Helvetica-Bold", 17, TEXT)
        draw_wrapped(c, body, x + 116, y + 24, 242, "Helvetica", 12, MUTED, 15)
    draw_wrapped(c, "Presenter discipline: keep the live app moving. Point judges to the control plane lane, approval gate, and audit timeline.", 72, 82, 780, "Helvetica-Bold", 14, AMBER, 18)


def slide_3(c):
    header(c, "Opening pitch", 3)
    talk_card(
        c,
        "Say this",
        "It is Thanksgiving Sunday at 05:42 PT. Kiosks, mobile check-in, and bag-drop counters are failing across SEA, JFK, ORD, and ATL. The useful thing is that agents can triage this faster than humans. The dangerous thing is that no enterprise should let unknown agents touch firewall, identity, or operations systems.",
        58,
        206,
        438,
        198,
        GREEN,
        13,
    )
    talk_card(
        c,
        "Show this in the app",
        "Point to the outage facts, presenter mode, affected systems, severity, and business impact. Then say: Agent Passport is the reason these agents can move quickly without bypassing governance.",
        530,
        206,
        410,
        198,
        BLUE,
        14,
    )
    bullet(c, "Do not start with implementation details. Start with operational urgency.", 74, 154, 820, AMBER)
    bullet(c, "Anchor the audience on the product category: IAM and runtime governance for AI agents.", 74, 118, 820, GREEN)
    bullet(c, "Transition line: Now watch every agent prove who it is before it touches a tool.", 74, 82, 820, MINT)


def slide_4(c):
    header(c, "Walkthrough part 1 - identity and delegation", 4)
    steps = [
        ("Detect", "Monitoring Agent detects timeout spike and identity validation failures."),
        ("Verify", "Agent Passport maps SPIFFE workload identity to the registered Monitoring Agent."),
        ("Issue", "A short-lived incident-scoped passport is issued with allowed tools."),
        ("Delegate", "ServiceNow Agent coordinates specialist agents through explicit delegation rules."),
    ]
    x = 58
    for i, (title, body) in enumerate(steps):
        talk_card(c, title, body, x + i * 224, 276, 196, 142, [BLUE, GREEN, MINT, AMBER][i], 13)
    draw_wrapped(
        c,
        "Say this",
        70,
        220,
        200,
        "Helvetica-Bold",
        20,
        GREEN,
    )
    draw_wrapped(
        c,
        "This is the first product moment: the agents are not trusted because they are smart. They are trusted because the runtime is verified, the agent is registered, the passport is short-lived, and delegation is allowed by policy.",
        70,
        186,
        820,
        "Helvetica",
        17,
        TEXT,
        23,
    )
    draw_wrapped(c, "Demo cue: click through presenter mode steps 1-3, then select ServiceNow Agent and one specialist agent in the collaboration panel.", 70, 104, 850, "Helvetica-Bold", 15, AMBER, 20)


def slide_5(c):
    header(c, "Walkthrough part 2 - approval, secret, recovery", 5)
    talk_card(c, "Root cause", "Identity service healthy. Network normal. Airport ops confirms impact. Firewall Agent finds FW-4429 blocking token validation.", 58, 294, 278, 138, BLUE, 12)
    talk_card(c, "Risk gate", "Firewall rollback is a production write. Agent Passport returns require approval instead of allowing autonomous remediation.", 360, 294, 278, 138, AMBER, 12)
    talk_card(c, "Scoped secret", "After approval, a temporary credential is released only for the approved firewall rollback target.", 662, 294, 278, 138, GREEN, 12)
    talk_card(c, "Say this", "This is the core governance moment. The agent found the fix, but Agent Passport controls whether the fix can happen. Approval is bound to the action, target, passport, incident, and non-expired token.", 58, 106, 422, 152, GREEN, 13)
    talk_card(c, "Demo cue", "Click Approve. Then point to: credential release, recovery note, timeout rate dropping from 37 percent to 2 percent, and the final audit event.", 518, 122, 422, 136, MINT, 15)


def slide_6(c):
    header(c, "What judges should notice", 6)
    proof = [
        ("Identity", "Each agent maps from workload identity to registered agent identity."),
        ("Delegation", "ServiceNow can invoke specialists; invalid delegation is denied."),
        ("Policy", "Read actions are allowed; production writes require approval."),
        ("Secrets", "Credential release requires issued, non-expired passport plus approved scope."),
        ("Audit", "Every verification, issuance, tool decision, approval, secret release, and remediation is recorded."),
    ]
    y = H - 154
    for title, body in proof:
        bullet(c, title, 74, y, 120, GREEN, 16)
        draw_wrapped(c, body, 220, y, 620, "Helvetica", 15, MUTED, 19)
        y -= 46
    talk_card(c, "Short answer if asked 'why not OAuth?'", "OAuth usually tells a tool what user or client is authorized. Agent Passport adds agent version, runtime identity, delegation chain, incident scope, policy decision, approval state, credential scope, and audit.", 70, 50, 806, 108, BLUE, 10)


def slide_7(c):
    header(c, "Failure demos and Q&A", 7)
    talk_card(c, "Bad agent", "No passport or unissued token is denied before approval. Say: unknown agents cannot even reach remediation.", 58, 306, 280, 130, RED, 11)
    talk_card(c, "Expired passport", "Expired passports are denied for tool calls and scoped credential release. Say: access is short-lived by design.", 360, 306, 280, 130, AMBER, 11)
    talk_card(c, "Prompt injection", "Suspicious instruction increases risk and requires approval. Say: governance stays visible under adversarial instructions.", 662, 306, 280, 130, BLUE, 11)
    draw_wrapped(c, "Q: Is this real infrastructure?", 70, 250, 320, "Helvetica-Bold", 17, GREEN)
    draw_wrapped(c, "A: It is a mock demo, but the interfaces mirror production controls: registry, SPIFFE-style identity, policy engine, approval, brokered secret, and audit.", 70, 222, 820, "Helvetica", 15, TEXT, 20)
    draw_wrapped(c, "Q: What is missing before production?", 70, 158, 360, "Helvetica-Bold", 17, AMBER)
    draw_wrapped(c, "A: Real JWT signing, persistent audit storage, real 1Password or Vault integration, and deployment-backed workload attestation.", 70, 130, 820, "Helvetica", 15, TEXT, 20)


def slide_8(c):
    header(c, "Close strong", 8)
    talk_card(
        c,
        "Closing script",
        "Agent Passport is the identity, policy, delegation, secrets, and audit control plane for enterprise AI agents. It lets companies move from 'an AI did something' to 'this registered agent, in this trusted runtime, for this incident, with this approval, performed this exact action.'",
        58,
        246,
        496,
        190,
        GREEN,
        16,
    )
    talk_card(
        c,
        "Final product framing",
        "This is Okta-like IAM for agents, but with runtime identity, delegated autonomy, scoped tool use, just-in-time approval, and auditable remediation.",
        594,
        246,
        350,
        190,
        MINT,
        16,
    )
    bullet(c, "Ask judges to remember the approval moment: the agent knows the fix, but Agent Passport decides if it may act.", 76, 180, 820, AMBER)
    bullet(c, "End on business value: faster recovery without accepting ungoverned production agents.", 76, 138, 820, GREEN)
    draw_wrapped(c, "Live demo: http://127.0.0.1:5173/", 76, 82, 650, "Helvetica-Bold", 20, MINT)


def build():
    c = canvas.Canvas(OUT, pagesize=(W, H))
    for fn in [slide_1, slide_2, slide_3, slide_4, slide_5, slide_6, slide_7, slide_8]:
        fn(c)
        c.showPage()
    c.save()


if __name__ == "__main__":
    build()
    print(OUT)
