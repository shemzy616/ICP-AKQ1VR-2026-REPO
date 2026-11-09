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
import { authClient } from "@/lib/auth/auth-client";

export default function SignIn() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-semibold bg-black text-white hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg shadow-zinc-900/10 mt-2"
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
