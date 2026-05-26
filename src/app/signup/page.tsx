"use client";

import { useActionState } from "react";
import { register } from "../lib/actions";
import Link from "next/link";

export default function SignupPage() {
  const [errorMessage, formAction, isPending] = useActionState(
    register,
    undefined,
  );

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-neutral-950 text-neutral-100 font-serif selection:bg-red-900 selection:text-white">
      <div className="w-full max-w-md p-8 border border-neutral-800 bg-neutral-900/30 rounded-lg shadow-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-widest text-red-700 font-sans">
            三島対談 — 契約
          </h1>
          <p className="text-xs text-neutral-500 font-sans mt-2">
            新たな魂を刻み込め
          </p>
        </div>

        <form action={formAction} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">
              電子留守（メールアドレス）
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="name@example.com"
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-4 py-3 text-neutral-200 text-sm focus:outline-none focus:border-red-900 transition-all placeholder:text-neutral-700"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">
              暗号鍵（パスワード）
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="6文字以上"
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-4 py-3 text-neutral-200 text-sm focus:outline-none focus:border-red-900 transition-all placeholder:text-neutral-700"
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-red-600 font-sans tracking-wide bg-red-950/20 border border-red-900/50 p-2 rounded">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 px-6 py-3 rounded transition-all disabled:opacity-40 font-bold tracking-widest text-sm mt-2 shadow-lg shadow-red-950/20"
          >
            {isPending ? "血判を捺印中..." : "血判を捺す（登録）"}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-xs text-neutral-500 hover:text-red-400 transition-colors font-sans">
            既に契約を済ませた者はこちら
          </Link>
        </div>
      </div>
    </div>
  );
}
