import { getAddress, type Address } from "viem";

export interface SentraConfig {
  chainId: number;
  rpcUrl: string;
  registry: Address | null;
  explorerApiUrl: string;
  explorerApiKey: string | null;
}

const DEFAULT_RPC: Record<number, string> = {
  56: "https://bsc-dataseed.binance.org",
  97: "https://data-seed-prebsc-1-s1.binance.org:8545",
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SentraConfig {
  const chainId = Number(env.BSC_CHAIN_ID?.trim() || "56");
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("BSC_CHAIN_ID must be a positive integer");
  }

  const rpcUrl = env.BSC_RPC_URL?.trim() || DEFAULT_RPC[chainId];
  if (!rpcUrl) {
    throw new Error(`BSC_RPC_URL is required for chain ${chainId}`);
  }

  const registryRaw = env.SENTRA_REGISTRY?.trim();
  const registry = registryRaw ? getAddress(registryRaw) : null;
  const explorerApiUrl =
    env.BSCSCAN_API_URL?.trim() || "https://api.etherscan.io/v2/api";
  const explorerApiKey = env.BSCSCAN_API_KEY?.trim() || null;

  return { chainId, rpcUrl, registry, explorerApiUrl, explorerApiKey };
}
