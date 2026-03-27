"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchAllCustomTourRequests,
  deleteCustomTourRequest,
} from "@/lib/redux/thunks/customTour/customTourThunks";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Pending":
      return "destructive";
    case "Quoted":
      return "default";
    case "Booked":
      return "secondary";
    case "Rejected":
      return "outline";
    default:
      return "outline";
  }
};

export default function CustomRequestsAdminPage() {
  const dispatch = useAppDispatch();
  const { allRequests, listLoading, listError } = useAppSelector(
    (state) => state.customTour
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    dispatch(fetchAllCustomTourRequests());
  }, [dispatch]);

  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];
    return allRequests
      .filter((req) => statusFilter === "all" || req.status === statusFilter)
      .filter((req) => {
        const searchLower = searchTerm.toLowerCase();
        const locationNames =
          req.selectedLocations?.map((loc: any) => loc.placeName).join(", ") ||
          "";
        return (
          req.fullName?.toLowerCase().includes(searchLower) ||
          req.email?.toLowerCase().includes(searchLower) ||
          locationNames.toLowerCase().includes(searchLower) ||
          req._id.toLowerCase().includes(searchLower)
        );
      });
  }, [allRequests, searchTerm, statusFilter]);

  const handleDelete = (requestId: string) => {
    if (confirm("Are you sure you want to delete this request?")) {
      dispatch(deleteCustomTourRequest(requestId))
        .unwrap()
        .then(() => toast.success("Request deleted successfully!"))
        .catch((err) => toast.error(err));
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Custom Tour Requests</h1>
        <p className="text-muted-foreground mb-8">
          Review and manage personalized tour inquiries.
        </p>
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by name, email, location, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full md:w-auto px-4 py-2 rounded-md border bg-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Quoted">Quoted</option>
                  <option value="Booked">Booked</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Destinations</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : listError ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-48 text-center text-destructive"
                    >
                      <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                      {listError}
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => (
                    <TableRow key={req._id}>
                      <TableCell>
                        <div className="font-semibold">{req.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          {req.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {req.selectedLocations
                            ?.map((loc: any) => loc.placeName)
                            .join(", ") || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.dateRange?.from
                          ? new Date(req.dateRange.from).toLocaleDateString()
                          : "Flexible"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(req.status)}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/dashboard/admin/custom-booking/${req._id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" /> View
                            </Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(req._id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      No requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
