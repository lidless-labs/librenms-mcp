import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { resolveConfig, type LibreNmsConfig } from "./src/config.ts";
import { LibreNmsClient } from "./src/librenms-client.ts";
import { registerSecret, redact } from "./src/security.ts";
import * as toolFactories from "./src/tools/index.ts";

const cfg: LibreNmsConfig = resolveConfig(process.env);
registerSecret(cfg.token);

const getClient = () => new LibreNmsClient(cfg);

const tools = [
  toolFactories.createLibrenmsStatusTool(getClient),
  toolFactories.createLibrenmsListDevicesTool(getClient),
  toolFactories.createLibrenmsGetDeviceTool(getClient),
  toolFactories.createLibrenmsListPortsTool(getClient),
  toolFactories.createLibrenmsPortHealthTool(getClient),
  toolFactories.createLibrenmsListAlertsTool(getClient),
  toolFactories.createLibrenmsGetAlertTool(getClient),
  toolFactories.createLibrenmsAlertHistoryTool(getClient),
  toolFactories.createLibrenmsAckAlertTool(getClient),
  toolFactories.createLibrenmsSetMaintenanceTool(getClient),
  toolFactories.createLibrenmsGetPortTool(getClient),
  toolFactories.createLibrenmsEventLogTool(getClient),
  toolFactories.createLibrenmsUnmuteAlertTool(getClient),
  toolFactories.createLibrenmsRemoveMaintenanceTool(getClient),
];

const toolMap = new Map(tools.map((t) => [t.name, t]));

const server = new Server({ name: "librenms-mcp", version: "0.2.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.parameters })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const t = toolMap.get(req.params.name);
  if (!t) {
    return { content: [{ type: "text", text: JSON.stringify({ error: `unknown tool: ${req.params.name}` }) }], isError: true };
  }
  try {
    return await t.execute(req.params.name, (req.params.arguments ?? {}) as Record<string, unknown>);
  } catch (e) {
    const msg = redact((e as Error).message) as string;
    return { content: [{ type: "text", text: JSON.stringify({ error: msg }) }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
