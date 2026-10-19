# HCL Learning Hub MCP Connection Guide

## Purpose

Use this guide to connect Visual Studio Code to the HCL Learning Hub MCP endpoint so administrators can manage courses, authentication settings, and user-role operations from an MCP-capable client.

This guide follows the same two connection patterns documented for IBM DevOps Loop MCP:

- connect by using the VS Code command palette
- connect by editing the workspace MCP configuration file

## Current status

The admin experience now includes **Administration > Integrations > MCP** so the planned MCP surface is visible in-product.

The MCP endpoint itself must be published on the Learning Hub server before external MCP clients can connect. Use a host-specific endpoint such as:

```text
https://<your-hostname>/mcp
```

If your deployment exposes capability-specific MCP endpoints later, replace the URI with the exact endpoint for that capability.

## What the MCP connection is intended to support

Planned administrator-facing MCP tools include:

- course listing
- course creation
- course metadata updates
- moderator assignment
- internal security user management
- role updates
- authentication realm review and updates
- integrations status inspection

Recommended guardrails:

- require administrator authentication
- require administrator authorization for every tool call
- log every MCP action for audit review
- require confirmation for destructive operations

## Prerequisites

Before you connect VS Code:

- install Visual Studio Code
- install an MCP-capable extension or GitHub Copilot MCP support
- obtain the final Learning Hub MCP server URL
- confirm that your browser can reach the Learning Hub sign-in page
- confirm that the signed-in account has administrator access

## Option 1: Connect by using the command palette

1. Open VS Code.
2. Open the workspace that you want to use with the Learning Hub MCP server.
3. Open the command palette.
4. Choose the command that adds or configures an MCP server.
5. Enter the Learning Hub MCP endpoint URL.
6. Choose one of these scopes:
   - **Global**: the MCP server is available to all VS Code workspaces.
   - **Workspace**: the MCP server is available only in the current workspace.
7. If you select **Workspace**, VS Code creates `.vscode/mcp.json` automatically.
8. Start the configured MCP server entry from the VS Code MCP servers UI.
9. When VS Code reports that authentication is required, allow the sign-in flow.
10. When VS Code asks to open an external site, open it.
11. Sign in with your Learning Hub administrator account.
12. Approve the consent prompt.
13. Return to VS Code and confirm that the MCP tools are listed.

## Option 2: Connect by editing `.vscode/mcp.json`

1. Open VS Code.
2. Open the target project folder.
3. Create a `.vscode` folder in the workspace root if it does not already exist.
4. Create a file named `mcp.json` inside `.vscode`.
5. Paste a configuration like this:

```json
{
  "servers": {
    "hcl-learning-hub-mcp": {
      "uri": "https://<your-hostname>/mcp",
      "type": "http"
    }
  },
  "inputs": []
}
```

6. Replace `<your-hostname>` with the Learning Hub hostname or FQDN.
7. Save the file.
8. Open the VS Code extensions or MCP servers view.
9. Find the `hcl-learning-hub-mcp` entry and start it.
10. Allow the browser-based authentication prompt.
11. Sign in and approve access.
12. Return to VS Code and verify that the MCP tool list appears.

## Option 3: Connect Windsurf or VS Code to the local demo MCP over localhost

Use this when you want a local HTTP MCP entry that behaves more like a remote MCP server entry such as DevOps Loop.

1. Open a terminal in the workspace root.
2. Start the localhost MCP demo server:

```bash
npm run mcp:http
```

3. Confirm that the terminal prints a listening message for `http://127.0.0.1:3333/mcp`.
4. Use this workspace MCP configuration:

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

5. Save `.vscode/mcp.json`.
6. Open the MCP servers UI in Windsurf or VS Code.
7. Start `hcl-learning-hub-localhost-mcp`.
8. Verify that the tool list includes these demo tools:
   - `get_deployment_defaults`
   - `list_ai_provider_options`
   - `get_workspace_version`
   - `get_mcp_demo_status`

This localhost demo does not require browser sign-in because it is a development-only server running on your machine.

## Authentication flow

Expect a browser-based sign-in flow similar to the DevOps Loop MCP experience:

- VS Code shows that the MCP server requires authentication.
- VS Code asks to open an external website.
- Your default browser opens the Learning Hub sign-in page.
- After sign-in, you approve access to MCP tools and related APIs.
- VS Code then lists the available MCP tools.

If your session is idle for an extended period, you might be prompted to authenticate again.

## Example workspace layout

```text
<workspace-root>/
  .vscode/
    mcp.json
```

## Troubleshooting

### MCP server does not appear in VS Code

- confirm that `.vscode/mcp.json` is valid JSON
- confirm that the server entry uses the correct `uri`
- confirm that the MCP client extension is installed and enabled

### Browser sign-in does not complete

- confirm that the Learning Hub hostname is reachable from your browser
- confirm that the TLS certificate is trusted by the client machine
- confirm that the authentication realm is configured correctly in the admin panel

### Connected but no tools are listed

- confirm that the MCP endpoint is enabled on the Learning Hub server
- confirm that the signed-in account has administrator permissions
- confirm that server-side MCP capability registration completed successfully

### Session expires unexpectedly

- restart the MCP server entry in VS Code
- repeat the browser sign-in flow
- verify that no proxy or gateway is terminating the session early

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
