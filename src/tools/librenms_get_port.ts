import { Type } from "@sinclair/typebox";
import type { ClientFactory } from "./_util.ts";
import { jsonToolResult, safeInt } from "./_util.ts";

const Schema = Type.Object(
  {
    port_id: Type.Integer({
      minimum: 1,
      description:
        "LibreNMS internal port id (from librenms_list_ports response rows).",
    }),
  },
  { additionalProperties: false },
);

export function createLibrenmsGetPortTool(getClient: ClientFactory) {
  return {
    name: "librenms_get_port",
    label: "librenms: get port",
    description:
      "Single-port detail via GET /api/v0/ports/{port_id}. Returns full column set (admin/oper state, traffic + error counters, ifAlias, etc.).",
    parameters: Schema,
    execute: async (_id: string, raw: Record<string, unknown>) => {
      const args = raw as { port_id: number };
      const portId = safeInt(args.port_id, "port_id");
      const client = getClient();
      const r = await client.get<{
        status: string;
        port: Array<Record<string, unknown>>;
      }>(`/ports/${encodeURIComponent(portId)}`);
      return jsonToolResult({ port: r.port?.[0] ?? null });
    },
  };
}
