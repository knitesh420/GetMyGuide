"use client";

import Link from "next/link";
import { AlertCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TourGuideBookingDetailPage() {
  return (
    <div className="container mx-auto p-4">
      <Card className="mx-auto max-w-2xl">
        <CardHeader className="text-center">
          <AlertCircle className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
          <CardTitle>Use My Bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center text-muted-foreground">
          <p>
            This older detail route is no longer connected to a backend API.
            Open the booking from My Bookings to view the live details.
          </p>
          <Button asChild>
            <Link href="/dashboard/user/my-bookings">
              <BookOpen className="mr-2 h-4 w-4" />
              Go to My Bookings
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
