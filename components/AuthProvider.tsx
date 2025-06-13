"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/utils/supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";

// Define the shape of our auth context
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (provider: "google" | "apple") => Promise<void>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null; needsVerification?: boolean }>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signUpWithPhone: (phone: string) => Promise<{ error: AuthError | null }>;
  verifyPhone: (
    phone: string,
    token: string
  ) => Promise<{ error: AuthError | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resendEmailVerification: (
    email: string
  ) => Promise<{ error: AuthError | null }>;
}

// Create the context with a default value that matches the shape
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => {
    throw new Error("AuthProvider not initialized");
  },
  signUp: async () => {
    throw new Error("AuthProvider not initialized");
  },
  signInWithEmail: async () => {
    throw new Error("AuthProvider not initialized");
  },
  signUpWithPhone: async () => {
    throw new Error("AuthProvider not initialized");
  },
  verifyPhone: async () => {
    throw new Error("AuthProvider not initialized");
  },
  signInWithPhone: async () => {
    throw new Error("AuthProvider not initialized");
  },
  signOut: async () => {
    throw new Error("AuthProvider not initialized");
  },
  resendEmailVerification: async () => {
    throw new Error("AuthProvider not initialized");
  },
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get current session
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        setSession(data.session);
        setUser(data.session?.user || null);
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (provider: "google" | "apple"): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  // Email + Password signup
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      if (error) {
        return { error };
      }

      // Check if email confirmation is required
      const needsVerification =
        !data.session && data.user && !data.user.email_confirmed_at;

      return { error: null, needsVerification: needsVerification || false };
    } catch (error) {
      console.error("Error signing up:", error);
      return { error: error as AuthError };
    }
  };

  // Email + Password sign in
  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      console.error("Error signing in with email:", error);
      return { error: error as AuthError };
    }
  };

  // Phone signup (sends SMS)
  const signUpWithPhone = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: true,
        },
      });

      return { error };
    } catch (error) {
      console.error("Error signing up with phone:", error);
      return { error: error as AuthError };
    }
  };

  // Verify phone with SMS code
  const verifyPhone = async (phone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });

      return { error };
    } catch (error) {
      console.error("Error verifying phone:", error);
      return { error: error as AuthError };
    }
  };

  // Sign in with phone (sends SMS code)
  const signInWithPhone = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: false, // Don't create new user, just sign in
        },
      });

      return { error };
    } catch (error) {
      console.error("Error signing in with phone:", error);
      return { error: error as AuthError };
    }
  };

  // Resend email verification
  const resendEmailVerification = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      return { error };
    } catch (error) {
      console.error("Error resending verification:", error);
      return { error: error as AuthError };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithEmail,
    signUpWithPhone,
    verifyPhone,
    signInWithPhone,
    signOut,
    resendEmailVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
