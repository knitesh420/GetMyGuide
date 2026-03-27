"use client";

import { motion } from "framer-motion";

export default function TermsAndConditionsPage() {
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
              Terms and Conditions
            </h1>
            <p className="text-lg text-muted-foreground">
              Last Updated: October 26, 2023
            </p>
          </header>

          <div className="prose prose-lg max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary">
            <p>
              Please read these Terms and Conditions ("Terms", "Terms and
              Conditions") carefully before using the BookMyTourGuide website
              (the "Service") operated by us. Your access to and use of the
              Service is conditioned on your acceptance of and compliance with
              these Terms.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4">
              1. Accounts
            </h2>
            <p>
              When you create an account with us, you must provide us with
              information that is accurate, complete, and current at all times.
              Failure to do so constitutes a breach of the Terms, which may
              result in immediate termination of your account on our Service.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4">
              2. Bookings, Payments, and Cancellations
            </h2>
            <p>
              All bookings made through the platform are subject to
              availability. Payments are processed through a secure third-party
              gateway. Our cancellation and refund policy is detailed on a
              separate page and is considered a part of these Terms.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4">
              3. Limitation of Liability
            </h2>
            <p>
              In no event shall BookMyTourGuide, nor its directors, employees,
              partners, agents, suppliers, or affiliates, be liable for any
              indirect, incidental, special, consequential or punitive damages,
              including without limitation, loss of profits, data, use,
              goodwill, or other intangible losses, resulting from your access
              to or use of or inability to access or use the Service.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4">
              4. Governing Law
            </h2>
            <p>
              These Terms shall be governed and construed in accordance with the
              laws of India, without regard to its conflict of law provisions.
              Our failure to enforce any right or provision of these Terms will
              not be considered a waiver of those rights.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
