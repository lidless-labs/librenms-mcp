import { describe, it, expect, afterEach } from "vitest";
import { startFakeLibreNms, type FakeLibreNms } from "../fake-librenms.ts";
import { LibreNmsClient } from "../../src/librenms-client.ts";
import { createLibrenmsSetMaintenanceTool } from "../../src/tools/librenms_set_maintenance.ts";
import { WriteGateError } from "../../src/gates.ts";

let fake: FakeLibreNms | null = null;
afterEach(async () => {
  if (fake) await fake.close();
  fake = null;
});

function makeTool() {
  return createLibrenmsSetMaintenanceTool(
    () =>
      new LibreNmsClient({
        url: fake!.baseUrl,
        token: "t",
        tlsInsecure: false,
      }),
  );
}

describe("librenms_set_maintenance", () => {
  it("refuses without confirm:true", async () => {
    fake = await startFakeLibreNms([]);
    const tool = makeTool();
    await expect(
      tool.execute("test", { hostname: "sw1.lan", duration: "2h" }),
    ).rejects.toThrow(WriteGateError);
  });

  it("POSTs to /devices/{hostname}/maintenance with duration + optional fields", async () => {
    fake = await startFakeLibreNms([
      {
        method: "POST",
        path: "/api/v0/devices/sw1.lan/maintenance",
        status: 200,
        body: { status: "ok", message: "scheduled" },
      },
    ]);
    const tool = makeTool();
    const r = await tool.execute("test", {
      hostname: "sw1.lan",
      duration: "2h",
      title: "firmware upgrade",
      notes: "rolling reboot",
      confirm: true,
    });
    const payload = JSON.parse(r.content[0].text);
    expect(payload.hostname).toBe("sw1.lan");
    const postReq = fake.requests.find((q) => q.method === "POST");
    expect(postReq?.path).toBe("/api/v0/devices/sw1.lan/maintenance");
    const body = JSON.parse(postReq!.body);
    expect(body.duration).toBe("2h");
    expect(body.title).toBe("firmware upgrade");
    expect(body.notes).toBe("rolling reboot");
  });
});
