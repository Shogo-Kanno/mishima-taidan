import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-neutral-950 text-neutral-100 font-serif selection:bg-red-900 selection:text-white">
      <div className="space-y-6 text-center animate-fade-in p-10 border border-neutral-800 bg-neutral-900/30 rounded-lg shadow-2xl max-w-lg mx-auto">
        <h2 className="text-4xl font-bold tracking-widest text-red-800 font-sans">
          四〇四
        </h2>
        <div className="w-12 h-px bg-red-900 mx-auto my-4"></div>
        <p className="text-neutral-400 italic text-lg tracking-wider leading-relaxed">
          「生者よ、ここは道ではない。
          <br />
          虚無へ迷い込んだか。」
        </p>
        <p className="text-sm text-neutral-600 font-sans mt-4">
          あなたの探しているページは、この世界には存在しません。
        </p>
        <div className="pt-8">
          <Link
            href="/"
            className="bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 px-8 py-3 rounded transition-all font-sans font-bold tracking-widest text-sm inline-block"
          >
            対談の間へ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
