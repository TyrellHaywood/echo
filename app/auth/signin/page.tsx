"use client";

// Dependencies
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// UI Components
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import Link from "next/link";

export default function SignIn() {
  const { user, signIn, loading } = useAuth();
  const router = useRouter();

  // useEffect(() => {
  //   if (user) {
  //     router.push("/");
  //   }
  // }, [user, router]);

  return (
    <div className="md:flex items-center justify-center px-6 py-24 min-h-screen bg-background">
      {/* Logo */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0">
        <Logo className="w-8 h-8" />
      </div>

      {/* Sign-in form container */}
      <div className="w-full max-w-sm space-y-6 m-auto">
        {/* Header */}
        <div className="text-left md:text-center">
          <h1 className="text-header font-plex-serif">Sign in</h1>
        </div>

        {/* Email and password inputs */}
        <div className="space-y-4">
          <Input placeholder="Email" />
          <Input type="password" placeholder="Password" />
        </div>

        {/* Keep signed in and forgot password */}
        <div className="flex justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox id="keep-signed-in" />
            <Label htmlFor="keep-signed-in">Keep me signed in</Label>
          </div>
          <Link
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Sign-in button */}
        <Button className="w-full">Sign in</Button>

        {/* Separator */}
        <div className="w-full relative">
          <div className="text-sub-description font-source-sans text-muted-foreground bg-background px-2 uppercase absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            Or
          </div>
          <Separator />
        </div>

        {/* Social sign-in buttons */}
        <div className="space-y-2">
          {/* Google sign-in button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn("google")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_772_376)">
                <path
                  d="M8 6.54543V9.64361H12.3054C12.1164 10.64 11.549 11.4836 10.6981 12.0509L13.2945 14.0655C14.8072 12.6692 15.68 10.6182 15.68 8.18187C15.68 7.61461 15.6291 7.0691 15.5345 6.54551L8 6.54543Z"
                  fill="#4285F4"
                />
                <path
                  d="M3.51625 9.52267L2.93067 9.97093L0.85791 11.5854C2.17427 14.1963 4.87225 16 7.9995 16C10.1594 16 11.9703 15.2873 13.294 14.0655L10.6976 12.0509C9.98492 12.5309 9.07582 12.8218 7.9995 12.8218C5.91951 12.8218 4.15229 11.4182 3.51952 9.52729L3.51625 9.52267Z"
                  fill="#34A853"
                />
                <path
                  d="M0.858119 4.41455C0.312695 5.49087 0 6.70543 0 7.99996C0 9.29448 0.312695 10.509 0.858119 11.5854C0.858119 11.5926 3.51998 9.51991 3.51998 9.51991C3.35998 9.03991 3.26541 8.53085 3.26541 7.99987C3.26541 7.46889 3.35998 6.95984 3.51998 6.47984L0.858119 4.41455Z"
                  fill="#FBBC05"
                />
                <path
                  d="M7.99966 3.18545C9.17786 3.18545 10.2251 3.59271 11.0615 4.37818L13.3524 2.0873C11.9633 0.792777 10.1597 0 7.99966 0C4.87242 0 2.17427 1.79636 0.85791 4.41455L3.51969 6.48001C4.15238 4.58908 5.91968 3.18545 7.99966 3.18545Z"
                  fill="#EA4335"
                />
              </g>
              <defs>
                <clipPath id="clip0_772_376">
                  <rect width="16" height="16" fill="white" />
                </clipPath>
              </defs>
            </svg>

            <span>Sign in with Google</span>
          </Button>
        </div>

        {/* Sign-up link */}
        <p className="text-sub-description font-source-sans text-center text-muted-foreground">
          Don't have an account?{" "}
          <Link
            className="text-sub-description font-source-sans underline text-foreground"
            href="/auth/signup"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
