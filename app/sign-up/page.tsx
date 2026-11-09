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

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (signUpError) {
        setError(signUpError.message || 'Failed to create an account');
      } else {
        router.push('/Dashboard');
      } 
    } catch {
      setError('Failed to create an account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50/50 p-6">
      <Card className="w-full max-w-[400px] shadow-xl shadow-gray-200/50 border-gray-100 bg-white">
        <CardHeader className="space-y-3 py-8">
          <CardTitle className="text-2xl font-bold text-center tracking-tight text-black">
            Create an account
          </CardTitle>
          <CardDescription className="text-center text-zinc-500">
            Start tracking your applications today
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-md border border-red-100">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Name
              </Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Your Name" 
                className="h-11 border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-black focus:border-black transition-all" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Email
              </Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                className="h-11 border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-black focus:border-black transition-all" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" title="password" className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Password
              </Label>
              <Input 
                id="password" 
                type="password" 
                minLength={8} 
                placeholder="•••••••• (min 8 characters)" 
                className="h-11 border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-black focus:border-black transition-all" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold bg-black text-white hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg shadow-zinc-900/10 mt-2"
              disabled={loading} 
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center pb-8">
          <p className="text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-black font-semibold hover:underline decoration-2 underline-offset-4">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
