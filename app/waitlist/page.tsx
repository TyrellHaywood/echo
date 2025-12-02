"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      toast.success("You've been added to the waitlist!");
      setEmail("");
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat">
      <div className="w-full max-w-3xl mx-auto text-center space-y-16">
        {/* Header Section */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-plex-serif text-white leading-tight">
              An organic ecosystem for{" "}
              <span className="italic text-[#9FCA53]">intentional</span>
              {" "}
              music collaboration.
            </h1>
          </div>
          <p className="text-description font-light font-source-sans text-white/60 max-w-2xl mx-auto">
            A dedicated space for co-creation. Build trust, discover collaborators, and create music together.
          </p>
        </div>

        {/* Email Signup Form */}
<form onSubmit={handleSubmit} className="max-w-md mx-auto">
  <div className="flex flex-col sm:flex-row gap-3">
    <Input
      type="email"
      placeholder="Enter your email..."
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      required
      className="flex-1 h-12 rounded-full bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30 transition-all"
    />
    <Button
      type="submit"
      disabled={isLoading}
      className="h-12 px-8 rounded-full bg-white/20 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(255,255,255,0.1)] border border-white/30 text-white hover:bg-white/25 hover:border-white/40 font-source-sans font-medium transition-all"
    >
      {isLoading ? <LoadingSpinner /> : "Join Waitlist"}
    </Button>
  </div>
</form>

      </div>
    </div>
  );
}