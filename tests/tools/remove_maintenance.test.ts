import { describe, it, expect, afterEach } from "vitest";
import { startFakeLibreNms, type FakeLibreNms } from "../fake-librenms.ts";
import { LibreNmsClient } from "../../src/librenms-client.ts";
import { createLibrenmsRemoveMaintenanceTool } from "../../src/tools/librenms_remove_maintenance.ts";
import { WriteGateError } from "../../src/gates.ts";

let fake: FakeLibreNms | null = null;
afterEach(async () => {
  if (fake) await fake.close();
  fake = null;
});

function makeTool() {
  return createLibrenmsRemoveMaintenanceTool(
    () =>
      new LibreNmsClient({
        url: fake!.baseUrl,
        token: "t",
        tlsInsecure: false,
      }),
  );
}

describe("librenms_remove_maintenance", () => {
  it("refuses without confirm:true", async () => {
    fake = await startFakeLibreNms([]);
    const tool = makeTool();
    await expect(
      tool.execute("test", { hostname: "sw1.lan" }),
    ).rejects.toThrow(WriteGateError);
  });

  it("DELETEs /devices/{hostname}/maintenance when confirmed", async () => {
    fake = await startFakeLibreNms([
      {
        method: "DELETE",
        path: "/api/v0/devices/sw1.lan/maintenance",
        status: 200,
        body: { status: "ok", message: "maintenance ended" },
      },
    ]);
    const tool = makeTool();
    const r = await tool.execute("test", {
      hostname: "sw1.lan",
      confirm: true,
    });
    const payload = JSON.parse(r.content[0].text);
    expect(payload.hostname).toBe("sw1.lan");
    expect(payload.maintenance_removed).toBe(true);
    const delReq = fake.requests.find((q) => q.method === "DELETE");
    expect(delReq?.path).toBe("/api/v0/devices/sw1.lan/maintenance");
  });
});
