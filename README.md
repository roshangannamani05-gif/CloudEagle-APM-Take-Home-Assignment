# AI Governance Dashboard

Node + Express backend with a JSON-file store, serving a single-page dashboard.

## Run locally
    npm install
    npm start        # http://localhost:3000

## API
| Method | Path | Purpose |
|---|---|---|
| GET | /api/state | Full dashboard state |
| PUT | /api/state | Update `cap`, `limits`, `tools` (approve / block) |
| POST | /api/usage | Ingest spend: `{"tool":"Perplexity","department":"Sales","amount":0.4}` ($K). Unknown tools are created as **shadow** AI |
| POST | /api/simulate | Add a random usage event (demo) |
| POST | /api/reset | Restore seed data |
| GET | /api/export.csv | CSV export |

Example feed event:
    curl -X POST localhost:3000/api/usage -H 'Content-Type: application/json' \
      -d '{"tool":"Notion AI","department":"Marketing","amount":0.8}'

## Deploy on Render
Push to GitHub, then Render > New > Blueprint (uses render.yaml) or New > Web Service
(Build: `npm install`, Start: `npm start`).

Note: Render's free tier has an ephemeral disk, so data resets on redeploy or restart.
For durable data, swap the JSON file for Render Postgres (replace load/save in server.js).

## Wiring real sources (see Part 2 of the plan)
Write small adapters that call vendor usage APIs, card or expense feeds, and the identity
provider, then POST each result to /api/usage.
