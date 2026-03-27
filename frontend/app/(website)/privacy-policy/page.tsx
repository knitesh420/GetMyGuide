"use client";

import { motion } from "framer-motion";

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Last Updated: October 26, 2023
            </p>
          </header>

          <div className="prose prose-lg max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary">
            <p>
              Welcome to GetMyGuide. Your privacy is critically important
              to us. It is GetMyGuide's policy to respect your privacy
              regarding any information we may collect while operating our
              website.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4">
              1. Information We Collect
            </h2>
            <p>
              We collect information that you provide directly to us, such as
              when you create an account, book a tour, or contact us for
              support. This may include your name, email address, phone number,
              and payment information. We also collect information automatically
              as you navigate the site, such as your IP address and browsing
              behavior.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4">
              2. How We Use Your Information
            </h2>
            <p>
              We use the information we collect to operate, maintain, and
              provide you the features and functionality of the Service,
              including:
            </p>
            <ul>
              <li>To process your bookings and payments.</li>
              <li>
                To communicate with you about your tours and our services.
              </li>
              <li>To personalize your experience on our platform.</li>
              <li>To improve our website and services.</li>
              <li>To provide customer support.</li>
            </ul>

            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4">
              3. Data Sharing and Disclosure
            </h2>
            <p>
              We do not sell your personal information. We may share your
              information with third-party vendors and service providers that
              perform services on our behalf, such as payment processing and
              data analysis. We may also share information with your chosen tour
              guide to facilitate the tour.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4">
              4. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us at{" "}
              <a href="mailto:privacy@bookmytourguide.in">
                privacy@bookmytourguide.in
              </a>
              .
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
