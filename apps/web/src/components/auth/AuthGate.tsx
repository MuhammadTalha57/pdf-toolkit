"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Spinner from "@/components/Spinner";
import { useAuth } from "./AuthProvider";

export default function AuthGate({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="mx-auto max-w-xl px-6 py-20 text-center">
                <Spinner label="Checking your session…" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="mx-auto max-w-xl px-6 py-20 text-center">
                <h1 className="font-display text-3xl italic text-ink">
                    Sign in to use this tool
                </h1>
                <p className="mt-3 text-ink-soft">
                    Your files and generated PDFs are stored against your account.
                </p>
                <div className="mt-8 flex justify-center gap-3">
                    <Link
                        href="/login"
                        className="transition-standard inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-medium text-white hover:bg-accent/90"
                    >
                        Log in
                    </Link>
                    <Link
                        href="/signup"
                        className="transition-standard inline-flex items-center gap-2 rounded-full border border-line px-6 py-2.5 font-medium text-ink hover:border-ink"
                    >
                        Create account
                    </Link>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
