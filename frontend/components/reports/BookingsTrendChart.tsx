"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingsTrendPoint } from "@/lib/data";

interface BookingsTrendChartProps {
  data: BookingsTrendPoint[];
}

const bookingsConfig = {
  bookings: { label: "Bookings", color: "var(--primary)" },
};

const revenueConfig = {
  revenue: { label: "Revenue (₹)", color: "var(--primary)" },
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

// Two single-series small multiples rather than one dual-axis chart — bookings
// (count) and revenue (currency) are different scales, so they get separate
// axes instead of being crammed onto one chart.
export function BookingsTrendChart({ data }: BookingsTrendChartProps) {
  const chartData = data.map((point) => ({ ...point, label: formatDate(point.date) }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookings Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={bookingsConfig} className="aspect-[16/9] w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="bookings" fill="var(--color-bookings)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="aspect-[16/9] w-full">
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `₹${v}`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
