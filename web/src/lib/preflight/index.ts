import { loadWebPreflightConfig } from "./config";
import { runPreflight } from "./preflight";
import { createDeps } from "./rpc";
import type { PreflightInput, PreflightReport } from "./types";

export async function runWebPreflight(input: PreflightInput): Promise<PreflightReport> {
  const config = loadWebPreflightConfig();
  return runPreflight(input, createDeps(config), { chainId: config.chainId });
}

export type { PreflightInput, PreflightReport, RiskLevel } from "./types";
