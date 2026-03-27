"use client";

import { useState } from "react";
// import { useCart } from "@/contexts/CartContext";
import {
  Lock,
  Check,
  Shield,
  AlertCircle,
  Loader2,
  CreditCard,
  Star,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type CartCheckoutProps = {
  total: number;
};

export function CartCheckout({ total }: CartCheckoutProps) {
  const { state, dispatch } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!customerDetails.name.trim()) {
      setError("Name is required");
      return false;
    }
    if (
      !customerDetails.email.trim() ||
      !/\S+@\S+\.\S+/.test(customerDetails.email)
    ) {
      setError("Valid email is required");
      return false;
    }
    if (!customerDetails.phone.trim() || customerDetails.phone.length < 10) {
      setError("Valid phone number is required");
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      if (!validateForm()) {
        setIsProcessing(false);
        return;
      }

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setIsProcessing(false);
      setShowSuccess(true);

      setTimeout(() => {
        dispatch({ type: "CLEAR_CART" });
        setShowSuccess(false);
        setShowCheckout(false);
      }, 4000);
    } catch (error) {
      console.error("Payment error:", error);
      setError("Payment failed. Please try again.");
      setIsProcessing(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="relative">
            <div className="h-32 w-32 mx-auto rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center animate-scale-in">
              <Check className="h-16 w-16 text-green-600 dark:text-green-400" />
            </div>
            <Star className="absolute -top-2 -right-8 h-8 w-8 text-green-500 animate-pulse" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground">
              Payment Successful!
            </h1>
            <p className="text-xl text-muted-foreground">
              Your booking has been confirmed
            </p>
            <p className="text-muted-foreground">
              You will receive a confirmation email shortly with all the
              details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Sheet open={showCheckout} onOpenChange={setShowCheckout}>
      <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Checkout</SheetTitle>
        </SheetHeader>

        <div className="mt-8">
          {/* Customer Details Form */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Customer Details
              </h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  id: "name",
                  label: "Full Name",
                  type: "text",
                  icon: User,
                  placeholder: "Enter your full name",
                },
                {
                  id: "email",
                  label: "Email Address",
                  type: "email",
                  icon: Mail,
                  placeholder: "Enter your email",
                },
                {
                  id: "phone",
                  label: "Phone Number",
                  type: "tel",
                  icon: Phone,
                  placeholder: "Enter your phone number",
                },
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <label
                    htmlFor={field.id}
                    className="block text-lg font-semibold text-foreground"
                  >
                    {field.label} *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <field.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      type={field.type}
                      id={field.id}
                      name={field.id}
                      value={
                        customerDetails[
                          field.id as keyof typeof customerDetails
                        ]
                      }
                      onChange={handleInputChange}
                      placeholder={field.placeholder}
                      required
                      className="w-full pl-12 pr-4 py-4 rounded-xl border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-lg"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-card rounded-2xl border border-destructive/20 p-6">
                <div className="flex items-center gap-4">
                  <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                  <p className="text-destructive font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="mt-8 pt-8 border-t border-border">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-bold text-foreground">
                  Order Summary
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">
                    Items ({state.items.length})
                  </span>
                  <span className="font-semibold">
                    ₹{total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-semibold text-green-600">Free</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">Taxes</span>
                  <span className="font-semibold">₹0</span>
                </div>
                <div className="h-px bg-border"></div>
                <div className="flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    ₹{total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full mt-8 px-6 py-8 text-lg"
                variant="default"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Processing Payment...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <Lock className="h-6 w-6" />
                    Pay ₹{total.toLocaleString()} Securely
                    <CreditCard className="h-6 w-6" />
                  </span>
                )}
              </Button>

              {/* Security Notice */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>256-bit SSL Encrypted • Powered by Razorpay</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
