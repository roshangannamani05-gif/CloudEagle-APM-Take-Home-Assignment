# AI Governance Dashboard: APM Take-Home

**Live demo:** https://YOUR-APP.onrender.com  (free tier sleeps when idle; first load can take ~1 minute)

A single-screen dashboard that shows a CFO or IT/security lead how much the organization spends on AI tools, who is spending it, and whether usage stays inside approved limits, including tools nobody approved ("Shadow AI").

All figures in the demo are illustrative sample data.

---

## Part 1: Prototype

Working prototype: Node + Express backend with a REST API, and a single-page dashboard.

What you can do in the demo:
- Filter by department (dropdown or click a bar). KPIs and all charts recalculate.
- Edit the company cap and department limits. Alerts and the forecast update immediately.
- Approve or block a shadow tool from the "Needs attention" table.
- Click **Simulate usage** to send a usage event through the API and watch the dashboard update.
- Export the current data as CSV.

Layout: KPI tiles (spend vs cap, shadow spend, departments over limit, open alerts), three charts, then an action table. The screen answers "are we within limits?" first, then "what should I do about it?"

---

## Part 2: API and data source plan

No single system shows all AI usage, so the plan layers three kinds of sources, from most to least reliable.

### Layer 1: Spend (source of truth for cost and limits)

| Source | Examples | What it gives us |
|---|---|---|
| Corporate card and spend management | Volopay, Ramp, Brex APIs | Every AI charge, cardholder, department, merchant. The only source that catches tools nobody reported |
| Accounting / ERP | NetSuite, QuickBooks, Xero APIs | Invoiced and annual AI contracts that never hit a card |
| Budgets and limits | Budget or card-limit objects in the spend tool | Department limits and company cap |

### Layer 2: Usage (who is using what)

| Source | Examples | What it gives us |
|---|---|---|
| AI vendor admin APIs | OpenAI usage and costs API, Anthropic Admin usage and cost API, GitHub Copilot metrics API, Microsoft 365 Copilot usage reports (Graph), Google Workspace Admin SDK Reports API | Per-user and per-team seats, tokens, and cost for approved tools |
| Identity provider | Okta, Microsoft Entra ID, Google Workspace (SSO logs, OAuth grants, SCIM groups) | Who signs in to which AI app, plus the user-to-department mapping |
| HRIS (optional) | Workday, BambooHR | Reliable department and manager hierarchy |

### Layer 3: Discovery (find what nobody reported)

| Source | Examples | What it gives us |
|---|---|---|
| SaaS management / CASB / network logs | Zylo, Netskope, Zscaler, DNS or proxy logs | AI domains in use that appear in no other source |
| Browser extension | Company-managed extension | Direct usage signals on AI sites |
| Email receipts | Parse AI vendor invoices from a finance mailbox | Catches small unreported subscriptions |

### How it fits together

1. **Approved-tool registry (owned by us):** tool, owner, department, monthly limit, approval status, data classification. A charge or login from a tool not in this registry becomes **Shadow AI**. This table turns raw feeds into governance.
2. **Ingestion:** small adapters per source normalize data into one event: `{tool, department, amount, date, source}`. In the prototype this is `POST /api/usage`.
3. **Refresh cadence:** spend feeds daily, vendor usage APIs hourly or daily, discovery weekly. Dashboards do not need real time.
4. **Key joins:** user to department through the IdP or HRIS; merchant name to tool through a mapping table (for example, "OPENAI *CHATGPT" to ChatGPT).

### Phasing

- **MVP:** spend feed + IdP + the two or three biggest vendor APIs + the registry.
- **Phase 2:** discovery (CASB or browser extension) and HRIS sync.
- **Phase 3:** per-user and per-project attribution and automated enforcement (pause card, revoke seat).

### Risks and open questions
- Merchant names on cards are messy, so the mapping table needs ongoing curation.
- Some vendors expose cost only at the organization level, not per user, so allocation needs a rule (seat-based split).
- Usage data about employees needs a clear privacy and access policy. Dashboards should show aggregate data to finance and detail only to admins.

---

## Part 3: The three charts

If I could only show three, I would choose these. Together they answer **who** (department), **when** (trend and forecast) and **what** (tool and approval status).

1. **Spend vs limit by department (bar with a limit tick).**
   The core CFO question is "who is over or near their limit?" Putting the limit on the same axis as spend means no one has to do arithmetic. Bars turn red when over, and the label says OVER, so it never relies on color alone.

2. **Monthly spend vs company cap, with forecast.**
   AI spend is growing fast, so "where are we now" is not enough. The forecast line shows when the cap will be hit, which turns a status report into a decision: raise the cap, or intervene.

3. **Spend by tool, split approved vs shadow.**
   This is the governance view. It answers "how much is happening outside policy?" and tells IT or security which tools to approve, consolidate or block. It also reveals duplicate tools doing the same job.

**What I left out on purpose:** per-user leaderboards, token counts and login counts. They help admins investigate, but they do not help a CFO decide. They belong in a drill-down, not on the main screen.

---

## Run locally

```bash
npm install
npm start        # http://localhost:3000
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | /api/state | Full dashboard state |
| PUT | /api/state | Update `cap`, `limits`, `tools` (approve or block) |
| POST | /api/usage | Ingest spend: `{"tool":"Perplexity","department":"Sales","amount":0.4}` ($K). Unknown tools are created as shadow AI |
| POST | /api/simulate | Add a random usage event (demo) |
| POST | /api/reset | Restore seed data |
| GET | /api/export.csv | CSV export |

## Deploy (Render)

Render > New > Blueprint > select this repo (uses `render.yaml`).

Limitation: data lives in a JSON file on Render's free tier, which resets on restart or redeploy. A production version would use Postgres.

## What I would build next
- Real connectors for the Layer 1 and Layer 2 sources above
- SSO and role-based access (finance sees totals, admins see users)
- Alert delivery (Slack or email) and one-click enforcement
- Postgres for persistence and history
