import { getAddress, type Address } from "viem";

export interface WebPreflightConfig {
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

function safeAddress(value: string | undefined): Address | null {
  if (!value || value.trim() === "") return null;
  try {
    return getAddress(value.trim());
  } catch {
    return null;
  }
}

export function loadWebPreflightConfig(env: NodeJS.ProcessEnv = process.env): WebPreflightConfig {
  const chainId = Number(
    env.BSC_CHAIN_ID?.trim() || env.NEXT_PUBLIC_SENTRA_CHAIN_ID?.trim() || "56",
  );
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("BSC_CHAIN_ID must be a positive integer");
  }

  const rpcUrl = env.BSC_RPC_URL?.trim() || DEFAULT_RPC[chainId];
  if (!rpcUrl) throw new Error(`BSC_RPC_URL is required for chain ${chainId}`);

  return {
    chainId,
    rpcUrl,
    registry: safeAddress(env.SENTRA_REGISTRY || env.NEXT_PUBLIC_SENTRA_REGISTRY),
    explorerApiUrl: env.BSCSCAN_API_URL?.trim() || "https://api.etherscan.io/v2/api",
    explorerApiKey: env.BSCSCAN_API_KEY?.trim() || null,
  };
}
