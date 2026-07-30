import { ContactForm } from "@/components/ContactForm";

export default function ContactInquiryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/5 py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">Get in Touch</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions about our tours, want to become a guide, or need
            assistance? We're here to help! Fill out the form below and we'll
            get back to you as soon as possible.
          </p>
        </div>

        <ContactForm />

        <div className="mt-12 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">📞 Phone</h3>
              <p className="text-muted-foreground">+1 234 567 8900</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">✉️ Email</h3>
              <p className="text-muted-foreground">support@getmyguide.com</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">⏰ Hours</h3>
              <p className="text-muted-foreground">Mon-Fri: 9AM - 6PM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
