"use client";

import { useState, useRef, useEffect } from "react";
import { getChatHistory, logout, getConversations, createConversation } from "./lib/actions";

type Message = {
  role: "user" | "mishima";
  content: string;
};

type Mode = "iron" | "satire";

type Conversation = {
  id: string;
  title: string;
  createdAt: Date;
};

// ▼ 拡声器の「音割れ」を作るための数学的カーブ生成関数
function makeDistortionCurve(amount = 50) {
  const k = typeof amount === "number" ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("iron");
  const [isLoading, setIsLoading] = useState(false);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const [voiceState, setVoiceState] = useState<{
    idx: number;
    status: "loading" | "playing";
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 初回ロード時にサイドバー用のチャット履歴一覧を取得
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const convs = await getConversations();
        setConversations(convs);
      } catch (err) {
        console.error("履歴一覧の取得に失敗:", err);
      }
    };
    fetchConversations();
  }, []);

  // 現在のチャット(currentConversationId)が変わったらメッセージ履歴を読み込む
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getChatHistory(currentConversationId);
        setMessages(history);
      } catch (err) {
        console.error("履歴の取得に失敗:", err);
      }
    };
    fetchHistory();
  }, [currentConversationId]);

  // メッセージが増えたら自動で最下部へスクロール
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const playMishimaVoice = async (text: string, idx: number) => {
    if (voiceState !== null) return;
    try {
      setVoiceState({ idx, status: "loading" });
      const speakerId = 11;
      const queryRes = await fetch(
        `http://127.0.0.1:50021/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
        { method: "POST" },
      );
      if (!queryRes.ok) throw new Error("VOICEVOX クエリ作成失敗");
      const queryJson = await queryRes.json();

      const synthRes = await fetch(
        `http://127.0.0.1:50021/synthesis?speaker=${speakerId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queryJson),
        },
      );
      if (!synthRes.ok) throw new Error("VOICEVOX 音声合成失敗");
      const audioBlob = await synthRes.blob();

      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as Window & typeof globalThis & { webkitAudioContext: any }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);

      const source = audioCtxRef.current.createBufferSource();
      source.buffer = audioBuffer;

      const distortion = audioCtxRef.current.createWaveShaper();
      distortion.curve = makeDistortionCurve(80);
      distortion.oversample = "4x";

      const bandpass = audioCtxRef.current.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 1200;

      source.connect(distortion);
      distortion.connect(bandpass);
      bandpass.connect(audioCtxRef.current.destination);

      source.onended = () => {
        setVoiceState(null);
      };

      setVoiceState({ idx, status: "playing" });
      source.start();
    } catch (error) {
      console.error("音声再生エラー:", error);
      setVoiceState(null);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let targetConvId = currentConversationId;

    // 新規チャットの場合、DBにconversationレコードを作成する
    if (!targetConvId) {
      const title = input.slice(0, 20) + (input.length > 20 ? "..." : "");
      const newConvId = await createConversation(title);
      if (newConvId) {
        targetConvId = newConvId;
        setCurrentConversationId(newConvId);
        // サイドバーを更新
        const updatedConvs = await getConversations();
        setConversations(updatedConvs);
      }
    }

    const userMessage: Message = { role: "user", content: input };
    const initialMishimaMessage: Message = { role: "mishima", content: "" };

    setMessages((prev) => [...prev, userMessage, initialMishimaMessage]);
    setInput("");
    setIsLoading(true);

    const chatHistory = [...messages, userMessage].map((m) => ({
      role: m.role === "user" ? "user" : "model",
      content: m.content,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory, mode, conversationId: targetConvId }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      if (!response.body) throw new Error("応答の取得に失敗しました。");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let chunks = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          chunks += decoder.decode(value, { stream: !done });
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = { ...updated[lastIndex], content: chunks };
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("エラー:", error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "mishima", content: "対談の途中で通信が途絶した。霊界の壁は厚いようだ。" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-serif selection:bg-red-900 selection:text-white overflow-hidden">
      {/* サイドバー */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-900/50 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-neutral-800">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-2 bg-neutral-950 hover:bg-red-950/40 text-neutral-300 border border-neutral-700 hover:border-red-900/50 px-4 py-2 rounded transition-all font-sans text-sm tracking-widest"
          >
            <span>＋</span>
            <span>新規対談</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setCurrentConversationId(conv.id)}
              className={`w-full text-left px-3 py-3 rounded text-sm font-sans truncate transition-colors ${
                currentConversationId === conv.id
                  ? "bg-red-950/30 text-red-200 border border-red-900/30"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-transparent"
              }`}
            >
              {conv.title}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-neutral-800 flex justify-center">
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-neutral-500 hover:text-red-400 transition-colors font-sans underline underline-offset-2"
            >
              血判を破棄（ログアウト）
            </button>
          </form>
        </div>
      </aside>

      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col h-screen relative">
        <header className="border-b border-neutral-800 p-4 flex justify-between items-center bg-neutral-900/50 backdrop-blur">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-widest text-red-700 font-sans">
              三島対談
            </h1>
            <span className="hidden md:block text-xs text-neutral-500 font-sans tracking-widest border-l border-neutral-700 pl-3">
              {currentConversationId ? "記録の閲覧" : "新たな対話"}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2 bg-neutral-950 p-1 rounded border border-neutral-800 font-sans">
              <button
                onClick={() => setMode("iron")}
                className={`px-3 py-1 text-sm rounded transition-all duration-300 ${
                  mode === "iron"
                    ? "bg-red-950 text-red-200 border border-red-800"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                太陽と鉄 (実存)
              </button>
              <button
                onClick={() => setMode("satire")}
                className={`px-3 py-1 text-sm rounded transition-all duration-300 ${
                  mode === "satire"
                    ? "bg-amber-950 text-amber-200 border border-amber-800"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                不道徳教育 (皮肉)
              </button>
            </div>
            {/* スマホ用ログアウト（サイドバーが隠れるため） */}
            <div className="md:hidden">
              <form action={logout}>
                <button type="submit" className="text-xs text-neutral-400 hover:text-neutral-200 font-sans underline">
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </header>

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
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] p-4 rounded border transition-all duration-300 ${
                  msg.role === "user"
                    ? "bg-neutral-900 border-neutral-800 text-neutral-200 font-sans"
                    : "bg-neutral-900/30 border-red-950/40 text-neutral-100 shadow-xl shadow-red-950/5"
                }`}
              >
                <div className={`text-xs mb-2 font-sans tracking-wider ${msg.role === "user" ? "text-neutral-500 text-right" : "text-red-700 font-bold"}`}>
                  {msg.role === "user" ? "生者" : "三島由紀夫"}
                </div>

                {msg.role === "mishima" && msg.content === "" && isLoading ? (
                  <div className="flex items-center space-x-2 py-1 text-neutral-500 text-sm animate-fade-in">
                    <span className="font-serif italic tracking-wide text-xs text-neutral-600 mr-1">
                      思考を言語化している
                    </span>
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-red-800 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-red-700 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="leading-relaxed whitespace-pre-wrap tracking-wide">{msg.content}</p>

                    {msg.role === "mishima" && !isLoading && (
                      <div className="mt-3 flex justify-end animate-fade-in">
                        <button
                          onClick={() => playMishimaVoice(msg.content, idx)}
                          disabled={voiceState !== null}
                          className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded border transition-all duration-300 ${
                            voiceState?.idx === idx
                              ? "bg-red-950/80 text-red-200 border-red-700 animate-pulse font-bold"
                              : "bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:bg-red-950/40 hover:text-red-300 hover:border-red-900/50 disabled:opacity-30"
                          }`}
                        >
                          {voiceState?.idx === idx ? (
                            <>
                              <span className="text-[10px]">{voiceState.status === "loading" ? "⏳" : "📢"}</span>
                              <span className="font-sans tracking-widest">{voiceState.status === "loading" ? "言霊を錬成中..." : "肉声再生中..."}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px]">🔊</span>
                              <span className="font-sans tracking-widest">肉声で聴く</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </main>

        <footer className="border-t border-neutral-800 p-4 bg-neutral-900/30 backdrop-blur">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex space-x-2">
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
    </div>
  );
}
