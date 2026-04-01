"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Leaf,
  Building,
  ChefHat,
  ShoppingBag,
  Clock,
  Star,
  Users,
  MapPin,
  Youtube,
  Instagram,
  type LucideIcon,
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import Link from "next/link";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPackages } from "@/lib/redux/thunks/admin/packageThunks";
import { RootState, AppDispatch } from "@/lib/store";
import { AdminPackage } from "@/types/admin";
import { useLanguage } from "@/contexts/LanguageContext";
import SocialMediaLinks from "./layout/website/SocialMediaLinks ";

const SkeletonCard = () => (
  <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-pulse border-0 bg-gray-200 overflow-hidden">
    {" "}
    <div className="relative overflow-hidden">
      {" "}
      <div className="w-full h-48 bg-gray-300"></div>{" "}
    </div>{" "}
    <CardContent className="p-6">
      {" "}
      <div className="flex items-center mb-3">
        {" "}
        <div className="w-12 h-12 bg-gray-300 rounded-lg mr-4"></div>{" "}
        <div className="flex-1">
          {" "}
          <div className="h-6 w-3/4 bg-gray-300 rounded"></div>{" "}
          <div className="h-4 w-1/4 bg-gray-300 rounded mt-2"></div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="h-4 bg-gray-300 rounded mb-2"></div>{" "}
      <div className="h-4 w-5/6 bg-gray-300 rounded mb-4"></div>{" "}
      <div className="flex items-center justify-between mb-4">
        {" "}
        <div className="h-8 w-1/3 bg-gray-300 rounded"></div>{" "}
      </div>{" "}
      <div className="h-10 w-full bg-gray-300 rounded mb-2"></div>{" "}
      <div className="h-10 w-full bg-gray-300 rounded"></div>{" "}
    </CardContent>{" "}
  </Card>
);

const getCategoryIcon = (categoryTitle: string): typeof Star => {
  switch (categoryTitle.toLowerCase()) {
    case "eco tours":
      return Leaf;
    case "heritage tours":
      return Building;
    case "cooking classes":
      return ChefHat;
    case "spice market tours":
      return ShoppingBag;
    case "one-day tours":
      return Building;
    case "handcraft tours":
      return ShoppingBag;
    default:
      return Star;
  }
};

export function TourCategories() {
  const { t } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const {
    items: packages,
    loading,
    error,
  } = useSelector((state: RootState) => state.packages);

  useEffect(() => {
    dispatch(fetchPackages());
  }, [dispatch]);

  const renderSkeleton = () => {
    return Array.from({ length: 6 }).map((_, index) => (
      <SkeletonCard key={index} />
    ));
  };

  return (
    <>
      <SocialMediaLinks />
      <section
        id="tours"
        className="py-20 bg-linear-to-b from-white to-card/50"
      >
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              {t("explore_tour_categories")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
              {t("explore_tour_categories_desc")}
            </p>
            <div className="mt-6 flex justify-center">
              <Badge variant="secondary" className="px-4 py-2">
                <MapPin className="w-4 h-4 mr-2" />
                {t("available_in_languages")}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading === "pending" && renderSkeleton()}
            {loading === "succeeded" &&
              packages.map((pkg: AdminPackage, index) => {
                const Icon = getCategoryIcon(pkg.title);
                return (
                  <Card
                    key={pkg._id}
                    className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-scale-in border-0 bg-white overflow-hidden"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={pkg.images[0] || "/placeholder.svg"}
                        alt={pkg.title}
                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium"></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {pkg.duration}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center mb-3">
                        <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mr-4">
                          <Icon className="w-6 h-6 text-secondary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-primary">
                            {pkg.title}
                          </h3>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-4 text-balance text-sm leading-relaxed">
                        {pkg.description}
                      </p>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-2xl font-bold text-primary">
                          ₹{pkg.price}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("per_person")}
                        </div>
                      </div>
                      <Button
                        asChild
                        className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                      >
                        <Link href={`/tours/${pkg._id}`}>
                          {t("view_tours")}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
          <div className="mt-16 text-center">
            <div className="bg-secondary/10 rounded-2xl p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-primary mb-4">
                {t("looking_for_something_specific")}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t("custom_tour_prompt")}
              </p>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground bg-transparent"
                >
                  {t("request_custom_tour")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
