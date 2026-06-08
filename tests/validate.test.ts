import { describe, it, expect } from "vitest";
import { validateToolArgs, ValidationError } from "../src/validate.ts";
import { LibreNmsClient } from "../src/librenms-client.ts";
import { createLibrenmsGetAlertTool } from "../src/tools/librenms_get_alert.ts";
import { createLibrenmsListDevicesTool } from "../src/tools/librenms_list_devices.ts";
import { createLibrenmsListAlertsTool } from "../src/tools/librenms_list_alerts.ts";
import { createLibrenmsGetPortTool } from "../src/tools/librenms_get_port.ts";

const dummy = () =>
  new LibreNmsClient({ url: "http://x", token: "t", tlsInsecure: false });

describe("validateToolArgs", () => {
  it("rejects a string id that would inject into /alerts/{id}", () => {
    const tool = createLibrenmsGetAlertTool(dummy);
    expect(() =>
      validateToolArgs(tool.parameters, tool.name, { id: "1/../system" }),
    ).toThrow(ValidationError);
  });

  it("rejects a non-integer (float) id", () => {
    const tool = createLibrenmsGetPortTool(dummy);
    expect(() =>
      validateToolArgs(tool.parameters, tool.name, { port_id: 1.5 }),
    ).toThrow(ValidationError);
  });

  it("rejects id below the minimum", () => {
    const tool = createLibrenmsGetAlertTool(dummy);
    expect(() =>
      validateToolArgs(tool.parameters, tool.name, { id: 0 }),
    ).toThrow(ValidationError);
  });

  it("rejects an off-enum device type filter", () => {
    const tool = createLibrenmsListDevicesTool(dummy);
    expect(() =>
      validateToolArgs(tool.parameters, tool.name, { type: "all&foo=bar" }),
    ).toThrow(ValidationError);
  });

  it("rejects an off-enum alert state filter", () => {
    const tool = createLibrenmsListAlertsTool(dummy);
    expect(() =>
      validateToolArgs(tool.parameters, tool.name, { state: 9 }),
    ).toThrow(ValidationError);
  });

  it("rejects unknown extra properties (additionalProperties:false)", () => {
    const tool = createLibrenmsGetAlertTool(dummy);
    expect(() =>
      validateToolArgs(tool.parameters, tool.name, { id: 1, evil: "x" }),
    ).toThrow(ValidationError);
  });

  it("error message names the offending tool", () => {
    const tool = createLibrenmsGetAlertTool(dummy);
    try {
      validateToolArgs(tool.parameters, tool.name, { id: "bad" });
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as Error).message).toContain("librenms_get_alert");
    }
  });

  it("accepts valid integer id args", () => {
    const tool = createLibrenmsGetAlertTool(dummy);
    expect(() =>
      validateToolArgs(tool.parameters, tool.name, { id: 42 }),
    ).not.toThrow();
  });

  it("accepts a valid enum device type filter", () => {
    const tool = createLibrenmsListDevicesTool(dummy);
    expect(() =>
      validateToolArgs(tool.parameters, tool.name, { type: "down" }),
    ).not.toThrow();
  });

  it("accepts empty args for an optional-only schema", () => {
    const tool = createLibrenmsListDevicesTool(dummy);
    expect(() =>
      validateToolArgs(tool.parameters, tool.name, {}),
    ).not.toThrow();
  });
});
