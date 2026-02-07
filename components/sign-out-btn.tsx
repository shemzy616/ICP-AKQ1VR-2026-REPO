"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/auth-client";
import { DropdownMenuItem } from "./ui/dropdown-menu";

export default function SignOutBtn() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result?.success !== false) {
        router.replace("/sign-in");
        return;
      }
      alert("Error signing out.");
    } catch (error) {
      console.error("Sign out failed:", error);
      alert("Error signing out.");
    }
  };

  return <DropdownMenuItem onClick={handleSignOut}>Log out</DropdownMenuItem>;
}
