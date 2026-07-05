import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActivityLogEntry, PopulatedAccountSummary } from "@/lib/data";

function asAccount(value: unknown): PopulatedAccountSummary | null {
  return value && typeof value === "object" ? (value as PopulatedAccountSummary) : null;
}

export function ActivityLogTable({ entries }: { entries: ActivityLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const actor = asAccount(entry.actor);
          return (
            <TableRow key={entry._id}>
              <TableCell className="whitespace-nowrap">
                {new Date(entry.createdAt).toLocaleString()}
              </TableCell>
              <TableCell>
                {entry.actorType === "system" ? (
                  <Badge variant="outline">System</Badge>
                ) : (
                  (actor?.name ?? "—")
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">{entry.action}</TableCell>
              <TableCell>{entry.description}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
