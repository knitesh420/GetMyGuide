// app/dashboard/guide/subscription/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Script from 'next/script'; // To load the Razorpay script
import { AppDispatch, RootState } from '@/lib/store';
import { fetchSubscriptions, createPaymentOrder, verifyPayment } from '@/lib/redux/thunks/admin/subscriptionThunks';
// import { createPaymentOrder, verifyPayment } from '@/lib/redux/thunks/paymentThunks'; // Import payment thunks
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-toastify'; // Assuming you use react-hot-toast for notifications

export default function GuideSubscriptionPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  // --- Redux State ---
  const { plans, loading: isLoadingPlans, error: plansError } = useSelector((state: RootState) => state.subscriptions);
  const { myProfile: profile } = useSelector((state: RootState) => state.guide);
  // const { profile } = useSelector((state: RootState) => state.guide); // Get guide profile to check status

  // --- Fetch Subscriptions ---
  useEffect(() => {
    dispatch(fetchSubscriptions());
  }, [dispatch]);

  // --- Main Payment Logic ---
  const handleChoosePlan = async (planId: string, amount: number, planName: string) => {
    setActivePlanId(planId); // Show loading spinner on the clicked button

    // 1. Create Order on Backend
    const result = await dispatch(createPaymentOrder(planId));
    if (createPaymentOrder.rejected.match(result)) {
      toast.error(result.payload as string || "Failed to start payment process.");
      setActivePlanId(null);
      return;
    }

    const { order, key_id } = result.payload;

    // 2. Configure and Open Razorpay Checkout
    const options = {
      key: key_id,
      amount: order.amount,
      currency: "INR",
      name: "Tour Guide Certification",
      description: `Payment for ${planName} Plan`,
      order_id: order.id,
      // 3. This handler function is called after payment is completed
      handler: async function (response: any) {
        const payload = {
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          planId: planId,
        };

        // 4. Verify Payment on Backend
        const verifyResult = await dispatch(verifyPayment(payload));

        if (verifyPayment.fulfilled.match(verifyResult)) {
          toast.success("Payment Successful! You are now a Certified Guide.");
        } else {
          toast.error(verifyResult.payload as string || "Payment verification failed. Please contact support.");
        }
      },
      prefill: {
        name: profile?.name || "",
        email: profile?.email || "",
        contact: profile?.mobile || "",
      },
      theme: {
        color: "#F85E6A", // Match your brand color
      },
    };

    // 5. Create and open the payment modal
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
    
    rzp.on('payment.failed', function (response: any) {
        toast.error(`Payment Failed: ${response.error.description}`);
    });

    setActivePlanId(null); // Hide loading spinner
  };

  return (
    <>
      {/* Load Razorpay Checkout Script */}
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
      />
      <div className="min-h-screen bg-muted/50">
        <main className="pt-10">
          {/* --- Header Section --- */}
          <section className="py-12 text-center">
            <div className="container max-w-4xl mx-auto px-4">
              <Badge variant="secondary" className="mb-4">For Professional Guides</Badge>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Become a Certified Guide</h1>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Unlock exclusive features, gain more visibility, and attract more travelers by joining our certified guide program.
              </p>
            </div>
          </section>

          {/* --- Pricing Tiers Section --- */}
          <section className="pb-12">
            <div className="container max-w-6xl mx-auto px-4">
              {isLoadingPlans ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                  {[...Array(3)].map((_, i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-96 w-full" /></CardContent></Card>)}
                </div>
              ) : plansError ? (
                 <div className="text-center text-red-500"><p>Failed to load subscription plans: {plansError}</p></div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                  {plans.map((plan) => (
                    <Card key={plan._id} className={cn("flex flex-col h-full", plan.popular && "border-2 border-primary shadow-2xl scale-105")}>
                      <CardHeader className="text-center">
                        {plan.popular && <Badge className="w-fit mx-auto mb-2 bg-primary hover:bg-primary">Most Popular</Badge>}
                        <CardTitle className="text-2xl">{plan.title}</CardTitle>
                        <CardDescription>{plan.duration} Plan</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between">
                        <div className="text-center">
                          <p className="text-5xl font-extrabold text-foreground">₹{plan.totalPrice.toLocaleString()}</p>
                          <p className="text-muted-foreground">₹{plan.monthlyPrice.toLocaleString()} / month</p>
                        </div>
                        <ul className="mt-8 space-y-4 text-muted-foreground">
                          {plan.benefits.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          size="lg" 
                          className="w-full text-lg"
                          variant={plan.popular ? 'default' : 'outline'}
                          disabled={!!activePlanId || profile?.isCertified}
                          onClick={() => handleChoosePlan(plan._id!, plan.totalPrice, plan.title)}
                        >
                          {profile?.isCertified ? 'Already Certified' : activePlanId === plan._id ? 'Processing...' : 'Choose Plan'}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>
        
        {/* --- FAQ Section (No changes needed here) --- */}
        <section className="py-16 bg-background">
          <div className="container max-w-3xl mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                      <AccordionTrigger>What does "Certified Guide" mean?</AccordionTrigger>
                      <AccordionContent>
                          A "Certified Guide" is a guide who has subscribed to our professional plan. This status unlocks a badge on your profile, gives you priority in search results, and signals to travelers that you are a committed and top-rated professional.
                      </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                      <AccordionTrigger>Can I cancel my subscription?</AccordionTrigger>
                      <AccordionContent>
                          Yes, you can cancel your subscription at any time. Your certified status and benefits will remain active until the end of your current billing period.
                      </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                      <AccordionTrigger>What happens after I subscribe?</AccordionTrigger>
                      <AccordionContent>
                          Once your payment is successful, the Certified Guide badge will be automatically applied to your profile. You will immediately gain access to all the features included in your chosen plan, such as priority listing and analytics.
                      </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4">
                      <AccordionTrigger>What is "Priority Listing"?</AccordionTrigger>
                      <AccordionContent>
                          Priority Listing means your profile will appear higher in search results when travelers look for guides in your area of expertise and location, significantly increasing your visibility and booking potential.
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
          </div>
        </section>
      </main>
    </div>
  </>
  );
}