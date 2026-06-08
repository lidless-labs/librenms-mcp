import { Type } from "@sinclair/typebox";
import type { ClientFactory } from "./_util.ts";
import { jsonToolResult, safeInt } from "./_util.ts";
import { assertConfirmedWrite } from "../gates.ts";

const Schema = Type.Object(
  {
    id: Type.Integer({ minimum: 1, description: "Alert id to unmute." }),
    note: Type.Optional(
      Type.String({
        description:
          "Optional note appended to the alert audit trail (LibreNMS prefixes it with the API user + timestamp).",
      }),
    ),
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
      "Unmute an alert by id via PUT /api/v0/alerts/unmute/{id} (companion to librenms_ack_alert). Tier-2 write; requires confirm:true.",
    parameters: Schema,
    execute: async (_id: string, raw: Record<string, unknown>) => {
      assertConfirmedWrite(raw, NAME);
      const args = raw as { id: number; note?: string };
      const id = safeInt(args.id, "id");
      const client = getClient();
      const body: Record<string, unknown> = {};
      if (args.note !== undefined) body.note = args.note;
      const r = await client.put(`/alerts/unmute/${encodeURIComponent(id)}`, body);
      return jsonToolResult({ alert_id: id, unmuted: true, response: r });
    },
  };
}
