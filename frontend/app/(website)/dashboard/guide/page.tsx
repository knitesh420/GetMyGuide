"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchDashboardStats } from "@/lib/redux/thunks/dashboard/dashboardThunks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  BadgeInfo,
  BadgeCheck,
  ShieldCheck, // Icon for active subscription
  Star, // Icon for certification prompt
} from "lucide-react";

type StatCardProps = {
  icon: React.ElementType;
  title: string;
  value: string | number;
  description?: string;
  colorClass?: string;
};

// Reusable Stat Card Component (No changes here)
const StatCard = ({ icon: Icon, title, value, description, colorClass }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-5 w-5 ${colorClass || "text-muted-foreground"}`} />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </CardContent>
  </Card>
);

// Loading State Skeleton (No changes here)
const DashboardSkeleton = () => (
    <div className="space-y-6 p-8">
        <Skeleton className="h-24" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
        </div>
    </div>
);


// --- ✅ UPDATED COMPONENT: Subscription Status ---
// It now receives profileStatus as a prop.
const SubscriptionStatus = ({ profileStatus }: { profileStatus: any }) => {
    // The check is now simpler because we know profileStatus exists.
    if (!profileStatus.profileComplete ) {
        return null;
    }

    const { isCertified, subscriptionPlan, subscriptionExpiresAt } = profileStatus;

    if (isCertified && subscriptionPlan) {
        const expiryDate = new Date(subscriptionExpiresAt!).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        return (
            <Card className="bg-green-50 border-green-200">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-green-600"/>
                        <div>
                            <CardTitle className="text-green-800">Certified Guide</CardTitle>
                            <CardDescription className="text-green-700">You are listed as a premium, certified guide.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-lg font-semibold">{subscriptionPlan}</p>
                    <p className="text-sm text-muted-foreground">Expires on: {expiryDate}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
                 <div className="flex items-center gap-3">
                    <Star className="w-8 h-8 text-primary"/>
                    <div>
                        <CardTitle>Become a Certified Guide!</CardTitle>
                        <CardDescription>Get listed on our main page and receive more booking requests.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    By becoming a certified guide, you gain tourist trust, get priority in search results, and unlock more features.
                </p>
                <Button asChild className="red-gradient">
                    <Link href="/dashboard/guide/subscription">View Plans & Get Certified</Link>
                </Button>
            </CardContent>
        </Card>
    );
};


export default function GuideDashboardPage() {
  const dispatch = useAppDispatch();
  const { stats, loading, error } = useAppSelector((state) => state.dashboard);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);


  // Profile Status Alert (No changes here)
  const ProfileStatusAlert = () => {
  console.log("stats.profilestatus",stats.profileStatus)
    if (!stats || !stats.profileStatus) return null;

    const { isApproved, profileComplete } = stats.profileStatus;

    if (isApproved && profileComplete) {
      return (
        <Alert className="bg-green-50 border-green-200">
          <BadgeCheck className="h-4 w-4 text-green-700" />
          <AlertTitle className="text-green-800">Profile Approved!</AlertTitle>
          <AlertDescription className="text-green-700">
            Your profile is complete and approved by the admin. You are ready to be booked.
          </AlertDescription>
        </Alert>
      );
    }

    if (!profileComplete) {
      return (
        <Alert variant="destructive">
          <BadgeInfo className="h-4 w-4" />
          <AlertTitle>Action Required: Complete Your Profile</AlertTitle>
          <AlertDescription>
            Your profile is incomplete. Please add all required details like photo, license, and experience to get approved.
            <Button asChild variant="link" className="p-0 h-auto ml-1">
              <Link href="/dashboard/guide/profile">Update Profile</Link>
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    
    if (!isApproved && profileComplete) {
        return (
          <Alert>
            <BadgeInfo className="h-4 w-4" />
            <AlertTitle>Profile Submitted for Review</AlertTitle>
            <AlertDescription>
              Your profile is complete and is currently being reviewed by the admin. You will be notified upon approval.
            </AlertDescription>
          </Alert>
        );
    }

    return null;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not load your dashboard stats. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8">No statistics available.</div>;
  }

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome, {user?.name || "Guide"}!
          </h2>
          <p className="text-muted-foreground">
            Here's a summary of your bookings and profile status.
          </p>
        </div>
      </div>
      
      {/* Profile Status Alert */}
      <ProfileStatusAlert />

      {/* ✅ UPDATED RENDER LOGIC: Pass props to the child component */}
      {/* This ensures we only render it when the necessary data is available. */}
      {stats.profileStatus && <SubscriptionStatus profileStatus={stats.profileStatus} />}

      {/* Booking sections (No changes here) */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Package Tour Bookings</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Bookings" value={stats.totalPackageBookings || 0} icon={Package} colorClass="text-blue-500"/>
          <StatCard title="Completed" value={stats.completedPackageBookings || 0} icon={CheckCircle} colorClass="text-green-500"/>
          <StatCard title="Upcoming" value={stats.upcomingPackageBookings || 0} icon={Clock} colorClass="text-orange-500"/>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Direct Tour Guide Bookings</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Bookings" value={stats.totalTourGuideBookings || 0} icon={Briefcase} colorClass="text-purple-500"/>
          <StatCard title="Completed" value={stats.completedTourGuideBookings || 0} icon={CheckCircle} colorClass="text-green-500"/>
          <StatCard title="Upcoming" value={stats.upcomingTourGuideBookings || 0} icon={Clock} colorClass="text-orange-500"/>
        </div>
      </div>
    </div>
  );
}