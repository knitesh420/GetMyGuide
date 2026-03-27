// components/AdminStatsCard.tsx
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import React from "react";
  
  // Define the properties (props) the component will accept
  interface AdminStatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode; // This allows you to pass any JSX, including Lucide icons
    description?: string;    // An optional smaller text below the value
  }
  
  export function AdminStatsCard({ title, value, icon, description }: AdminStatsCardProps) {
    return (
      <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow animate-fade-in-up">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {/* The icon you pass will be rendered here */}
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground pt-1">{description}</p>
          )}
        </CardContent>
      </Card>
    );
  }