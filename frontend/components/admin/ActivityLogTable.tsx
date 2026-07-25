import { ScrollText } from "lucide-react";
import { ActivityLogEntry, PopulatedAccountSummary } from "@/lib/data";
import {
  AdminStatusBadge,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
  EmptyState,
} from "@/components/admin/ui";

function asAccount(value: unknown): PopulatedAccountSummary | null {
  return value && typeof value === "object" ? (value as PopulatedAccountSummary) : null;
}

export function ActivityLogTable({ entries }: { entries: ActivityLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        bare
        icon={ScrollText}
        title="No activity yet"
        description="Assignments, trips, and reviews will show up here as they happen."
      />
    );
  }

  return (
    <AdminTable>
      <AdminTableHead columns={["When", "Actor", "Action", "Description"]} />
      <tbody>
        {entries.map((entry, i) => {
          const actor = asAccount(entry.actor);
          return (
            <AdminTableRow key={entry._id} index={i}>
              <AdminTableCell className="whitespace-nowrap text-slate-500">
                {new Date(entry.createdAt).toLocaleString()}
              </AdminTableCell>
              <AdminTableCell>
                {entry.actorType === "system" ? (
                  <AdminStatusBadge status="system" label="System" tone="neutral" />
                ) : (
                  <span className="font-medium text-slate-900">{actor?.name ?? "—"}</span>
                )}
              </AdminTableCell>
              <AdminTableCell className="font-mono text-xs">{entry.action}</AdminTableCell>
              <AdminTableCell last>{entry.description}</AdminTableCell>
            </AdminTableRow>
          );
        })}
      </tbody>
    </AdminTable>
  );
}
