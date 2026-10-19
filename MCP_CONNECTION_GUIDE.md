# HCL Learning Hub MCP Connection Guide

## Purpose

Use this guide to connect Visual Studio Code to the HCL Learning Hub running on a VM and manage courses from an MCP-capable client.

The workspace MCP configuration launches a local stdio bridge that calls the VM's authenticated `/api` endpoints.

## Current status

The separate remote HTTP MCP endpoint and browser-based OAuth flow are not implemented. Do not configure a guessed `/mcp` URL or port; use the local stdio bridge below. A normal web page at `/mcp` is not an MCP endpoint.

## What the MCP connection is intended to support

Available tools list and read courses, create courses, and add or update weeks, modules, topics, resources, and quests. Delete operations are not exposed. The Learning Hub API continues to enforce administrator or course-moderator permissions.

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
3. Enter the VM URL when prompted. The default is `https://blmycldtl596461.nonprod.hclpnp.com`; the bridge adds `/api` automatically.
4. Enter the email and password for a Learning Hub local account. The password prompt is masked and credentials are not written to `.vscode/mcp.json`.
5. Confirm that the course tools appear. The first tool call signs in to `/api/auth/local/login`; the API checks the account's role and course permissions.

The bridge runs on your workstation, so the VM does not need port `3333` exposed. This login method requires a Learning Hub local account; it does not perform Okta or Keycloak browser SSO. The browser authorization and device-code screens for the separate Loop MCP server do not authenticate to Learning Hub.

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

### Remote `/mcp` connection reports `file:///undefined` or cannot connect

- remove the remote HTTP MCP entry and use the local stdio bridge above; this application does not serve a remote `/mcp` endpoint
- check that the VM hostname resolves and its HTTPS port is reachable from your workstation
- use the VM's valid HTTPS hostname and trusted certificate; do not bypass TLS certificate checks for credentials

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
