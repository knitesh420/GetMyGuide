"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "react-toastify";

export default function RegisterPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<"tourist" | "guide" | "">("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  // The useAuth hook provides all necessary functions and state
  const { verifyAndRegister, loading, clearAuthError } = useAuth();

  useEffect(() => {
    // Clear any previous auth errors when the component loads
    clearAuthError();
  }, [clearAuthError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateForm = (): boolean => {
    if (!userType) {
      toast.error("Please select an account type: Tourist or Tour Guide.");
      return false;
    }
    if (!formData.name.trim()) {
      toast.error("Please enter your full name.");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    if (!formData.mobile.trim()) {
      toast.error("Please enter your mobile number.");
      return false;
    }
    if (!/^\d{10,}$/.test(formData.mobile.trim())) {
      toast.error("Please enter a valid 10-digit (or more) mobile number.");
      return false;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return false;
    }
    if (formData.password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    console.log("UserType being sent:", userType); 

    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name);
    formDataToSend.append("email", formData.email);
    formDataToSend.append("password", formData.password);
    formDataToSend.append("role", userType);
    formDataToSend.append("mobile", formData.mobile);

    console.log("FormData contents:"); // Debug log
    for (let [key, value] of formDataToSend.entries()) {
      console.log(key, value);
    }

    const result = await verifyAndRegister(formDataToSend);

    if (result.meta.requestStatus === "fulfilled") {
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-lg p-8 border border-border animate-scale-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Create an Account
        </h1>
        <p className="text-muted-foreground">
          Join our community of travelers and guides.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            I am registering as a:
          </label>
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant={userType === "tourist" ? "default" : "outline"}
              onClick={() => setUserType("tourist")}
              disabled={loading}
            >
              Tourist
            </Button>
            <Button
              type="button"
              variant={userType === "guide" ? "default" : "outline"}
              onClick={() => setUserType("guide")}
              disabled={loading}
            >
              Tour Guide
            </Button>
          </div>
        </div>
        <Input
          name="name"
          placeholder="Full Name *"
          value={formData.name}
          onChange={handleInputChange}
          disabled={loading}
        />
        <Input
          name="email"
          type="email"
          placeholder="Email Address *"
          value={formData.email}
          onChange={handleInputChange}
          disabled={loading}
        />
        <Input
          name="mobile"
          type="tel"
          placeholder="Mobile Number *"
          value={formData.mobile}
          onChange={handleInputChange}
          disabled={loading}
        />
        <Input
          name="password"
          type="password"
          placeholder="Create Password *"
          value={formData.password}
          onChange={handleInputChange}
          disabled={loading}
        />
        <Input
          type="password"
          placeholder="Confirm Password *"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />
        <Button
          type="button"
          onClick={handleRegister}
          disabled={loading || !userType}
          className="w-full"
          size="lg"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
      </div>

      <p className="mt-8 text-center text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary hover:underline font-medium"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
