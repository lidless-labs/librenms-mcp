import { describe, it, expect, afterEach } from "vitest";
import { startFakeLibreNms, type FakeLibreNms } from "../fake-librenms.ts";
import { LibreNmsClient } from "../../src/librenms-client.ts";
import { createLibrenmsEventLogTool } from "../../src/tools/librenms_event_log.ts";

let fake: FakeLibreNms | null = null;
afterEach(async () => {
  if (fake) await fake.close();
  fake = null;
});

function makeTool() {
  return createLibrenmsEventLogTool(
    () =>
      new LibreNmsClient({
        url: fake!.baseUrl,
        token: "t",
        tlsInsecure: false,
      }),
  );
}

describe("librenms_event_log", () => {
  it("GETs /logs/eventlog with default limit when no device_id", async () => {
    fake = await startFakeLibreNms([
      {
        method: "GET",
        path: "/api/v0/logs/eventlog?limit=25",
        status: 200,
        body: {
          status: "ok",
          logs: [
            { event_id: 1, type: "interface", message: "ifOperStatus changed" },
            { event_id: 2, type: "system", message: "device rebooted" },
          ],
        },
      },
    ]);
    const tool = makeTool();
    const r = await tool.execute("test", {});
    const payload = JSON.parse(r.content[0].text);
    expect(payload.count).toBe(2);
    expect(payload.logs).toHaveLength(2);
    expect(fake.requests[0].path).toBe("/api/v0/logs/eventlog?limit=25");
  });

  it("GETs /logs/eventlog/{device_id} with custom limit when filtered", async () => {
    fake = await startFakeLibreNms([
      {
        method: "GET",
        path: "/api/v0/logs/eventlog/7?limit=10",
        status: 200,
        body: {
          status: "ok",
          logs: [
            { event_id: 99, device_id: 7, message: "port flap" },
          ],
        },
      },
    ]);
    const tool = makeTool();
    const r = await tool.execute("test", { device_id: 7, limit: 10 });
    const payload = JSON.parse(r.content[0].text);
    expect(payload.count).toBe(1);
    expect(fake.requests[0].path).toBe("/api/v0/logs/eventlog/7?limit=10");
  });
});
