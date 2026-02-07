'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createAuthClient } from "better-auth/client";

export default function SignIn() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Initialize client once
  const authClient = createAuthClient();

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/Dashboard",
    });
  };

  const handleCredentialsSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/Dashboard",
      });

      if (signInError) {
        setError(signInError.message || 'Invalid email or password');
      } else {
        router.push('/Dashboard');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50/50 p-6">
      <Card className="w-full max-w-[400px] shadow-xl shadow-gray-200/50 border-gray-100 bg-white">
        <CardHeader className="space-y-3 py-8">
          <CardTitle className="text-2xl font-bold text-center tracking-tight text-black">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center text-zinc-500">
            Enter your credentials to access your workspace
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-8 pb-8">
          {/* Google Sign In - Clean Outline Style */}
          <Button
            variant="outline"
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full gap-2 h-11 font-medium text-zinc-700 bg-white border-zinc-200 hover:bg-zinc-50 hover:text-black transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-100" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-zinc-400 font-medium tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            {error && (
              <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-md border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wide text-zinc-500"
              >
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                className="h-11 border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-black focus:border-black transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wide text-zinc-500"
                >
                  Password
                </Label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-zinc-400 hover:text-black transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                placeholder="••••••••"
                className="h-11 border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-black focus:border-black transition-all"
                required
              />
            </div>

            {/* THE BLACK BUTTON */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-semibold bg-black text-white hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg shadow-zinc-900/10"
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center pb-8">
          <p className="text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="text-black font-semibold hover:underline decoration-2 underline-offset-4"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}