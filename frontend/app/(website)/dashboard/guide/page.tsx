"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { getMyGuideProfile } from "@/lib/redux/thunks/guide/guideThunk";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BadgeInfo, ShieldCheck, AlertTriangle } from "lucide-react";

const DashboardSkeleton = () => (
  <div className="space-y-6 p-8">
    <Skeleton className="h-24" />
    <Skeleton className="h-40" />
  </div>
);

export default function GuideDashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { myProfile: profile, loading, error } = useSelector((state: RootState) => state.guide);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(getMyGuideProfile());
  }, [dispatch]);

  if (loading && !profile) {
    return <DashboardSkeleton />;
  }

  if (error && !profile) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Could not load your guide profile. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isMembershipActive =
    profile?.isVisible && !profile?.membershipExpired && !!profile?.membershipExpiryDate;
  const expiryDate = profile?.membershipExpiryDate
    ? new Date(profile.membershipExpiryDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome, {user?.name || "Guide"}!</h2>
        <p className="text-muted-foreground">Here's the status of your guide profile and membership.</p>
      </div>

      {!profile?.registrationCompleted && (
        <Alert variant="destructive">
          <BadgeInfo className="h-4 w-4" />
          <AlertTitle>Action Required: Complete Your Profile</AlertTitle>
          <AlertDescription>
            Add your languages, experience, location, pricing, and identity documents to start
            accepting bookings.
            <Button asChild variant="link" className="p-0 h-auto ml-1">
              <Link href="/dashboard/guide/profile">Complete Profile</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {profile?.registrationCompleted && (
        <Card className={isMembershipActive ? "bg-green-50 border-green-200" : "border-primary/50 bg-primary/5"}>
          <CardHeader>
            <div className="flex items-center gap-3">
              {isMembershipActive ? (
                <ShieldCheck className="w-8 h-8 text-green-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-primary" />
              )}
              <div>
                <CardTitle className={isMembershipActive ? "text-green-800" : ""}>
                  {isMembershipActive ? "Membership Active" : "Membership Expired"}
                </CardTitle>
                <CardDescription className={isMembershipActive ? "text-green-700" : ""}>
                  {isMembershipActive
                    ? "Your profile is listed and bookable by travelers."
                    : "Your profile is currently hidden from public search."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {expiryDate && (
              <p className="text-sm text-muted-foreground mb-3">
                {isMembershipActive ? "Expires on" : "Expired on"}: {expiryDate}
              </p>
            )}
            <Button asChild className={isMembershipActive ? "" : "red-gradient"}>
              <Link href="/dashboard/guide/buy-subscription">
                {isMembershipActive ? "Renew Early" : "Renew Membership"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
