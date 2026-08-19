import { BookOpen, CheckCircle2, CircleAlert } from "lucide-react";
import type { VerificationStatus } from "../types";

const statusLabels: Record<VerificationStatus, string> = {
  codex_verified: "Codex確認済み",
  self: "本人編集",
  needs_review: "要確認",
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  const Icon = status === "codex_verified" ? CheckCircle2 : status === "needs_review" ? CircleAlert : BookOpen;
  return (
    <span className={`status-badge status-${status}`}>
      <Icon aria-hidden="true" size={14} />
      {statusLabels[status]}
    </span>
  );
}
