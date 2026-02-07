import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    // Make sure 'NEXT_PUBLIC_BETTER_AUTH_URL' is in your .env file
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL! 
});

// Fixed: Changed SignIn/SignUp to signIn/signUp to match the library's actual function names
export const { 
    signIn, 
    signUp, 
    signOut, 
    useSession 
} = authClient;