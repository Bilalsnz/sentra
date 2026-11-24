import { keccak256, toHex, type Address } from "viem";

interface SandboxConfig {
  id: string;
  name: string;
  address: string | undefined;
  kind: string;
  description: string;
  verdict: number;
  category: number;
  expected: string;
}

export interface Sandbox {
  id: string;
  name: string;
  address: Address;
  kind: string;
  description: string;
  verdict: number;
  category: number;
  expected: string;
  evidenceHash: `0x${string}`;
}

function optionalAddress(value: string | undefined): Address | undefined {
  if (!value || value.trim() === "") return undefined;
  if (!/^0x[0-9a-fA-F]{40}$/.test(value.trim())) return undefined;
  return value.trim() as Address;
}

const configs: SandboxConfig[] = [
  {
    id: "clean-vault",
    name: "Clean Vault",
    address: process.env.NEXT_PUBLIC_SANDBOX_CLEAN_VAULT,
    kind: "TEST CONTRACT",
    description:
      "A minimal no-admin interaction contract used to demonstrate a clean sandbox audit.",
    verdict: 0,
    category: 0,
    expected: "NO_FLAGS_FOUND",
  },
  {
    id: "approval-trap",
    name: "Approval Trap",
    address: process.env.NEXT_PUBLIC_SANDBOX_APPROVAL_TRAP,
    kind: "TEST CONTRACT",
    description:
      "A deliberately unsafe test token whose approve() always records an unlimited allowance.",
    verdict: 2,
    category: 1,
    expected: "DANGEROUS",
  },
  {
    id: "honeypot-router",
    name: "Mock Honeypot Router",
    address: process.env.NEXT_PUBLIC_SANDBOX_HONEYPOT_ROUTER,
    kind: "TEST CONTRACT",
    description:
      "A mock router that allows buys and blocks sells. It holds no real value.",
    verdict: 2,
    category: 2,
    expected: "DANGEROUS",
  },
];

export const SANDBOXES: Sandbox[] = configs.flatMap((config) => {
  const address = optionalAddress(config.address);
  if (!address) return [];
  return [
    {
      ...config,
      address,
      evidenceHash: keccak256(toHex(`sentra-sandbox-v1:${config.id}`)),
    },
  ];
});
