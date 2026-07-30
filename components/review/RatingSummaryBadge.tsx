import { Star } from "lucide-react";

interface RatingSummaryBadgeProps {
  average: number;
  total: number;
}

export function RatingSummaryBadge({ average, total }: RatingSummaryBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <span className="font-semibold">{average ? average.toFixed(1) : "—"}</span>
      <span className="text-muted-foreground">
        ({total} review{total === 1 ? "" : "s"})
      </span>
    </div>
  );
}
