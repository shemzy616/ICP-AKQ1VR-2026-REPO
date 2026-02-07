"use client";

import { BriefcaseBusiness } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useSession } from "@/lib/auth/auth-client";
import SignOutBtn from "./sign-out-btn";

export default function Navbar() {
  const { data: session } = useSession();
  const user = session?.user;
  const displayName = user?.name ?? user?.email ?? "Account";
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        
        {/* Logo Area - Styled to match "JobTrack." vibe */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tighter text-black"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded bg-black text-white">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <span>JobTrack.</span>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link href="/Dashboard">
                <Button
                  variant="ghost"
                  className="text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-black"
                >
                  Dashboard
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8 border border-zinc-200">
                      <AvatarFallback className="bg-zinc-100 text-xs font-medium text-black">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[220px] border-zinc-200 p-2">
                  <DropdownMenuLabel>
                    <div className="space-y-1 px-2 py-1.5">
                      <p className="text-sm font-medium leading-none text-black">{displayName}</p>
                      {user?.email ? (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      ) : null}
                    </div>
                  </DropdownMenuLabel>
                  {/* Divider can be added here if SignOutBtn doesn't have one */}
                  <SignOutBtn />
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Optional: Add "Features" link here if you want it to appear on all pages */}
              
              <Button variant="ghost" asChild className="hidden text-sm font-medium text-zinc-600 hover:text-black sm:inline-flex">
                <Link href="/sign-in">
                  Log In
                </Link>
              </Button>

              <Button asChild className="rounded-full bg-black px-6 font-medium text-white transition-transform hover:bg-zinc-800 hover:scale-105 active:scale-95">
                <Link href="/sign-up">Start for Free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}