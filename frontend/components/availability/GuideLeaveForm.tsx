"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GuideLeaveType } from "@/lib/data";
import { RefreshCw } from "lucide-react";
import type { DateRange } from "react-day-picker";

interface GuideLeaveFormProps {
  onSubmit: (data: { type: GuideLeaveType; startDate: string; endDate: string; reason?: string }) => void;
  isSubmitting?: boolean;
}

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function GuideLeaveForm({ onSubmit, isSubmitting }: GuideLeaveFormProps) {
  const [type, setType] = useState<GuideLeaveType>("vacation");
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!range?.from) return;
    onSubmit({
      type,
      startDate: toLocalDateString(range.from),
      endDate: toLocalDateString(range.to ?? range.from),
      reason: reason.trim() || undefined,
    });
    setRange(undefined);
    setReason("");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="leave-type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as GuideLeaveType)}>
          <SelectTrigger id="leave-type" className="w-full mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vacation">Vacation</SelectItem>
            <SelectItem value="emergency">Emergency Leave</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Date range</Label>
        <div className="mt-1 flex justify-center rounded-md border p-2">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={1}
            disabled={{ before: new Date() }}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="leave-reason">Reason (optional)</Label>
        <Textarea
          id="leave-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Family emergency, planned trip abroad"
        />
      </div>

      <Button className="w-full" onClick={handleSubmit} disabled={!range?.from || isSubmitting}>
        {isSubmitting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? "Submitting..." : "Request Leave"}
      </Button>
    </div>
  );
}
