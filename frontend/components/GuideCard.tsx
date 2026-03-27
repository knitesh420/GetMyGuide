import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Languages } from "lucide-react";
import type { GuideProfile } from "@/lib/data";
import { Button } from "./ui/button";

// --- FIX #1: Add buttonText to the props interface ---
interface GuideCardProps {
    guide: GuideProfile;
    checkoutHref: string;
    buttonText?: string; // Make it optional in case other pages don't provide it
}

// --- FIX #2: Destructure buttonText from props and provide a default value ---
export function GuideCard({ guide, checkoutHref, buttonText = "Select & Continue" }: GuideCardProps) {
  // Determine if the guide has any reviews
  const hasReviews = guide.numReviews && guide.numReviews > 0;

  return (
    <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-border/60">
      <CardHeader className="flex-row gap-4 items-center p-4">
        <div className="relative h-20 w-20 flex-shrink-0">
          <Image
            // Use a fallback image if photo is missing
            src={guide.photo || "/placeholder-avatar.png"}
            alt={guide.name}
            fill
            className="object-cover rounded-full"
          />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">{guide.name}</h3>
          
          <div className="flex items-center gap-2 mt-1">
            {hasReviews ? (
              <>
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-foreground">{guide.averageRating?.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({guide.numReviews} reviews)</span>
              </>
            ) : (
              <Badge variant="outline">New Guide</Badge>
            )}
          </div>

        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          <span>{guide.state && guide.country ? `${guide.state}, ${guide.country}` : (guide.country || 'Location not set')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Languages className="w-4 h-4 text-primary" />
          <span>{guide.languages?.join(", ") || "Languages not listed"}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
            {guide.specializations?.slice(0, 3).map(spec => (
                <Badge key={spec} variant="secondary">{spec}</Badge>
            ))}
        </div>
      </CardContent>
      <CardFooter className="p-4">
        <Button asChild className="w-full font-bold">
          {/* --- FIX #3: Use the buttonText prop here --- */}
          <Link href={checkoutHref}>{buttonText}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}