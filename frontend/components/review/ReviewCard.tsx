import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GuideReview, PopulatedAccountSummary } from "@/lib/data";

function asAccount(value: unknown): PopulatedAccountSummary | null {
  return value && typeof value === "object" ? (value as PopulatedAccountSummary) : null;
}

interface ReviewCardProps {
  review: GuideReview;
  showTourist?: boolean;
  showGuide?: boolean;
  actions?: React.ReactNode;
}

export function ReviewCard({ review, showTourist, showGuide, actions }: ReviewCardProps) {
  const tourist = asAccount(review.tourist);
  const guide = asAccount(review.guide);

  return (
    <Card className={review.isHidden ? "opacity-60" : ""}>
      <CardContent className="py-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(review.createdAt).toLocaleDateString()}
          </span>
        </div>

        {showTourist && tourist?.name && (
          <p className="text-sm font-medium">{tourist.name}</p>
        )}
        {showGuide && guide?.name && <p className="text-sm font-medium">Guide: {guide.name}</p>}
        {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
        {review.isHidden && <p className="text-xs text-destructive">Hidden by admin</p>}

        {actions}
      </CardContent>
    </Card>
  );
}
