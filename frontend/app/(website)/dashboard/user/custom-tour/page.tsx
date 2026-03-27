"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchCustomTourFormData,
  submitCustomTourRequest,
} from "@/lib/redux/thunks/customTour/customTourThunks";
import { resetFormStatus } from "@/lib/redux/customTourSlice";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  Send,
  PartyPopper,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function CustomTourPage() {
  const dispatch = useAppDispatch();
  const {
    locations,
    languages,
    formLoading,
    formError,
    submitLoading,
    submitSuccess,
    submitError,
  } = useAppSelector((state) => state.customTour);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [numTravelers, setNumTravelers] = useState(1);
  const [preferredMonuments, setPreferredMonuments] = useState("");
  const [needsLunch, setNeedsLunch] = useState(false);
  const [needsDinner, setNeedsDinner] = useState(false);
  const [needsStay, setNeedsStay] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isLocationsOpen, setLocationsOpen] = useState(false);
  const [isDateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchCustomTourFormData());
  }, [dispatch]);

  useEffect(() => {
    if (submitError) toast.error(submitError);
  }, [submitError]);

  const handleSelectLocation = (locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setSelectedLocations([]);
    setSelectedLanguage("");
    setDateRange(undefined);
    setNumTravelers(1);
    setPreferredMonuments("");
    setNeedsLunch(false);
    setNeedsDinner(false);
    setNeedsStay(false);
    setAcknowledged(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      toast.error("Please fill in your Full Name and Email.");
      return;
    }
    if (!acknowledged) {
      toast.error("Please acknowledge the terms before submitting.");
      return;
    }
    dispatch(
      submitCustomTourRequest({
        fullName,
        email,
        phone,
        selectedLocations,
        selectedLanguage,
        dateRange: { from: dateRange?.from || null, to: dateRange?.to || null },
        numTravelers,
        preferredMonuments,
        needsLunch,
        needsDinner,
        needsStay,
        acknowledged,
      })
    );
  };

  if (formLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (formError) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Failed to load form data</h2>
        <p className="text-muted-foreground">{formError}</p>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center p-4">
        <div>
          <PartyPopper className="w-24 h-24 mx-auto text-primary mb-6" />
          <h1 className="text-4xl font-extrabold mb-4">Request Sent!</h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            Thank you. We will get back to you shortly.
          </p>
          <Button
            onClick={() => {
              resetForm();
              dispatch(resetFormStatus());
            }}
            className="mt-8"
            size="lg"
          >
            Create Another Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <main className="py-12 md:py-16">
        <div className="container max-w-4xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl md:text-4xl font-extrabold">
                Create Your Custom Tour
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground mt-2">
                Fill the details for a personalized itinerary.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Full Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="fullname" className="text-lg font-semibold">
                      Full Name
                    </Label>
                    <Input
                      id="fullname"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-12 mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-lg font-semibold">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 mt-2"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone" className="text-lg font-semibold">
                    Phone Number (Optional)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 mt-2"
                  />
                </div>

                {/* Select Places */}
                <div className="space-y-2 bg-white">
                  <Label className="text-lg font-semibold">Select Places</Label>
                  <Popover
                    open={isLocationsOpen}
                    onOpenChange={setLocationsOpen}
                  >
                    <PopoverTrigger className="bg-white" asChild>
                      <button
                        type="button"
                        onClick={() => setLocationsOpen(!isLocationsOpen)}
                        className="flex w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-3 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px]"
                      >
                        <div className="flex flex-wrap gap-2 flex-1 text-left">
                          {selectedLocations.length > 0 ? (
                            locations
                              .filter((loc) =>
                                selectedLocations.includes(loc._id)
                              )
                              .map((loc) => (
                                <Badge
                                  key={loc._id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {loc.placeName}
                                </Badge>
                              ))
                          ) : (
                            <span className="text-muted-foreground">
                              Select locations...
                            </span>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          placeholder="Search places..."
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No location found.</CommandEmpty>
                          <CommandGroup>
                            {locations.map((location) => (
                              <CommandItem
                                key={location._id}
                                value={location.placeName}
                                onSelect={() => {
                                  handleSelectLocation(location._id);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedLocations.includes(location._id)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {location.placeName}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Language & Travelers */}
                <div className="grid grid-cols-1 bg-white md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="language" className="text-lg font-semibold">
                      Preferred Language
                    </Label>
                    <Select
                      value={selectedLanguage}
                      onValueChange={setSelectedLanguage}
                    >
                      <SelectTrigger className="h-12 mt-2">
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang._id} value={lang._id}>
                            {lang.languageName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="travelers"
                      className="text-lg font-semibold"
                    >
                      Number of Travelers
                    </Label>
                    <Input
                      id="travelers"
                      type="number"
                      value={numTravelers}
                      onChange={(e) =>
                        setNumTravelers(parseInt(e.target.value) || 1)
                      }
                      required
                      min="1"
                      className="h-12 mt-2"
                    />
                  </div>
                </div>

                {/* Travel Dates */}
                <div className="space-y-2">
                  <Label className="text-lg font-semibold">
                    Travel Dates (Optional)
                  </Label>
                  <Popover open={isDateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setDateOpen(!isDateOpen)}
                        className={cn(
                          "flex w-full items-center justify-start rounded-md border border-input bg-transparent px-3 py-3 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 h-12",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Preferred Monuments */}
                <div>
                  <Label htmlFor="monuments" className="text-lg font-semibold">
                    Preferred Monuments (Optional)
                  </Label>
                  <Textarea
                    id="monuments"
                    placeholder="e.g., Taj Mahal, Hawa Mahal..."
                    value={preferredMonuments}
                    onChange={(e) => setPreferredMonuments(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>

                {/* Additional Services */}
                <div>
                  <Label className="text-lg font-semibold">
                    Additional Services
                  </Label>
                  <div className="space-y-3 mt-2 p-4 border rounded-md bg-card">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="stay"
                        checked={needsStay}
                        onCheckedChange={(checked) =>
                          setNeedsStay(Boolean(checked))
                        }
                      />
                      <Label htmlFor="stay" className="cursor-pointer">
                        Include Stay / Accommodation
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="lunch"
                        checked={needsLunch}
                        onCheckedChange={(checked) =>
                          setNeedsLunch(Boolean(checked))
                        }
                      />
                      <Label htmlFor="lunch" className="cursor-pointer">
                        Include Lunch
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dinner"
                        checked={needsDinner}
                        onCheckedChange={(checked) =>
                          setNeedsDinner(Boolean(checked))
                        }
                      />
                      <Label htmlFor="dinner" className="cursor-pointer">
                        Include Dinner
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Acknowledgement */}
                <div className="flex items-start space-x-2 p-4 border rounded-md bg-muted/50">
                  <Checkbox
                    id="acknowledge"
                    checked={acknowledged}
                    onCheckedChange={(checked) =>
                      setAcknowledged(Boolean(checked))
                    }
                    required
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="acknowledge"
                    className="text-sm font-medium leading-relaxed cursor-pointer"
                  >
                    I acknowledge this is an inquiry, not a confirmed booking.
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-lg h-14 font-bold"
                  disabled={submitLoading}
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Submit Inquiry
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
