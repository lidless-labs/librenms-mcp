import { describe, it, expect, afterEach } from "vitest";
import { startFakeLibreNms, type FakeLibreNms } from "../fake-librenms.ts";
import { LibreNmsClient } from "../../src/librenms-client.ts";
import { createLibrenmsUnmuteAlertTool } from "../../src/tools/librenms_unmute_alert.ts";
import { WriteGateError } from "../../src/gates.ts";

let fake: FakeLibreNms | null = null;
afterEach(async () => {
  if (fake) await fake.close();
  fake = null;
});

function makeTool() {
  return createLibrenmsUnmuteAlertTool(
    () =>
      new LibreNmsClient({
        url: fake!.baseUrl,
        token: "t",
        tlsInsecure: false,
      }),
  );
}

describe("librenms_unmute_alert", () => {
  it("refuses without confirm:true", async () => {
    fake = await startFakeLibreNms([]);
    const tool = makeTool();
    await expect(tool.execute("test", { id: 42 })).rejects.toThrow(
      WriteGateError,
    );
  });

  it("POSTs to /alerts/unmute/{id} with empty body when confirmed", async () => {
    fake = await startFakeLibreNms([
      {
        method: "POST",
        path: "/api/v0/alerts/unmute/42",
        status: 200,
        body: { status: "ok", message: "unmuted" },
      },
    ]);
    const tool = makeTool();
    const r = await tool.execute("test", { id: 42, confirm: true });
    const payload = JSON.parse(r.content[0].text);
    expect(payload.alert_id).toBe(42);
    expect(payload.unmuted).toBe(true);
    const postReq = fake.requests.find((q) => q.method === "POST");
    expect(postReq?.path).toBe("/api/v0/alerts/unmute/42");
    const body = JSON.parse(postReq!.body);
    expect(body).toEqual({});
  });
});
