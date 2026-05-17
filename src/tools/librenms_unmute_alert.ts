import { Type } from "@sinclair/typebox";
import type { ClientFactory } from "./_util.ts";
import { jsonToolResult } from "./_util.ts";
import { assertConfirmedWrite } from "../gates.ts";

const Schema = Type.Object(
  {
    id: Type.Integer({ minimum: 1, description: "Alert id to unmute." }),
    confirm: Type.Boolean({
      description: "Must be true to write. Tier-2 safe-write gate.",
    }),
  },
  { additionalProperties: false },
);

const NAME = "librenms_unmute_alert";

export function createLibrenmsUnmuteAlertTool(getClient: ClientFactory) {
  return {
    name: NAME,
    label: "librenms: unmute alert",
    description:
      "Unmute an alert by id via POST /api/v0/alerts/unmute/{id} (companion to librenms_ack_alert). Tier-2 write; requires confirm:true.",
    parameters: Schema,
    execute: async (_id: string, raw: Record<string, unknown>) => {
      assertConfirmedWrite(raw, NAME);
      const args = raw as { id: number };
      const client = getClient();
      const r = await client.post(`/alerts/unmute/${args.id}`, {});
      return jsonToolResult({ alert_id: args.id, unmuted: true, response: r });
    },
  };
}
