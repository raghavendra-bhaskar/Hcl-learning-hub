# HCL Learning Hub MCP Connection Guide

## Purpose

Use this guide to connect Visual Studio Code to the HCL Learning Hub running on a VM and manage courses from an MCP-capable client.

The workspace MCP configuration launches a local stdio bridge that calls the VM's authenticated `/api` endpoints.

## Current status

The separate remote HTTP MCP endpoint and browser-based OAuth flow are not implemented. Do not configure a guessed `/mcp` URL or port; use the local stdio bridge below. A normal web page at `/mcp` is not an MCP endpoint.

## What the MCP connection is intended to support

Available tools list and read courses, topics, quests, moderators, and course learners; preview an AI-generated course plan; create courses; and add or update weeks, modules, topics, resources, and quests. Delete operations and moderator assignments are not exposed through MCP. The Learning Hub API continues to enforce administrator or course-moderator permissions.

## How the connection works

1. `.vscode/mcp.json` starts `scripts/mcp-course-server.mjs` in a local Node.js process, points it to `http://127.0.0.1:4000`, and prompts for local-account credentials. VS Code exchanges newline-delimited JSON-RPC messages with this process over stdio. Credentials are passed in environment variables, not saved in the config file.
2. The bridge validates the URL. For a VM HTTPS site, it appends `/api` and nginx forwards the request to Express; for the direct local backend at `http://127.0.0.1:4000`, it uses the URL without `/api`. On the first data request it posts credentials to `/auth/local/login` (or `/api/auth/local/login` through nginx) and holds the resulting bearer token in process memory; it retries login once when a request returns 401. This keeps credentials out of tool arguments, but users must use a local Learning Hub account, not Okta SSO.
3. The VM's nginx proxy forwards `/api/` to the Express backend. `server/src/index.ts` mounts `/courses-api` behind `authenticate`; `server/src/middleware/auth.ts` validates the token and resolves the user. `server/src/routes/courses.ts` reads and changes courses via Prisma/PostgreSQL and checks administrator or assigned-moderator permissions for edits. MCP does not bypass these checks.
4. `list_courses` returns course metadata and moderator IDs; `get_course` returns weeks, modules, topics, resources, and a quest count. `list_topics` extracts topics from that course tree; `list_quests` fetches the separate quest route using a course ID. `list_moderators` fetches names and emails and requires an administrator account.
5. `list_course_learners` reads `/manager/all-learners` and returns only learners assigned to or active in the requested course (excluding administrator accounts). Certification status `assigned` is reported as `opted` with 0% completion; started and completed learners retain the API's percentage, calculated from completed quests relative to total course quests. The API restricts results to the current manager's team, while administrators can see all learners. Restart the MCP server after updating its code.

| Requested operation | Current MCP capability | Existing backend support |
| --- | --- | --- |
| List courses, topics, quests, moderators | `list_courses`, `list_topics`, `list_quests`, `list_moderators` | Yes; moderator names require ADMIN |
| List opted and active course learners | `list_course_learners` | MANAGER (own team) or ADMIN; based on certifications and quest progress |
| Add courses | `create_course` | ADMIN only |
| Modify courses | `update_course` | ADMIN or assigned moderator; AI course builder exists separately in the admin UI |
| Add or modify weeks, modules, topics, quests, resources | `create_*`, `update_*` | ADMIN or assigned moderator |
| Delete courses, weeks, modules, topics, quests, resources | Not exposed through MCP | Yes; deleting a course creates a database backup first |
| Add, remove, or replace course moderators | Not exposed through MCP | `GET/PUT /courses-api/:slug/moderators`, ADMIN only; updates replace the whole ID list |
| AI-assisted course editing | `preview_course_builder` generates a reviewable plan from `courseId`, `outline`, and optional `resourceUrls`; it does not save content | Admin-only `POST /ai/course-builder`; review generated topics and verify links before applying them through course editing tools |

The bridge could also expose filtered course search, course summaries, or resource inventories. Keep read-only tools separate from mutations, require explicit confirmation for deletes and moderator changes, and audit privileged requests before opening the MCP endpoint to a network.

## Prerequisites

Before you connect VS Code:

- install Visual Studio Code
- install an MCP-capable extension or GitHub Copilot MCP support
- open this repository as the VS Code workspace
- confirm that your workstation can reach the VM's HTTPS site
- have a Learning Hub local account with administrator or course-moderator permission

## Connect VS Code to the VM

1. Open this repository in VS Code and open the MCP servers view.
2. Start `hcl-learning-hub-mcp` from this workspace's `.vscode/mcp.json`.
3. Confirm `http://127.0.0.1:4000/health` returns `{ "ok": true }`. This workspace is pinned to the direct local backend without an `/api` prefix. To switch to a deployed VM, change `HCL_HUB_API_URL` in `.vscode/mcp.json` to the VM HTTPS site URL and restart MCP; the bridge then adds `/api` automatically.
4. Enter the email and password for a Learning Hub local account when prompted. The password prompt is masked and credentials are not written to `.vscode/mcp.json`.
5. Confirm that the course tools appear. The first tool call signs in to `/api/auth/local/login`; the API checks the account's role and course permissions.

The bridge runs on your workstation, so the VM does not need port `3333` exposed. Loopback HTTP is only for local development; use HTTPS for a remote host. This login method requires a Learning Hub local account; it does not perform Okta or Keycloak browser SSO. The browser authorization and device-code screens for the separate Loop MCP server do not authenticate to Learning Hub.

To support that browser experience for Learning Hub, the VM must first serve a real HTTP MCP endpoint with OAuth protected-resource and authorization-server discovery, a registered OAuth client, token audience and scope validation, and role checks on every course tool. Simply changing `.vscode/mcp.json` to `"type": "http"` cannot enable browser authentication.

## Local demo server

`learning-hub-demo` is a separate read-only demo and cannot update VM courses. To test its HTTP variant manually:

1. Open a terminal in the workspace root.
2. Start the localhost MCP demo server:

```bash
npm run mcp:http
```

3. Confirm that the terminal prints a listening message for `http://127.0.0.1:3333/mcp`.
4. Use this workspace MCP configuration for the demo only:

```json
{
  "servers": {
    "hcl-learning-hub-localhost-mcp": {
      "uri": "http://127.0.0.1:3333/mcp",
      "type": "http"
    }
  },
  "inputs": []
}
```

5. Verify that the tool list includes these demo tools:
   - `get_deployment_defaults`
   - `list_ai_provider_options`
   - `get_workspace_version`
   - `get_mcp_demo_status`

This localhost demo does not require sign-in and has no VM course-management access.

## Example workspace layout

```text
<workspace-root>/
  .vscode/
    mcp.json
```

## Troubleshooting

### MCP server does not appear in VS Code

- confirm that `.vscode/mcp.json` is valid JSON
- confirm that Node.js is installed and the workspace contains `scripts/mcp-course-server.mjs`
- confirm that the MCP client extension is installed and enabled

### A new tool is missing from the current Copilot chat

- the MCP server may already advertise the new tool even when an existing chat retains an older tool catalog; restarting only the server does not necessarily refresh tools attached to that chat
- start a new Copilot chat, enable the refreshed `hcl-learning-hub-mcp` tools in its tool picker, and then call the new tool (for example `list_course_learners` with `slug: "devops-loop"`)
- if it is also missing from a new chat, restart the MCP server from the VS Code MCP servers view and inspect its output for startup errors

### Remote `/mcp` connection reports `file:///undefined` or cannot connect

- remove the remote HTTP MCP entry and use the local stdio bridge above; this application does not serve a remote `/mcp` endpoint
- check that the VM hostname resolves and its HTTPS port is reachable from your workstation
- use the VM's valid HTTPS hostname and trusted certificate; do not bypass TLS certificate checks for credentials

### `list_courses` returns `fetch failed` or `ECONNRESET`

- tool discovery is local and does not prove that `/api/auth/local/login` or `/api/courses-api/` is reachable
- from the same workstation, request `https://<vm-host>/api/health` without credentials; if the TLS handshake resets, check VPN routing, VM ingress/load balancer, HTTPS listener, certificate/SNI, and any security gateway before debugging the MCP code
- if the health endpoint responds, check the VM URL entered in the VS Code prompt, then try a local-account login; an HTTP 401 means invalid credentials, while an HTTP 403 means insufficient course permissions
- restart the MCP server after correcting URL or network settings so it prompts again; never set `NODE_TLS_REJECT_UNAUTHORIZED=0` to work around an untrusted certificate

### Laptop hostname `lp3-ap-51737321` times out

- the Vite frontend listens on port 5173 and the Express API on port 4000; `https://lp3-ap-51737321/` means port 443, which is not listening on this laptop
- for local MCP calls use the configured `HCL_HUB_API_URL` of `http://127.0.0.1:4000` (not `https://lp3-ap-51737321/`); check `http://127.0.0.1:4000/health` returns `{ "ok": true }`
- localhost API routes do not have the `/api` prefix: `http://127.0.0.1:4000/auth/local/login` and `http://127.0.0.1:4000/courses-api/`
- after switching URL, an HTTP 401 means the endpoint is reachable but the entered account is not a Learning Hub local account or its password is incorrect

### Login fails or tool calls return 401

- confirm the URL opens from your workstation and uses the VM's HTTPS hostname
- confirm the account is a local Learning Hub account; Okta SSO credentials are not accepted by this bridge
- restart the MCP server and re-enter the credentials if the local account password changed
- the bridge reauthenticates once after an expired token; if login still fails, restart the server and enter the credentials again
- verify that no proxy or gateway is terminating the session early

### Tool calls return 403

- confirm that the account is an administrator or is assigned as a moderator for that course
- use `list_courses` and `get_course` to retrieve IDs and current content before making updates

## Security notes

- do not expose the MCP endpoint without authentication
- do not hardcode tokens or secrets in `mcp.json`
- prefer HTTPS for all remote MCP connections
- treat MCP tool calls as privileged administrative actions

## Related admin navigation

Use these admin areas when validating MCP-related behavior in the application:

- **Administration > Settings** for course, deployment, learner tracker, and help-session tasks
- **Administration > Authentication** for Okta users, internal security, and realm settings
- **Administration > Integrations > Ollama** for AI provider configuration
- **Administration > Integrations > MCP** for the in-product MCP overview
