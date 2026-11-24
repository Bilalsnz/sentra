#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { runPreflight, TOOL_VERSION } from "./preflight.js";
import { createDeps } from "./rpc.js";

const config = loadConfig();
const deps = createDeps(config);

const server = new McpServer({
  name: "sentra-preflight",
  version: TOOL_VERSION,
});

server.registerTool(
  "sentra_preflight_check",
  {
    title: "Sentra Preflight Check",
    description:
      "Read-only BNB Chain preflight for a contract address and optional calldata. Returns rule-based findings, Sentra attestation counts, and a disclaimer. This tool never signs, sends, or approves transactions, and NO_FLAGS_FOUND is not a safety guarantee. Always leave the transaction decision to the user.",
    inputSchema: {
      target: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/, "target must be a 20-byte hex address")
        .describe("Contract address to check on BNB Chain"),
      calldata: z
        .string()
        .optional()
        .describe("Optional full calldata the agent intends to propose"),
      skillHash: z
        .string()
        .optional()
        .describe("Optional 0x-prefixed 32-byte hash of the SKILL.md being used"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (input) => {
    try {
      const report = await runPreflight(input, deps, { chainId: config.chainId });
      return {
        content: [
          { type: "text", text: JSON.stringify(report, null, 2) },
          { type: "text", text: report.summary },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Sentra preflight failed: ${message}`,
          },
        ],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Sentra MCP server running on stdio");
