import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  tone?: "success" | "warning" | "info" | "danger";
  children: React.ReactNode;
};

export function StatusBadge({ tone = "info", children }: StatusBadgeProps) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" || tone === "danger" ? AlertTriangle : Info;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium",
        tone === "success" && "bg-[#dff1e8] text-[#155d39]",
        tone === "warning" && "bg-[#fff1c9] text-[#775100]",
        tone === "danger" && "bg-[#fae2de] text-[#8a2f24]",
        tone === "info" && "bg-[#e4edf5] text-[#254f78]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
