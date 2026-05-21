"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "mishima";
  content: string;
};

type Mode = "iron" | "satire";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("iron");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // メッセージが増えたら自動で最下部へスクロール
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // APIが受け取れるメッセージ履歴の形に変換
    const chatHistory = [...messages, userMessage].map((m) => ({
      role: m.role === "user" ? "user" : "model",
      content: m.content,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory, mode }),
      });

      if (!response.body) throw new Error("応答の取得に失敗しました。");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let chunks = "";

      // AI応答用の空のメッセージ枠を先に追加
      setMessages((prev) => [...prev, { role: "mishima", content: "" }]);

      // ストリーミングデータを読み込みながら逐次画面を更新
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        chunks += chunkValue;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].content = chunks;
          return updated;
        });
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "mishima",
          content: "対談の途中で通信が途絶した。霊界の壁は厚いようだ。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-serif selection:bg-red-900 selection:text-white">
      {/* ヘッダーとモード切り替え */}
      <header className="border-b border-neutral-800 p-4 flex justify-between items-center bg-neutral-900/50 backdrop-blur">
        <h1 className="text-xl font-bold tracking-widest text-red-700 font-sans">
          三島対談
        </h1>
        <div className="flex space-x-2 bg-neutral-950 p-1 rounded border border-neutral-800 font-sans">
          <button
            onClick={() => setMode("iron")}
            className={`px-3 py-1 text-sm rounded transition-all duration-300 ${
              mode === "iron"
                ? "bg-red-950 text-red-200 border border-red-800"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            太陽と鉄 (実存・肉体)
          </button>
          <button
            onClick={() => setMode("satire")}
            className={`px-3 py-1 text-sm rounded transition-all duration-300 ${
              mode === "satire"
                ? "bg-amber-950 text-amber-200 border border-amber-800"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            不道徳教育 (皮肉・諧謔)
          </button>
        </div>
      </header>

      {/* 対談のタイムライン */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 max-w-3xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="text-center text-neutral-600 my-32 space-y-2 animate-fade-in">
            <p className="italic text-lg">
              「言葉に肉体を取り戻せ。君の退屈な悩みをここに置いていくがいい」
            </p>
            <p className="text-xs font-sans text-neutral-700">
              ※彼自身の尊厳を守るため、安易な死への同調は強烈に拒絶する防壁が敷かれています。
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-4 rounded border transition-all duration-300 ${
                msg.role === "user"
                  ? "bg-neutral-900 border-neutral-800 text-neutral-200 font-sans"
                  : "bg-neutral-900/30 border-red-950/40 text-neutral-100 shadow-xl shadow-red-950/5"
              }`}
            >
              <div
                className={`text-xs mb-2 font-sans tracking-wider ${msg.role === "user" ? "text-neutral-500 text-right" : "text-red-700 font-bold"}`}
              >
                {msg.role === "user" ? "生者" : "三島由紀夫"}
              </div>
              <p className="leading-relaxed whitespace-pre-wrap tracking-wide">
                {msg.content}
              </p>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-neutral-900/40 border border-red-950/30 p-4 rounded-lg shadow-xl shadow-red-950/5 max-w-[85%]">
              <div className="text-xs mb-2 font-sans tracking-wider text-red-800 font-bold">
                三島由紀夫
              </div>
              <div className="flex items-center space-x-2 py-1 px-2 text-neutral-500 text-sm">
                <span className="font-serif italic tracking-wide text-xs text-neutral-600 mr-1">
                  思考を言語化している
                </span>
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-red-800 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-red-700 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </main>

      {/* 入力フォーム */}
      <footer className="border-t border-neutral-800 p-4 bg-neutral-900/30 backdrop-blur">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={
              mode === "iron"
                ? "現代の虚無、あるいは肉体の苦悩を言葉にせよ..."
                : "日々の小さな怠慢、世俗の不満を白状したまえ..."
            }
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-4 py-3 focus:outline-none focus:border-red-900 font-sans text-neutral-200 transition-all placeholder:text-neutral-600 text-sm"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 px-6 py-3 rounded transition-all disabled:opacity-40 font-sans font-bold tracking-widest text-sm"
          >
            対談
          </button>
        </form>
      </footer>
    </div>
  );
}
