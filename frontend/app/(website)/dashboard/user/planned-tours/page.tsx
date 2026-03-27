"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchMyCustomRequests,
  deleteCustomTourRequest,
} from "@/lib/redux/thunks/customTour/customTourThunks";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Eye, Trash2, Loader2, AlertCircle } from "lucide-react";

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Pending":
      return "destructive";
    case "Quoted":
      return "default";
    case "Booked":
      return "secondary";
    default:
      return "outline";
  }
};

export default function MyCustomRequestsPage() {
  const dispatch = useAppDispatch();
  const {
    allRequests: requests,
    listLoading,
    listError,
  } = useAppSelector((state) => state.customTour);

  useEffect(() => {
    dispatch(fetchMyCustomRequests());
  }, [dispatch]);

  const handleDelete = (requestId: string) => {
    if (confirm("Are you sure you want to delete this request?")) {
      dispatch(deleteCustomTourRequest(requestId))
        .unwrap()
        .then(() => toast.success("Request deleted successfully!"))
        .catch((err) => toast.error(err));
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold">My Custom Tour Requests</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Track the status of your personalized travel inquiries.
          </p>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinations</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : listError ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-48 text-center text-destructive"
                    >
                      <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                      {listError}
                    </TableCell>
                  </TableRow>
                ) : requests.length > 0 ? (
                  requests.map((req) => (
                    <TableRow key={req._id}>
                      <TableCell>
                        <div className="font-semibold max-w-xs truncate">
                          {req.selectedLocations
                            ?.map((loc: any) => loc.placeName)
                            .join(", ") || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(req.status)}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/dashboard/user/planned-tours/${req._id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" /> View
                            </Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(req._id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="font-semibold">No custom requests found.</p>
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
