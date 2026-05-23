"use client"; // ⚠️ Next.jsの仕様：エラー監視コンポーネントは必ずClient Componentである必要があります

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 開発者ツールにエラーを出力（本番環境ではSentryなどの監視ツールに送る場所です）
    console.error("システム崩壊を検知:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-neutral-950 text-neutral-100 font-serif selection:bg-red-900 selection:text-white">
      <div className="space-y-6 text-center animate-fade-in p-10 border border-red-950/40 bg-neutral-900/30 rounded-lg shadow-2xl max-w-lg mx-auto">
        <h2 className="text-3xl font-bold tracking-widest text-red-800 font-sans">
          通信途絶
        </h2>
        <div className="w-12 h-px bg-red-900 mx-auto my-4"></div>
        <p className="text-neutral-400 italic text-lg tracking-wider leading-relaxed">
          「精神と肉体の接続が絶たれた。
          <br />
          霊界の壁に阻まれているようだ。」
        </p>
        <p className="text-xs text-neutral-600 font-sans mt-4 bg-neutral-950 p-2 rounded border border-neutral-800 break-all text-left">
          {/* デバッグ用にエラーメッセージを小さく表示 */}
          詳細: {error.message}
        </p>
        <div className="pt-8">
          <button
            onClick={() => reset()} // Next.jsが提供する「エラーからの復帰（再描画）を試みる」関数
            className="bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 px-8 py-3 rounded transition-all font-sans font-bold tracking-widest text-sm"
          >
            再接続を試みる
          </button>
        </div>
      </div>
    </div>
  );
}
