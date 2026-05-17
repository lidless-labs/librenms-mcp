import { Type } from "@sinclair/typebox";
import type { ClientFactory } from "./_util.ts";
import { jsonToolResult } from "./_util.ts";
import { assertConfirmedWrite } from "../gates.ts";

const Schema = Type.Object(
  {
    hostname: Type.String({
      description: "Device hostname or IP as configured in LibreNMS.",
    }),
    confirm: Type.Boolean({
      description: "Must be true to write. Tier-2 safe-write gate.",
    }),
  },
  { additionalProperties: false },
);

const NAME = "librenms_remove_maintenance";

export function createLibrenmsRemoveMaintenanceTool(getClient: ClientFactory) {
  return {
    name: NAME,
    label: "librenms: remove maintenance",
    description:
      "End an active device maintenance window early via DELETE /api/v0/devices/{hostname}/maintenance. Tier-2 write; requires confirm:true.",
    parameters: Schema,
    execute: async (_id: string, raw: Record<string, unknown>) => {
      assertConfirmedWrite(raw, NAME);
      const args = raw as { hostname: string };
      const client = getClient();
      await client.delete(
        `/devices/${encodeURIComponent(args.hostname)}/maintenance`,
      );
      return jsonToolResult({
        hostname: args.hostname,
        maintenance_removed: true,
      });
    },
  };
}
