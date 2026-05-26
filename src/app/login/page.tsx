"use client";

import { useActionState } from "react";
import { authenticate } from "../lib/actions"; // 確実な相対パスに変更
import Link from "next/link";

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-neutral-950 text-neutral-100 font-serif selection:bg-red-900 selection:text-white">
      <div className="w-full max-w-md p-8 border border-neutral-800 bg-neutral-900/30 rounded-lg shadow-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-widest text-red-700 font-sans">
            三島対談 — 門
          </h1>
          <p className="text-xs text-neutral-500 font-sans mt-2">
            生者の身元を証明せよ
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
              defaultValue="user@nextmail.com"
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
              defaultValue="mishima1970"
              placeholder="••••••••"
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
            {isPending ? "門を開扉中..." : "入室する"}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/signup" className="text-xs text-neutral-500 hover:text-red-400 transition-colors font-sans">
            まだ血判を捺していない者（新規登録）はこちら
          </Link>
        </div>
      </div>
    </div>
  );
}
