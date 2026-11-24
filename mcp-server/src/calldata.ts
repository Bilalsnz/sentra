import type { CalldataCheck } from "./types.js";

const APPROVE_SELECTOR = "0x095ea7b3";
const SET_APPROVAL_FOR_ALL_SELECTOR = "0xa22cb465";
const UINT256_MAX = (1n << 256n) - 1n;

function emptyCheck(): CalldataCheck {
  return {
    provided: false,
    valid: true,
    selector: null,
    functionName: null,
    unlimitedApproval: false,
    approvalForAll: false,
    decoded: null,
    error: null,
  };
}

function invalidCheck(error: string, selector: string | null = null): CalldataCheck {
  return {
    provided: true,
    valid: false,
    selector,
    functionName: null,
    unlimitedApproval: false,
    approvalForAll: false,
    decoded: null,
    error,
  };
}

function wordAt(args: string, index: number): string {
  return args.slice(index * 64, (index + 1) * 64);
}

function addressFromWord(word: string): string {
  return `0x${word.slice(24)}`;
}

export function analyzeCalldata(input?: string | null): CalldataCheck {
  if (!input || input.trim() === "") return emptyCheck();

  const raw = input.trim().toLowerCase();
  if (!/^0x[0-9a-f]*$/.test(raw)) {
    return invalidCheck("calldata must be 0x-prefixed hexadecimal");
  }

  const hex = raw.slice(2);
  if (hex.length < 8) {
    return invalidCheck("calldata is shorter than a 4-byte selector");
  }
  if (hex.length % 2 !== 0) {
    return invalidCheck("calldata has an odd number of hex characters");
  }

  const selector = `0x${hex.slice(0, 8)}`;
  const args = hex.slice(8);

  if (selector === APPROVE_SELECTOR) {
    if (args.length < 128) {
      return invalidCheck("approve(address,uint256) calldata is missing arguments", selector);
    }
    const spender = addressFromWord(wordAt(args, 0));
    const amount = BigInt(`0x${wordAt(args, 1)}`);
    return {
      provided: true,
      valid: true,
      selector,
      functionName: "approve(address,uint256)",
      unlimitedApproval: amount === UINT256_MAX,
      approvalForAll: false,
      decoded: { spender, amount: amount.toString() },
      error: null,
    };
  }

  if (selector === SET_APPROVAL_FOR_ALL_SELECTOR) {
    if (args.length < 128) {
      return invalidCheck(
        "setApprovalForAll(address,bool) calldata is missing arguments",
        selector,
      );
    }
    const operator = addressFromWord(wordAt(args, 0));
    const approved = BigInt(`0x${wordAt(args, 1)}`) !== 0n;
    return {
      provided: true,
      valid: true,
      selector,
      functionName: "setApprovalForAll(address,bool)",
      unlimitedApproval: false,
      approvalForAll: approved,
      decoded: { operator, approved },
      error: null,
    };
  }

  return {
    provided: true,
    valid: true,
    selector,
    functionName: null,
    unlimitedApproval: false,
    approvalForAll: false,
    decoded: null,
    error: null,
  };
}
