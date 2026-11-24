import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import CopyButton from "@/components/CopyButton";
import { REGISTRY_ADDRESS } from "@/lib/contracts";

export const metadata: Metadata = {
  title: "Integration",
};

const skillText = readFileSync(
  path.join(process.cwd(), "public", "sentra-preflight-SKILL.md"),
  "utf8",
);

const mcpConfig = JSON.stringify(
  {
    mcpServers: {
      sentra: {
        command: "node",
        args: ["/absolute/path/to/sentra/mcp-server/dist/index.js"],
        env: {
          BSC_CHAIN_ID: "56",
          BSC_RPC_URL: "https://bsc-dataseed.binance.org",
          SENTRA_REGISTRY: REGISTRY_ADDRESS ?? "0x<deployed registry address>",
        },
      },
    },
  },
  null,
  2,
);

export default function IntegrationPage() {
  return (
    <main>
      <section className="page-head">
        <p className="eyebrow">Integration</p>
        <h1>Give an agent a read-only preflight.</h1>
        <p className="lead">
          Build the MCP server, add the read-only tool to an MCP client, and attach the
          skill instructions. The tool returns findings and attestation counts. It never
          signs, sends, or approves.
        </p>
      </section>

      <div className="notice">
        The tool is advisory. The user must verify every detail and confirm every
        transaction in their wallet.
      </div>

      <section className="panel stack">
        <div className="section-head">
          <div>
            <h2>1. Build the server</h2>
            <p className="muted">Run from the repository root.</p>
          </div>
        </div>
        <div className="code-block">
          <div className="code-head">
            <span className="mono">shell</span>
            <CopyButton value={"cd mcp-server\nnpm install\nnpm run build"} />
          </div>
          <pre className="code">{`cd mcp-server
npm install
npm run build`}</pre>
        </div>

        <div className="section-head">
          <div>
            <h2>2. Add the MCP server</h2>
            <p className="muted">
              Use the absolute path to the built entry point. Set the registry address
              after deployment.
            </p>
          </div>
          <CopyButton value={mcpConfig} label="Copy config" />
        </div>
        <pre className="code">{mcpConfig}</pre>

        <div className="section-head">
          <div>
            <h2>3. Attach the skill</h2>
            <p className="muted">
              The skill tells the agent when to call the tool, how to read the result, and
              which actions are forbidden.
            </p>
          </div>
          <div className="row">
            <a className="btn small ghost" href="/sentra-preflight-SKILL.md" download>
              Download
            </a>
            <CopyButton value={skillText} label="Copy skill" />
          </div>
        </div>
        <pre className="code skill">{skillText}</pre>

        <div className="section-head">
          <div>
            <h2>Environment</h2>
            <p className="muted">
              The server reads configuration from the local environment. It does not
              collect or transmit secrets.
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Required</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>BSC_CHAIN_ID</code></td>
                <td>No</td>
                <td>56 for mainnet, 97 for testnet.</td>
              </tr>
              <tr>
                <td><code>BSC_RPC_URL</code></td>
                <td>No</td>
                <td>JSON-RPC endpoint. A public default is used.</td>
              </tr>
              <tr>
                <td><code>SENTRA_REGISTRY</code></td>
                <td>Recommended</td>
                <td>Registry address. Reports UNRATED when empty.</td>
              </tr>
              <tr>
                <td><code>BSCSCAN_API_KEY</code></td>
                <td>No</td>
                <td>Optional local key for the source-verification check.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="guarantees">
          <h2>Read-only boundaries</h2>
          <ul className="rules">
            <li>No signing, sending, or approving code.</li>
            <li>No seed phrases, private keys, or wallet passwords.</li>
            <li>No QR login, pairing codes, or server-stored sessions.</li>
            <li>No Agent ID lookup by handle or name. Only balanceOf is read.</li>
            <li>NO_FLAGS_FOUND is not a safety guarantee.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
