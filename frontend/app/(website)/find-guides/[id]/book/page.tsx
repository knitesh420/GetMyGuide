"use client";

import { useState, useEffect, useMemo, FC } from 'react';
import { IMAGES } from '@/lib/images';
import { useParams, useSearchParams, useRouter } from 'next/navigation'; 
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { getGuideById, fetchGuidePricingDetails } from '@/lib/redux/thunks/guide/guideThunk';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Image from 'next/image';
import { Calendar as CalendarIcon, Users, MapPin, Globe, ArrowRight, Tags } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format, differenceInCalendarDays, isBefore } from 'date-fns';

export default function BookGuidePage() {
  const dispatch: AppDispatch = useDispatch();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter(); 

  const guideId = Array.isArray(params.id) ? params.id[0] : params.id;
  const locationName = searchParams.get('location');
  const languageName = searchParams.get('language');

  const {
    currentGuide: guide,
    loading: guideLoading,
    pricingDetails,
    pricingLoading
  } = useSelector((state: RootState) => state.guide);

  const [date, setDate] = useState<DateRange | undefined>({ from: new Date(), to: addDays(new Date(), 1) });
  const [numTravelers, setNumTravelers] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (guideId) {
      if (!guide || guide._id !== guideId) {
        dispatch(getGuideById(guideId));
      }
      dispatch(fetchGuidePricingDetails(guideId));
    }
  }, [dispatch, guideId]); // Removed 'guide' from dependency array to prevent re-fetching loops

  /**
   * The price comes from the guide's published day rate, and it is the server
   * that multiplies it out — the same `quote` endpoint the checkout page and the
   * payment step both call, so all three agree by construction rather than by
   * three copies of the same arithmetic staying in sync.
   */
  const numberOfDays = useMemo(() => {
    if (!date?.from || !date?.to) return 0;
    return Math.max(0, differenceInCalendarDays(date.to, date.from) + 1);
  }, [date]);

  const dayRate = pricingDetails?.pricing?.fullDay ?? 0;
  const totalPrice = dayRate > 0 && numberOfDays > 0 ? dayRate * numberOfDays : 0;

  const handleProceedToCheckout = () => {
    if (!pricingDetails?.bookable) {
      alert(pricingDetails?.unavailableReason ?? "This guide cannot be booked directly right now.");
      return;
    }
    if (totalPrice <= 0) {
      alert("Please choose your travel dates.");
      return;
    }
    if (!guide || !locationName || !languageName || !date?.from || !date?.to || !fullName || !email || !phone) {
      alert("Please fill all booking and contact details before proceeding.");
      return;
    }

    // No totalPrice in the query string: the server prices the booking, and a
    // number in a URL is a number the tourist can edit.
    const queryParams = new URLSearchParams({
      guideId: guide._id,
      guideName: guide.name,
      location: locationName,
      language: languageName,
      startDate: date.from.toISOString(),
      endDate: date.to.toISOString(),
      numTravelers: String(numTravelers),
      guidePhoto: guide.photo || '/placeholder-avatar.png',
      fullName,
      email,
      phone,
    });

    router.push(`/find-guides/checkout?${queryParams.toString()}`);
  };

  // --- (The rest of the component JSX remains exactly the same) ---
  if (guideLoading || !guide || guide._id !== guideId) {
    return <PageSkeleton />;
  }
  
  if (!locationName || !languageName) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4">
        <div>
          <h2 className="text-2xl font-bold">Invalid Booking Request</h2>
          <p className="text-muted-foreground mt-2">The location or language is missing. Please start your search again.</p>
          <Button asChild className="mt-4"><a href="/find-guides">Find a Guide</a></Button>
        </div>
      </div>
    );
  }

  // A guide is only directly bookable once an admin has verified them AND they
  // have published a day rate. Say which is missing rather than showing an empty
  // price and a dead button.
  if (!pricingLoading && pricingDetails && !pricingDetails.bookable) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4">
        <div>
          <h2 className="text-2xl font-bold">This guide can&apos;t be booked directly yet</h2>
          <p className="text-muted-foreground mt-2">
            {pricingDetails.unavailableReason ?? "Please try another guide."}
          </p>
          <Button asChild className="mt-4"><a href="/find-guides">Find another guide</a></Button>
        </div>
      </div>
    );
  }
  
  const disabledDays = (day: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isBefore(day, today)) return true;
    if (guide.unavailableDates) {
      return guide.unavailableDates.some(
        (unavailableDate) => format(new Date(unavailableDate), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
    }
    return false;
  };
  
  const formattedDate = date?.from ? date.to ? `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}` : format(date.from, "LLL dd, y") : "Not selected";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <section className="relative py-20 md:py-28 bg-cover bg-center" style={{ backgroundImage: `url('${IMAGES.scene4}')` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/50" />
        <div className="container max-w-7xl mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Book Your Tour with {guide.name}</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto">Complete the details below to plan your personalized journey.</p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          
          <div className="lg:col-span-2 bg-background border p-6 sm:p-8 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold mb-6 border-b pb-4">Booking Details</h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center"><Tags className="mr-3 h-6 w-6 text-primary" /> Your Selected Tour</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg border p-4 rounded-lg">
                  <div className="flex items-center"><MapPin className="mr-3 h-5 w-5 text-muted-foreground"/><strong>Location:</strong><span className="ml-2">{locationName}</span></div>
                  <div className="flex items-center"><Globe className="mr-3 h-5 w-5 text-muted-foreground"/><strong>Language:</strong><span className="ml-2">{languageName}</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center"><CalendarIcon className="mr-3 h-6 w-6 text-primary" /> Select Your Dates</h3>
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 flex justify-center">
                  <Calendar mode="range" selected={date} onSelect={setDate} numberOfMonths={2} disabled={disabledDays} />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center"><Users className="mr-3 h-6 w-6 text-primary" /> Number of Travelers</h3>
                <div className="flex items-center gap-4">
                  <Input type="number" id="numTravelers" value={numTravelers} onChange={(e) => setNumTravelers(Math.max(1, parseInt(e.target.value) || 1))} className="max-w-[120px] h-11 text-center" min="1"/>
                  <Label htmlFor="numTravelers" className="text-md">Person(s)</Label>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Your Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label htmlFor="name" className="mb-2 block">Full Name</Label><Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name"/></div>
                <div><Label htmlFor="email" className="mb-2 block">Email Address</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></div>
                  <div><Label htmlFor="phone" className="mb-2 block">Phone Number</Label><Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 12345 67890"/></div>
                </div>
                </div>
              </div>

              <Button onClick={handleProceedToCheckout} size="lg" className="w-full text-lg h-14 mt-6" disabled={totalPrice <= 0 || guideLoading}>
                Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="lg:sticky top-24 self-start space-y-8">
            <div className="bg-background border p-6 rounded-xl shadow-lg">
              <div className="flex flex-col items-center text-center">
                <Image src={guide.photo || '/placeholder-avatar.png'} alt={guide.name} width={128} height={128} className="rounded-full mb-4 border-4 border-primary/20 shadow-md"/>
                <h2 className="text-2xl font-bold">{guide.name}</h2>
                <p className="text-muted-foreground">{guide.city}</p>
                <div className="flex items-center gap-1.5 mt-2 text-yellow-500">
                  <span className="font-bold text-foreground">{guide.averageRating?.toFixed(1) || 'New'} ★</span>
                  <span className="text-muted-foreground">({guide.numReviews || 0} reviews)</span>
                </div>
              </div>
              <hr className="my-6"/>
              <div>
                <h4 className="font-semibold mb-2">Languages</h4><p className="text-muted-foreground">{guide.languages?.join(', ')}</p>
              </div>
            </div>
            
            <div className="bg-background border p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold mb-4">Booking Summary</h3>
              <div className="space-y-3 text-muted-foreground">
                <div className="flex justify-between"><span>Guide:</span><span className="font-medium text-foreground">{guide.name}</span></div>
                <div className="flex justify-between"><span>Location:</span><span className="font-medium text-foreground">{locationName}</span></div>
                <div className="flex justify-between"><span>Language:</span><span className="font-medium text-foreground">{languageName}</span></div>
                <div className="flex justify-between"><span>Dates:</span><span className="font-medium text-foreground text-right">{formattedDate}</span></div>
                <div className="flex justify-between"><span>Guests:</span><span className="font-medium text-foreground">{numTravelers} Person(s)</span></div>
              </div>
              <hr className="my-4"/>
              <div className="flex justify-between items-center text-2xl font-bold">
                <span>Total Price:</span>
                <span className="text-primary">{totalPrice > 0 ? `₹${totalPrice.toLocaleString('en-IN')}` : '...'}</span>
              </div>
              {totalPrice > 0 && <p className="text-xs text-muted-foreground text-right mt-1">All inclusive</p>}
            </div>
          </div>

      </section>
    </div>
  );
}

const PageSkeleton: FC = () => (
  <div className="container max-w-7xl mx-auto px-4 py-16 md:py-24">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
      <div className="lg:col-span-2 space-y-8">
        <Skeleton className="h-16 w-1/2" /><div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        <Skeleton className="h-64 w-full" /><Skeleton className="h-12 w-full" />
      </div>
      <div className="space-y-8"><Skeleton className="h-80 w-full" /><Skeleton className="h-48 w-full" /></div>
    </div>
  </div>
);