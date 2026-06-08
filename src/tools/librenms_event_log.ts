import { Type } from "@sinclair/typebox";
import type { ClientFactory } from "./_util.ts";
import { jsonToolResult, safeInt } from "./_util.ts";

const Schema = Type.Object(
  {
    device_id: Type.Optional(
      Type.Integer({
        minimum: 1,
        description: "Optional device id to scope the event log.",
      }),
    ),
    limit: Type.Optional(
      Type.Integer({
        minimum: 1,
        description: "Max number of log entries. Default 25.",
      }),
    ),
  },
  { additionalProperties: false },
);

export function createLibrenmsEventLogTool(getClient: ClientFactory) {
  return {
    name: "librenms_event_log",
    label: "librenms: event log",
    description:
      "Recent device events via GET /api/v0/logs/eventlog (optionally scoped to a device_id). Covers device up/down, syslog ingestion, etc. Distinct from alertlog.",
    parameters: Schema,
    execute: async (_id: string, raw: Record<string, unknown>) => {
      const args = (raw ?? {}) as { device_id?: number; limit?: number };
      const limit = safeInt(args.limit ?? 25, "limit");
      const path =
        args.device_id !== undefined
          ? `/logs/eventlog/${encodeURIComponent(
              safeInt(args.device_id, "device_id"),
            )}?limit=${encodeURIComponent(limit)}`
          : `/logs/eventlog?limit=${encodeURIComponent(limit)}`;
      const client = getClient();
      const r = await client.get<{
        status: string;
        logs: Array<Record<string, unknown>>;
      }>(path);
      return jsonToolResult({
        count: r.logs?.length ?? 0,
        logs: r.logs ?? [],
      });
    },
  };
}
