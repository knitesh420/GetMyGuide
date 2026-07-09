"use client";

import Link from "next/link";
import { AlertCircle, BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserTourGuideBookingsPage() {
  return (
    <div className="container mx-auto p-4">
      <Card className="mx-auto max-w-2xl">
        <CardHeader className="text-center">
          <AlertCircle className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
          <CardTitle>Tour Guide Bookings Moved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center text-muted-foreground">
          <p>
            Your custom guide bookings are available from My Bookings. New guide
            requests can be started from Find Guides.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard/user/my-bookings">
                <BookOpen className="mr-2 h-4 w-4" />
                My Bookings
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/find-guides">
                <Search className="mr-2 h-4 w-4" />
                Find Guides
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
