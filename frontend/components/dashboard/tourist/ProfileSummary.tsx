import Link from "next/link";
import {
  CalendarClock,
  Globe2,
  Mail,
  Pencil,
  Phone,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { TouristDashboardProfile } from "@/lib/data";
import { SectionCard } from "./SectionCard";
import { formatMonthYear, initialsOf } from "./format";

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
      />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}

export function ProfileSummary({
  profile,
}: {
  profile: TouristDashboardProfile;
}) {
  const phone = profile.mobile
    ? `${profile.countryCode ?? ""} ${profile.mobile}`.trim()
    : "—";

  return (
    <SectionCard
      icon={UserRound}
      title="Your Profile"
      description="Travel preferences we use to match guides"
      contentClassName="p-5"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 shrink-0 ring-2 ring-teal-500/20">
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-500 font-semibold text-white">
              {initialsOf(profile.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{profile.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {profile.touristCode ?? "—"}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail icon={Mail} label="Email" value={profile.email} />
          <Detail icon={Phone} label="Phone" value={phone} />
          <Detail
            icon={Globe2}
            label="Nationality"
            value={profile.nationality || "—"}
          />
          <Detail
            icon={Users}
            label="Travellers"
            value={String(profile.numberOfTravelers)}
          />
          <Detail icon={Wallet} label="Budget" value={profile.budget || "—"} />
          <Detail
            icon={CalendarClock}
            label="Member since"
            value={formatMonthYear(profile.memberSince)}
          />
        </dl>

        {/* Onboarding is the only profile editor that exists — it upserts the
            same record, so it doubles as "edit profile". */}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/tourist/onboarding">
            <Pencil aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Edit Profile
          </Link>
        </Button>
      </div>
    </SectionCard>
  );
}
