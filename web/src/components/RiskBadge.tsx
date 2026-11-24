import type { RiskLevel } from "@/lib/preflight";

const LABELS: Record<RiskLevel, string> = {
  NO_FLAGS_FOUND: "No flags found",
  CAUTION: "Caution",
  HIGH_RISK: "High risk",
  UNRATED: "Unrated",
};

export default function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`risk-badge risk-${level.toLowerCase()}`}>
      <span className="risk-dot" aria-hidden="true" />
      {LABELS[level]}
    </span>
  );
}
