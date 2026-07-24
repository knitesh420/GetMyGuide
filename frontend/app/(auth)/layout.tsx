import PageTransition from "@/components/animations/PageTransition";
import { FloatingClouds } from "@/components/animations/travel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient backdrop — sits behind the card, never intercepts clicks. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-50 via-white to-orange-50"
      />
      <FloatingClouds className="opacity-40" />

      {/* Each auth screen fades up as you move between sign-in, sign-up,
          forgot-password and OTP. */}
      <PageTransition className="relative z-10 w-full max-w-md">
        {children}
      </PageTransition>
    </div>
  );
}
