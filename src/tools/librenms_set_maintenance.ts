import { Type } from "@sinclair/typebox";
import type { ClientFactory } from "./_util.ts";
import { jsonToolResult } from "./_util.ts";
import { assertConfirmedWrite } from "../gates.ts";

const Schema = Type.Object(
  {
    hostname: Type.String({
      description: "Device hostname or IP as configured in LibreNMS.",
    }),
    duration: Type.String({
      description:
        "Maintenance duration, e.g. '2h', '30m'. Format: '<N>h' or '<N>m'.",
    }),
    title: Type.Optional(
      Type.String({ description: "Maintenance window title." }),
    ),
    notes: Type.Optional(Type.String({ description: "Free-text notes." })),
    start: Type.Optional(
      Type.String({ description: "ISO start time. Default: now." }),
    ),
    confirm: Type.Boolean({
      description: "Must be true to write. Tier-2 safe-write gate.",
    }),
  },
  { additionalProperties: false },
);

const NAME = "librenms_set_maintenance";

export function createLibrenmsSetMaintenanceTool(getClient: ClientFactory) {
  return {
    name: NAME,
    label: "librenms: set maintenance",
    description:
      "Put a device into a maintenance window (suppresses alerts) via POST /api/v0/devices/{hostname}/maintenance. Tier-2 write; requires confirm:true.",
    parameters: Schema,
    execute: async (_id: string, raw: Record<string, unknown>) => {
      assertConfirmedWrite(raw, NAME);
      const args = raw as {
        hostname: string;
        duration: string;
        title?: string;
        notes?: string;
        start?: string;
      };
      const client = getClient();
      const body: Record<string, unknown> = { duration: args.duration };
      if (args.title) body.title = args.title;
      if (args.notes) body.notes = args.notes;
      if (args.start) body.start = args.start;
      const r = await client.post(
        `/devices/${encodeURIComponent(args.hostname)}/maintenance`,
        body,
      );
      return jsonToolResult({ hostname: args.hostname, maintenance: r });
    },
  };
}
