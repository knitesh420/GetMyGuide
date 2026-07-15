"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchAdminGuides } from "@/lib/redux/thunks/guide/adminGuideThunks";
import { deleteGuide, reactivateGuide } from "@/lib/redux/thunks/guide/guideThunk";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/utils/toastHelper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/hooks/useAuth";

export default function AdminGuidesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { guides, loading } = useSelector((state: RootState) => state.adminGuides);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchAdminGuides());
  }, [dispatch, isAuthenticated]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guides;
    return guides.filter((g) =>
      [g.name, g.email, g.guideCode ?? "", g.city, g.phone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [guides, search]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin") return null;

  // Suspension hides the guide from the site and blocks their login. It is
  // reversible via handleReactivate below, so this asks before doing it.
  const handleSuspend = async (accountId: string, name: string) => {
    if (
      !window.confirm(
        `Suspend ${name}? They will be hidden from the site and lose access.`,
      )
    ) {
      return;
    }

    const result = await dispatch(deleteGuide(accountId));
    if (deleteGuide.fulfilled.match(result)) {
      showToast.success(`${name} suspended.`);
    } else {
      showToast.error((result.payload as string) || "Could not suspend the guide.");
    }
  };

  // Reverse a suspension: restores the guide's access and puts them back on the
  // site.
  const handleReactivate = async (accountId: string, name: string) => {
    if (
      !window.confirm(
        `Reactivate ${name}? They will regain access and be listed on the site again.`,
      )
    ) {
      return;
    }

    const result = await dispatch(reactivateGuide(accountId));
    if (reactivateGuide.fulfilled.match(result)) {
      showToast.success(`${name} reactivated.`);
    } else {
      showToast.error((result.payload as string) || "Could not reactivate the guide.");
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Guides</h2>
        <p className="text-muted-foreground">
          Every guide account with its ID, contact details, and membership status.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>All Guides ({guides.length})</CardTitle>
          <Input
            placeholder="Search name, ID, email, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {loading && guides.length === 0 ? (
            <Skeleton className="h-60" />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guides found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guide ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Languages</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((g) => (
                    <TableRow key={g.accountId}>
                      <TableCell className="font-mono text-xs">{g.guideCode ?? "—"}</TableCell>
                      <TableCell className="font-medium">
                        {/* The detail page is where documents, notes, payment info
                            and cash payments live for this guide. */}
                        <Link
                          href={`/dashboard/admin/guides/${g.accountId}`}
                          className="hover:text-teal-700 hover:underline"
                        >
                          {g.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{g.email}</div>
                        <div className="text-muted-foreground">{g.phone ?? "—"}</div>
                      </TableCell>
                      <TableCell>{g.city || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {g.languages.length ? g.languages.join(", ") : "—"}
                      </TableCell>
                      <TableCell className="capitalize">{g.type}</TableCell>
                      <TableCell>
                        {g.membershipActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : g.membershipPendingActivation ? (
                          // Paid, but the 30-day clock only starts when an admin
                          // approves them — so this is a queue to work, not a lapse.
                          <Badge variant="pending">Awaiting approval</Badge>
                        ) : g.registrationCompleted ? (
                          <Badge variant="pending">Lapsed</Badge>
                        ) : (
                          <Badge variant="outline">Unregistered</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {g.isActive ? (
                          <Badge variant="secondary">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/dashboard/admin/guides/${g.accountId}`}>View</Link>
                          </Button>
                          {g.isActive ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleSuspend(g.accountId, g.name)}
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                              onClick={() => handleReactivate(g.accountId, g.name)}
                            >
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
