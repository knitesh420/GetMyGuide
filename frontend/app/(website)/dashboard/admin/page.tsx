"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchDashboardStats } from "@/lib/redux/thunks/dashboard/dashboardThunks";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Users,
  UserCheck,
  Briefcase,
  FileText,
  Package,
  BadgeCheck,
  AlertCircle,
} from "lucide-react";

type StatCardProps = {
  icon: React.ElementType; // 'icon' ek React component hai, isliye 'ElementType'
  title: string;
  value: string | number; // Value number ya string ho sakti hai
  description?: string; // 'description' optional ho sakta hai, isliye '?' lagayein
  colorClass?: string; // 'colorClass' bhi optional hai
};

// Reusable Stat Card Component
const StatCard = ({
  icon: Icon,
  title,
  value,
  description,
  colorClass,
}: StatCardProps) => (
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

// Loading State Skeleton
const DashboardSkeleton = () => (
  <div className="space-y-6 p-8">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const { stats, loading, error } = useAppSelector((state) => state.dashboard);

  // Check if user has admin/manager role
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "manager") {
      console.log(
        "Access denied - User role:",
        user.role,
        "Redirecting to user dashboard",
      );
      router.push("/dashboard/user");
    }
  }, [user, router]);

  useEffect(() => {
    // Sirf ek hi thunk call karna hai, backend role ke hisaab se data bhej dega
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  // Chart ke liye data taiyar karein
  const guideStatsChartData = useMemo(() => {
    if (!stats) return [];
    const pendingGuides = stats.totalGuides - stats.approvedGuides;
    return [
      { name: "Total Guides", total: stats.totalGuides },
      { name: "Approved", total: stats.approvedGuides },
      { name: "Pending", total: pendingGuides < 0 ? 0 : pendingGuides },
    ];
  }, [stats]);

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
            Could not load dashboard stats. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8">No statistics available.</div>;
  }

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
      </div>

      {/* Top Level Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers || 0}
          description="Total registered users (customers)."
          icon={Users}
          colorClass="text-blue-500"
        />
        <StatCard
          title="Total Guides"
          value={stats.totalGuides || 0}
          description="All registered guides."
          icon={Briefcase}
          colorClass="text-orange-500"
        />
        <StatCard
          title="Approved Guides"
          value={stats.approvedGuides || 0}
          description="Guides approved to take tours."
          icon={UserCheck}
          colorClass="text-green-500"
        />
        <StatCard
          title="Certified Guides"
          value={stats.certifiedGuides || 0}
          description="Guides with a complete profile."
          icon={BadgeCheck}
          colorClass="text-sky-500"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Chart Card */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Guide Overview</CardTitle>
            <CardDescription>
              A summary of guide approval status.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={guideStatsChartData}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip cursor={{ fill: "rgba(128, 128, 128, 0.1)" }} />
                <Bar dataKey="total" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bookings & Requests Overview */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>
              Summary of all bookings and requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-purple-500 mr-4" />
              <div className="flex-1">
                <p className="text-sm font-medium">Service Bookings</p>
                <p className="text-xs text-muted-foreground">
                  Total bookings for services
                </p>
              </div>
              <div className="text-lg font-bold">
                {stats.totalBookings || 0}
              </div>
            </div>
            <div className="flex items-center">
              <Briefcase className="h-6 w-6 text-teal-500 mr-4" />
              <div className="flex-1">
                <p className="text-sm font-medium">Tour Guide Bookings</p>
                <p className="text-xs text-muted-foreground">
                  Direct bookings made for specific guides.
                </p>
              </div>
              <div className="text-lg font-bold">
                {stats.totalTourGuideBookings || 0}
              </div>
            </div>
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-rose-500 mr-4" />
              <div className="flex-1">
                <p className="text-sm font-medium">Custom Tour Requests</p>
                <p className="text-xs text-muted-foreground">
                  Inquiries for personalized tours.
                </p>
              </div>
              <div className="text-lg font-bold">
                {stats.totalCustomRequests || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
