// app/payment-success/page.tsx
"use client";

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

function SuccessMessage() {
    const searchParams = useSearchParams();
    const requestId = searchParams.get('requestId');
    const amount = searchParams.get('amount');

    return (
        <div className="text-center">
            <CheckCircle className="w-24 h-24 mx-auto text-green-500 mb-4" />
            <h1 className="text-4xl font-extrabold text-foreground">Payment Successful!</h1>
            {amount && (
                 <p className="mt-2 text-2xl text-muted-foreground">You have successfully paid <span className="font-bold text-foreground">₹{Number(amount).toLocaleString()}</span>.</p>
            )}
            <p className="mt-4 text-lg text-muted-foreground">Your booking status has been updated. A confirmation has been sent to your email.</p>
            
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="red-gradient">
                    <Link href={`/tours`}>
                        Explore More <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                    <Link href="/dashboard/user">Back to Dashboard</Link>
                </Button>
            </div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-3xl mx-auto animate-fade-in-up">
                <Suspense fallback={<div>Loading...</div>}>
                    <SuccessMessage />
                </Suspense>
            </div>
        </div>
    );
}