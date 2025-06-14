"use client";

// Dependencies
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// UI Components
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import Link from "next/link";

// Icons
import { Mail, Smartphone } from "lucide-react";

export default function SignUp() {
  const {
    user,
    signIn,
    signUp,
    signInWithEmail,
    signUpWithPhone,
    verifyPhone,
    loading,
  } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [phonePassword, setPhonePassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");

  // useEffect(() => {
  //   if (user) {
  //     router.push("/");
  //   }
  // }, [user, router]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");

    const { error } = await signUp(email, password);

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard"); // Direct signup, no email verification needed
    }

    setAuthLoading(false);
  };

  const handlePhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");

    const { error } = await signUpWithPhone(phone);

    if (error) {
      setError(error.message);
    } else {
      setIsCodeSent(true);
      setError("Verification code sent!");
    }

    setAuthLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");

    const { error } = await verifyPhone(phone, verificationCode);

    if (error) {
      setError(error.message);
    } else {
      setIsPhoneVerified(true);
      setError("Phone verified! Now set your password.");
    }

    setAuthLoading(false);
  };

  const handlePhoneSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");

    // At this point phone is verified, create account with phone + password
    const { error } = await signUp(phone, phonePassword);

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }

    setAuthLoading(false);
  };

  const renderEmailInputs = () => (
    <form onSubmit={handleEmailSignup} className="space-y-4">
      <Input
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <Button type="submit" className="w-full" disabled={authLoading}>
        {authLoading ? "Creating..." : "Sign up"}
      </Button>
    </form>
  );

  const renderPhoneInputs = () => {
    if (!isCodeSent) {
      // Step 1: Enter phone number
      return (
        <form onSubmit={handlePhoneVerification} className="space-y-4">
          <Input
            placeholder="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          {error && (
            <div className="text-sm text-muted-foreground">{error}</div>
          )}
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={authLoading}
          >
            {authLoading ? "Sending..." : "Send Phone Verification"}
          </Button>
        </form>
      );
    } else if (!isPhoneVerified) {
      // Step 2: Verify phone with code
      return (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <Input placeholder="Phone Number" type="tel" value={phone} disabled />
          <Input
            placeholder="Verification Code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
            required
          />
          {error && (
            <div className="text-sm text-muted-foreground">{error}</div>
          )}
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={authLoading}
          >
            {authLoading ? "Verifying..." : "Verify Code"}
          </Button>
        </form>
      );
    } else {
      // Step 3: Phone verified, now set password and signup
      return (
        <form onSubmit={handlePhoneSignup} className="space-y-4">
          <Input placeholder="Phone Number" type="tel" value={phone} disabled />
          <Input
            type="password"
            placeholder="Password"
            value={phonePassword}
            onChange={(e) => setPhonePassword(e.target.value)}
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={authLoading}>
            {authLoading ? "Creating..." : "Sign up"}
          </Button>
        </form>
      );
    }
  };

  return (
    <div className="md:flex items-center justify-center px-6 py-24 min-h-screen bg-background">
      {/* Logo */}
      {/* <div className="absolute top-4 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0">
        <Logo className="w-8 h-8" />
      </div> */}

      {/* Sign-up form container */}
      <div className="w-full max-w-sm space-y-6 m-auto">
        {/* Header */}
        <div className="text-left md:text-center">
          <h1 className="text-header font-plex-serif">Create an account</h1>
        </div>
        {/* Email/Phone and password inputs */}
        <div className="">
          <div className="w-full flex justify-end">
            {/* Sign up type */}
            <Button
              variant="ghost"
              className="hover:bg-transparent text-muted-foreground hover:text-foreground pr-0"
              onClick={() => {
                setType(type === "email" ? "phone" : "email");
                // Reset states when switching
                setEmail("");
                setPassword("");
                setPhone("");
                setVerificationCode("");
                setIsPhoneVerified(false);
                setIsCodeSent(false);
                setPhonePassword("");
                setError("");
              }}
              disabled
            >
              {type === "email" ? <Smartphone /> : <Mail />}
              {type === "email" ? "Use Phone" : "Use Email"}
            </Button>
          </div>
          {type === "email" ? renderEmailInputs() : renderPhoneInputs()}
        </div>

        {/* Separator */}
        <div className="w-full relative">
          <div className="text-sub-description font-source-sans text-muted-foreground bg-background px-2 uppercase absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            Or
          </div>
          <Separator />
        </div>

        {/* Social sign-up buttons */}
        <div className="space-y-2">
          {/* Google sign-up button */}
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
          Already have an account?{" "}
          <Link
            className="text-sub-description font-source-sans underline text-foreground"
            href="/auth/signin"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
