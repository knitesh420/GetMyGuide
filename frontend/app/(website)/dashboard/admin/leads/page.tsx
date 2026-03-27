"use client";

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchLeads } from "@/lib/redux/contactSlice";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, RefreshCw, Mail, Phone, Globe, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LeadsPage() {
  const dispatch: AppDispatch = useDispatch();
  const { leads, loading, error } = useSelector(
    (state: RootState) => state.contacts
  );

  useEffect(() => {
    dispatch(fetchLeads());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchLeads());
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return <Badge variant="default">New</Badge>;
      case "contacted":
        return <Badge variant="secondary">Contacted</Badge>;
      case "converted":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Converted</Badge>;
      case "closed":
        return <Badge variant="destructive">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Leads Management</h1>
        <Button onClick={handleRefresh} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{typeof error === 'string' ? error : 'An error occurred'}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && leads.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leads found.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead._id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(lead.createdAt), "MMM d, yyyy")}
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(lead.createdAt), "h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {lead.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            {lead.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {lead.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.nationality ? (
                          <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3 text-muted-foreground" />
                            {lead.nationality}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={lead.subject}>
                        {lead.subject}
                      </TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
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
