import { serve } from "./mcp-server.ts";

serve().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`librenms-mcp fatal: ${msg}`);
  process.exit(1);
});
