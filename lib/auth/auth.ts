import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import initializeUserBoard from "../innit-user-board";

// Use a global variable to prevent multiple connections in development
const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db();

export const auth = betterAuth({
    // baseURL is required to avoid redirect_uri_mismatch errors
    baseURL: process.env.BETTER_AUTH_URL, 
    
    database: mongodbAdapter(db, {
        client,
    }),

    socialProviders: {
        google: { 
            // Better Auth uses these to construct the OAuth callback URL
            clientId: process.env.GOOGLE_CLIENT_ID as string, 
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            // Ensures users can choose a different account if they have multiple
            prompt: "select_account", 
        }, 
    },

    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60 // 1 day
        },
    },
    emailAndPassword: {
        enabled: true,
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    if (user) {
                        await initializeUserBoard(user.id);
                    }
                },
            },
        },
    },
});
export async function getSession() {
    const result = await auth.api.getSession(
        {
            headers: await headers()
        }
    );
    return result;
}
export async function signOut() {
    const result = await auth.api.signOut(
        {
            headers: await headers()
        }
    );

    if (result.success){
        redirect("/sign-in");
    }
}
