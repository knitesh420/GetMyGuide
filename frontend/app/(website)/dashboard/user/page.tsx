"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { getMyTouristProfile } from "@/lib/redux/thunks/tourist/touristThunk";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, MapPin, Users, Wallet, Search } from "lucide-react";

const DashboardSkeleton = () => (
  <div className="space-y-6 p-8">
    <Skeleton className="h-8 w-1/3" />
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  </div>
);

export default function UserDashboardPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { myProfile: profile, loading, error } = useSelector((state: RootState) => state.tourist);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(getMyTouristProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile && !profile.registrationCompleted) {
      router.push("/tourist/onboarding");
    }
  }, [profile, router]);

  if (loading && !profile) {
    return <DashboardSkeleton />;
  }

  if (error && !profile) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Could not load your profile. Please try again later.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile || !profile.registrationCompleted) {
    // Redirect effect above will fire; render nothing meanwhile.
    return null;
  }

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome back {user?.name || "Traveler"}!</h2>
        <p className="text-muted-foreground">Here's your travel profile at a glance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nationality</CardTitle>
            <MapPin className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{profile.nationality || "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Travelers</CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{profile.numberOfTravelers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <Wallet className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{profile.budget || "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ready to explore?</CardTitle>
          <CardDescription>Find a guide for your next trip.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="red-gradient">
            <Link href="/guide-availability">
              <Search className="h-4 w-4 mr-2" />
              Find Guides
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
