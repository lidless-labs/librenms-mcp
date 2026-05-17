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
  it("refuses without confirm:true and does not call HTTP", async () => {
    fake = await startFakeLibreNms([]);
    const tool = makeTool();
    await expect(tool.execute("test", { id: 42 })).rejects.toThrow(
      WriteGateError,
    );
    expect(fake.requests.length).toBe(0);
  });

  it("PUTs to /alerts/unmute/{id} with empty body when no note", async () => {
    fake = await startFakeLibreNms([
      {
        method: "PUT",
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
    const putReq = fake.requests.find((q) => q.method === "PUT");
    expect(putReq?.path).toBe("/api/v0/alerts/unmute/42");
    const body = JSON.parse(putReq!.body);
    expect(body).toEqual({});
  });

  it("PUTs to /alerts/unmute/{id} with note when provided", async () => {
    fake = await startFakeLibreNms([
      {
        method: "PUT",
        path: "/api/v0/alerts/unmute/42",
        status: 200,
        body: { status: "ok", message: "unmuted" },
      },
    ]);
    const tool = makeTool();
    await tool.execute("test", {
      id: 42,
      note: "false positive, clearing",
      confirm: true,
    });
    const putReq = fake.requests.find((q) => q.method === "PUT");
    const body = JSON.parse(putReq!.body);
    expect(body.note).toBe("false positive, clearing");
  });
});
