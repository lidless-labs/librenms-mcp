import { Type } from "@sinclair/typebox";
import type { ClientFactory } from "./_util.ts";
import { jsonToolResult } from "./_util.ts";
import { assertConfirmedWrite } from "../gates.ts";

const DURATION_RE = /^\d+:\d{2}$/;
const START_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

const Schema = Type.Object(
  {
    hostname: Type.String({
      description: "Device hostname or IP as configured in LibreNMS.",
    }),
    duration: Type.String({
      description:
        "Maintenance duration. LibreNMS format `H:i`, e.g. `2:00` for 2 hours or `0:30` for 30 minutes.",
    }),
    title: Type.Optional(
      Type.String({ description: "Maintenance window title." }),
    ),
    notes: Type.Optional(Type.String({ description: "Free-text notes." })),
    start: Type.Optional(
      Type.String({
        description:
          "Start time. LibreNMS format `Y-m-d H:i:00`, e.g. `2026-05-17 14:30:00`. Default: server now.",
      }),
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
      if (!DURATION_RE.test(args.duration)) {
        throw new Error(
          `duration must be H:i format (e.g. "2:00" or "0:30"), got: ${args.duration}`,
        );
      }
      if (args.start && !START_RE.test(args.start)) {
        throw new Error(
          `start must be Y-m-d H:i:00 format (e.g. "2026-05-17 14:30:00"), got: ${args.start}`,
        );
      }
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
