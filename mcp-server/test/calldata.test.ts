import test from "node:test";
import assert from "node:assert/strict";
import { analyzeCalldata } from "../src/calldata.js";

const MAX_UINT256 = (1n << 256n) - 1n;

function padAddress(address: string): string {
  return address.slice(2).toLowerCase().padStart(64, "0");
}

function padUint(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

test("empty calldata is not provided and not flagged", () => {
  const result = analyzeCalldata(undefined);
  assert.equal(result.provided, false);
  assert.equal(result.valid, true);
  assert.equal(result.unlimitedApproval, false);
  assert.equal(result.approvalForAll, false);
});

test("approve with uint256 max is flagged as unlimited", () => {
  const data =
    "0x095ea7b3" +
    padAddress("0x1111111111111111111111111111111111111111") +
    padUint(MAX_UINT256);
  const result = analyzeCalldata(data);
  assert.equal(result.valid, true);
  assert.equal(result.functionName, "approve(address,uint256)");
  assert.equal(result.unlimitedApproval, true);
  assert.deepEqual(result.decoded, {
    spender: "0x1111111111111111111111111111111111111111",
    amount: MAX_UINT256.toString(),
  });
});

test("approve with a finite amount is decoded but not flagged as unlimited", () => {
  const data =
    "0x095ea7b3" +
    padAddress("0x2222222222222222222222222222222222222222") +
    padUint(1_000_000n);
  const result = analyzeCalldata(data);
  assert.equal(result.valid, true);
  assert.equal(result.unlimitedApproval, false);
  assert.deepEqual(result.decoded, {
    spender: "0x2222222222222222222222222222222222222222",
    amount: "1000000",
  });
});

test("setApprovalForAll true is flagged, false is not", () => {
  const operator = padAddress("0x3333333333333333333333333333333333333333");
  const enabled = analyzeCalldata("0xa22cb465" + operator + padUint(1n));
  assert.equal(enabled.approvalForAll, true);
  assert.deepEqual(enabled.decoded, {
    operator: "0x3333333333333333333333333333333333333333",
    approved: true,
  });

  const disabled = analyzeCalldata("0xa22cb465" + operator + padUint(0n));
  assert.equal(disabled.approvalForAll, false);
  assert.deepEqual(disabled.decoded, {
    operator: "0x3333333333333333333333333333333333333333",
    approved: false,
  });
});

test("malformed calldata is reported as invalid", () => {
  assert.equal(analyzeCalldata("not-hex").valid, false);
  assert.equal(analyzeCalldata("0x").valid, false);
  assert.equal(analyzeCalldata("0x095ea7b3").valid, false);
  assert.equal(analyzeCalldata("0x095ea7b3zz").valid, false);
});

test("unknown selectors are valid but not decoded", () => {
  const result = analyzeCalldata("0xdeadbeef");
  assert.equal(result.valid, true);
  assert.equal(result.selector, "0xdeadbeef");
  assert.equal(result.functionName, null);
  assert.equal(result.unlimitedApproval, false);
  assert.equal(result.approvalForAll, false);
});
