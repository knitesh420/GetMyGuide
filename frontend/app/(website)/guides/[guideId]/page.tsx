// app/guides/[guideId]/page.tsx

import { guides } from "@/lib/data";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, MapPin, Languages, Briefcase, MessageSquareQuote, CheckCircle } from "lucide-react";

export default function GuideProfilePage({ params }: { params: { guideId: string } }) {
  // Find the guide using the guideProfileId from the URL
  const guide = guides.find((g) => g.guideProfileId === params.guideId);

  // If no guide is found, render the 404 page
  if (!guide) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12">
          
          {/* Left Column: Main Guide Information */}
          <div className="lg:col-span-2">
            {/* --- Header Section --- */}
            <section className="flex flex-col sm:flex-row items-start gap-8 mb-10 animate-fade-in-up">
              <div className="relative h-48 w-48 flex-shrink-0">
                <Image
                  src={guide.photo}
                  alt={guide.name}
                  fill
                  className="object-cover rounded-full shadow-lg border-4 border-card"
                />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                  {guide.name}
                </h1>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground text-lg">
                  <MapPin className="w-5 h-5 text-primary" /> {guide.state}, {guide.country}
                </div>
                <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                        <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        <span className="text-xl font-bold">{guide.averageRating}</span>
                    </div>
                    <span className="text-muted-foreground">({guide.numReviews} traveler reviews)</span>
                </div>
              </div>
            </section>

            <div className="space-y-12 animate-fade-in-up animate-delay-200">
              {/* --- About Me Section --- */}
              <section>
                  <div className="flex items-center gap-3 mb-4">
                      <MessageSquareQuote className="w-8 h-8 text-primary"/>
                      <h2 className="text-3xl font-bold">About Me</h2>
                  </div>
                  <p className="text-lg text-foreground/80 leading-relaxed whitespace-pre-line">
                    {guide.description}
                  </p>
              </section>

              <Separator />

              {/* --- Specializations Section --- */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-8 h-8 text-primary"/>
                    <h2 className="text-3xl font-bold">Specializations</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                    {guide.specializations.map(spec => (
                        <Badge key={spec} className="text-base px-4 py-2">{spec}</Badge>
                    ))}
                </div>
              </section>
            </div>
          </div>

          {/* Right Column: Quick Facts & CTA */}
          <aside className="lg:col-span-1 mt-12 lg:mt-0">
            <div className="sticky top-24">
              <Card className="shadow-lg border animate-scale-in">
                <CardHeader>
                  <CardTitle className="text-2xl">Quick Facts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 text-lg">
                  <div className="flex items-start gap-4">
                    <Briefcase className="w-6 h-6 text-primary flex-shrink-0 mt-1"/>
                    <div>
                        <span className="font-semibold text-foreground">Experience</span>
                        <p className="text-muted-foreground">{guide.experience}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Languages className="w-6 h-6 text-primary flex-shrink-0 mt-1"/>
                    <div>
                        <span className="font-semibold text-foreground">Languages</span>
                        <p className="text-muted-foreground">{guide.languages.join(', ')}</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-4">
                    <Star className="w-6 h-6 text-primary flex-shrink-0 mt-1"/>
                    <div>
                        <span className="font-semibold text-foreground">Reviews</span>
                        <p className="text-muted-foreground">{guide.numReviews} positive reviews</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 text-center animate-fade-in-up animate-delay-400">
                <p className="text-muted-foreground mb-4">Ready for an adventure with {guide.name.split(' ')[0]}?</p>
                <Button size="lg" className="w-full text-lg h-14 red-gradient text-white font-bold" asChild>
                  <Link href="/tours">
                    Explore Tours to Book this Guide
                  </Link>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}