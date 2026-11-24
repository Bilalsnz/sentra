import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected } from "@wagmi/core";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_SENTRA_CHAIN_ID ?? "56");

export const activeChain = CHAIN_ID === 97 ? bscTestnet : bsc;

export const wagmiConfig = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL || undefined),
    [bscTestnet.id]: http(),
  },
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});
