"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [working, setWorking] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setWorking(true);

        try {
            await login(email, password);
            router.push("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not log in.");
        } finally {
            setWorking(false);
        }
    }

    return (
        <div className="mx-auto max-w-md px-6 py-20">
            <h1 className="font-display text-4xl italic text-ink">Log in</h1>
            <p className="mt-2 text-ink-soft">Access your tools and saved PDFs.</p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm text-ink">
                    Email
                    <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="transition-standard rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                </label>

                <label className="flex flex-col gap-1 text-sm text-ink">
                    Password
                    <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="transition-standard rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                </label>

                {error && <p className="text-sm text-danger">{error}</p>}

                <button
                    type="submit"
                    disabled={working}
                    className="transition-standard rounded-full bg-accent px-6 py-2.5 font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {working ? "Logging in…" : "Log in"}
                </button>
            </form>

            <p className="mt-6 text-sm text-ink-soft">
                No account?{" "}
                <Link href="/signup" className="font-medium text-accent hover:underline">
                    Create one
                </Link>
            </p>
        </div>
    );
}
