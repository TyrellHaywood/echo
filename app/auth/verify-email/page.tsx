"use client";

// UI Components
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  return (
    <div className="h-screen flex flex-col gap-2 justify-center items-center">
      <p className="text-description font-source-sans text-center">
        A verification email has been sent to your inbox. Once verified, you can
        return to the sign in page.
      </p>
      <Button
        variant={"outline"}
        onClick={() => {
          window.location.href = "/auth/signin";
        }}
      >
        Return to Sign In
      </Button>
    </div>
  );
}
