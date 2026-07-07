import { Badge } from "@/components/ui/badge";
import { TripStatus } from "@/lib/data";

const STATUS_VARIANT: Record<TripStatus, "default" | "destructive" | "pending" | "outline"> = {
  "not-started": "outline",
  "in-progress": "pending",
  completed: "default",
  cancelled: "destructive",
};

const STATUS_LABEL: Record<TripStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
