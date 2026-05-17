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
      tool.execute("test", { hostname: "sw1.lan", duration: "2:00" }),
    ).rejects.toThrow(WriteGateError);
  });

  it("POSTs to /devices/{hostname}/maintenance with H:i duration + optional fields", async () => {
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
      duration: "2:00",
      title: "firmware upgrade",
      notes: "rolling reboot",
      confirm: true,
    });
    const payload = JSON.parse(r.content[0].text);
    expect(payload.hostname).toBe("sw1.lan");
    const postReq = fake.requests.find((q) => q.method === "POST");
    expect(postReq?.path).toBe("/api/v0/devices/sw1.lan/maintenance");
    const body = JSON.parse(postReq!.body);
    expect(body.duration).toBe("2:00");
    expect(body.title).toBe("firmware upgrade");
    expect(body.notes).toBe("rolling reboot");
  });

  it("rejects duration in legacy '2h' format before the HTTP call", async () => {
    fake = await startFakeLibreNms([]);
    const tool = makeTool();
    await expect(
      tool.execute("test", {
        hostname: "sw1.lan",
        duration: "2h",
        confirm: true,
      }),
    ).rejects.toThrow(/H:i format/);
    expect(fake.requests.length).toBe(0);
  });

  it("rejects ISO-8601 start before the HTTP call", async () => {
    fake = await startFakeLibreNms([]);
    const tool = makeTool();
    await expect(
      tool.execute("test", {
        hostname: "sw1.lan",
        duration: "2:00",
        start: "2026-05-17T14:30:00Z",
        confirm: true,
      }),
    ).rejects.toThrow(/Y-m-d H:i:00 format/);
    expect(fake.requests.length).toBe(0);
  });
});
