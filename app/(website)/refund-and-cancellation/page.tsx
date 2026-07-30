"use client";

import { motion } from "framer-motion";

export default function RefundAndCancellationPage() {
  return (
    <main className="py-24 sm:py-32 bg-background">
      <div className="container max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Refund & Cancellation Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Last Updated: October 26, 2023
            </p>
          </header>

          <div className="prose prose-lg max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary">
            <p>
              We understand that plans can change. This policy outlines the
              terms for cancellations and refunds for tours booked through
              GetMyGuide.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4">
              1. Cancellation by Traveler
            </h2>
            <ul>
              <li>
                <strong>Full Refund:</strong> Cancellations made more than 48
                hours before the scheduled tour start time will receive a full
                refund of the advance payment.
              </li>
              <li>
                <strong>Partial Refund:</strong> Cancellations made between 24
                and 48 hours before the tour start time may be eligible for a
                50% refund, at the discretion of the guide.
              </li>
              <li>
                <strong>No Refund:</strong> Cancellations made less than 24
                hours before the tour start time are not eligible for a refund.
              </li>
            </ul>

            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4">
              2. Cancellation by Guide or Platform
            </h2>
            <p>
              In the rare event that a guide has to cancel a booked tour due to
              an emergency, or if we must cancel for operational reasons, you
              will receive a 100% refund of your advance payment. We will also
              do our best to help you find an alternative guide.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4">
              3. How to Request a Cancellation
            </h2>
            <p>
              To cancel your booking, please log in to your dashboard and use
              the "Cancel Tour" option, or contact our support team directly at{" "}
              <a href="mailto:support@getmyguide.in">
                support@getmyguide.in
              </a>{" "}
              with your booking details.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
