import { Badge } from "@/components/ui/badge";
import { AssignmentStatus } from "@/lib/data";

const STATUS_VARIANT: Record<
  AssignmentStatus,
  "default" | "destructive" | "pending" | "outline"
> = {
  pending: "pending",
  accepted: "default",
  declined: "destructive",
  reassigned: "outline",
};

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  reassigned: "Reassigned",
};

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
