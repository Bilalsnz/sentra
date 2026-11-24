import {
  createPublicClient,
  decodeFunctionResult,
  encodeFunctionData,
  http,
  parseAbi,
  type Hex,
} from "viem";
import { bsc, bscTestnet } from "viem/chains";
import type { WebPreflightConfig } from "./config";
import type { AttestationCounts, PreflightDeps, SourceCheck } from "./types";

const registryAbi = parseAbi([
  "function getTargetStats(address target) view returns (uint256 noFlagsFound, uint256 warning, uint256 dangerous, uint256 uniqueAttesters, uint256 totalAttestations)",
]);

interface ExplorerEntry {
  SourceCode?: string;
  ContractName?: string;
  Proxy?: string;
}

interface ExplorerResponse {
  status?: string;
  message?: string;
  result?: ExplorerEntry[] | string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function checkSourceVerified(
  target: `0x${string}`,
  config: WebPreflightConfig,
): Promise<SourceCheck> {
  if (!config.explorerApiKey) {
    return {
      available: false,
      verified: null,
      isProxy: false,
      contractName: null,
      error: "BSCSCAN_API_KEY is not configured",
    };
  }

  try {
    const url = new URL(config.explorerApiUrl);
    url.searchParams.set("chainid", String(config.chainId));
    url.searchParams.set("module", "contract");
    url.searchParams.set("action", "getsourcecode");
    url.searchParams.set("address", target);
    url.searchParams.set("apikey", config.explorerApiKey);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      return {
        available: false,
        verified: null,
        isProxy: false,
        contractName: null,
        error: `explorer returned HTTP ${response.status}`,
      };
    }

    const body = (await response.json()) as ExplorerResponse;
    if (body.status !== "1" || !Array.isArray(body.result)) {
      return {
        available: false,
        verified: null,
        isProxy: false,
        contractName: null,
        error: body.message || "explorer request failed",
      };
    }

    const entry = body.result[0] ?? {};
    const source = typeof entry.SourceCode === "string" ? entry.SourceCode.trim() : "";

    return {
      available: true,
      verified: source.length > 0,
      isProxy: entry.Proxy === "1",
      contractName: entry.ContractName || null,
      error: null,
    };
  } catch (error) {
    return {
      available: false,
      verified: null,
      isProxy: false,
      contractName: null,
      error: errorMessage(error),
    };
  }
}

export function createDeps(config: WebPreflightConfig): PreflightDeps {
  const client = createPublicClient({
    chain: config.chainId === 97 ? bscTestnet : bsc,
    transport: http(config.rpcUrl, { timeout: 15_000, retryCount: 1 }),
  });

  const unavailable = (error: string): AttestationCounts => ({
    available: false,
    registry: config.registry,
    uniqueAttesters: 0,
    noFlagsFound: 0,
    warning: 0,
    dangerous: 0,
    totalAttestations: 0,
    error,
  });

  return {
    async getCode(address) {
      return (await client.getCode({ address })) ?? "0x";
    },

    async getStorageAt(address, slot: Hex) {
      return (await client.getStorageAt({ address, slot })) ?? "0x";
    },

    async ethCall(to, data) {
      try {
        const result = await client.call({ to, data });
        return result.data ?? null;
      } catch {
        return null;
      }
    },

    async getAttestationCounts(target) {
      if (!config.registry) {
        return unavailable("SENTRA_REGISTRY is not configured");
      }

      try {
        const data = encodeFunctionData({
          abi: registryAbi,
          functionName: "getTargetStats",
          args: [target],
        });
        const result = await client.call({ to: config.registry, data });
        if (!result.data || result.data === "0x") {
          return unavailable("registry returned empty data");
        }

        const [
          noFlagsFound,
          warning,
          dangerous,
          uniqueAttesters,
          totalAttestations,
        ] = decodeFunctionResult({
          abi: registryAbi,
          functionName: "getTargetStats",
          data: result.data,
        });

        return {
          available: true,
          registry: config.registry,
          uniqueAttesters: Number(uniqueAttesters),
          noFlagsFound: Number(noFlagsFound),
          warning: Number(warning),
          dangerous: Number(dangerous),
          totalAttestations: Number(totalAttestations),
        };
      } catch (error) {
        return unavailable(errorMessage(error));
      }
    },

    async checkSource(target) {
      return checkSourceVerified(target, config);
    },
  };
}
