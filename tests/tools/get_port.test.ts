import { describe, it, expect, afterEach } from "vitest";
import { startFakeLibreNms, type FakeLibreNms } from "../fake-librenms.ts";
import { LibreNmsClient } from "../../src/librenms-client.ts";
import { createLibrenmsGetPortTool } from "../../src/tools/librenms_get_port.ts";

let fake: FakeLibreNms | null = null;
afterEach(async () => {
  if (fake) await fake.close();
  fake = null;
});

function makeTool() {
  return createLibrenmsGetPortTool(
    () =>
      new LibreNmsClient({
        url: fake!.baseUrl,
        token: "t",
        tlsInsecure: false,
      }),
  );
}

describe("librenms_get_port", () => {
  it("GETs /ports/{port_id} and returns port[0]", async () => {
    fake = await startFakeLibreNms([
      {
        method: "GET",
        path: "/api/v0/ports/123",
        status: 200,
        body: {
          status: "ok",
          port: [
            {
              port_id: 123,
              ifName: "GigabitEthernet1/0/1",
              ifAdminStatus: "up",
              ifOperStatus: "up",
              ifInErrors: 0,
              ifOutErrors: 0,
              ifSpeed: 1000000000,
            },
          ],
        },
      },
    ]);
    const tool = makeTool();
    const r = await tool.execute("test", { port_id: 123 });
    const payload = JSON.parse(r.content[0].text);
    expect(payload.port).not.toBeNull();
    expect(payload.port.port_id).toBe(123);
    expect(payload.port.ifName).toBe("GigabitEthernet1/0/1");
    expect(fake.requests[0].method).toBe("GET");
    expect(fake.requests[0].path).toBe("/api/v0/ports/123");
  });
});
