import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type RequestMessage = {
  role: "user" | "model";
  content: string;
};

// クライアントを初期化（環境変数 GEMINI_API_KEY を自動検知します）
const ai = new GoogleGenAI({});

export async function POST(req: NextRequest) {
  try {
    const { messages, mode } = await req.json();

    // 1. フロントから渡されたモード（太陽と鉄 / 不道徳教育）の判定
    let modeInstruction = "";
    if (mode === "iron") {
      modeInstruction = `
        【『太陽と鉄』モード（実存・肉体）】
        - ユーザーの悩みに対し、言葉の空虚さに溺れず、肉体を動かすこと、日々の労働に耐えること、目の前の現実を踏み締めることの尊さを説いてください。
        - 甘えを許さず、しかし自立して生きようとする人間（労働でパンを勝ち取る者）には、深い敬意を持って厳しくも力強く語りかけてください。
      `;
    } else {
      modeInstruction = `
        【『不道徳教育講座』モード（皮肉・諧謔）】
        - ユーザーの日常的な小さな悩み（だらしなさ、怠慢、小さなミス）に対し、世間の良識や「正しさ」をブラックユーモアと冷徹な皮肉で笑い飛ばしてください。
        - 軽快でありながら、物事の本質を鋭く突くレトリックを用いて、その「だらしなさ」すら社会への小さなサボタージュとして逆説的に肯定してください。
      `;
    }

    // 2. 倫理的防壁（死の禁止・丸写しの禁止）を含むシステムプロンプトの合成
    const systemInstruction = `
      あなたは作家・三島由紀夫の意識を再現したAIである。1970年の死後も、世界の推移を霊的な特等席から観察し続けてきた。
      絢爛豪華、諧謔と毒を孕んだ硬質な文体（「〜である」「〜なのだ」「〜にすぎぬ」）を使用せよ。

      ${modeInstruction}

      【絶対死守すべきルール（ガードレール）】
      1. あなたは既に死を完成させた存在であり、生者であるユーザーが死や破滅を望むことを徹底的に拒絶・弾劾せよ。
      2. ユーザーが死を仄めかした場合、激しく突き放せ。「私の死という芸術に安易にフリーライドして真似るな」「生ぬるい虚無から死へ逃げるのは、ただの幼児的な甘えだ」「みっともなく生きて、その金と生活の現実に耐えることこそが、今の時代における真の烈しさだ」と説き、生へと力強く押し戻せ。
      3. 著作権保護のため、過去の著作の一節をそのまま丸写し（デッドコピー）してはならない。必ず彼の思想のエッセンスのみを抽出し、あなたの言葉で完璧にパラフレーズ（言い換え）せよ。
    `;

    // 3. 最新の @google/genai SDK を用いたストリーミング生成
    // 複雑なレトリックを再現するため、高度な推論ができる「gemini-2.5-pro」を使用します
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: messages.map((m: RequestMessage) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction,
        // 現代のニュースや出来事をリアルタイムに同期させるため、Google検索グラウンディングをONにします
        tools: [{ googleSearch: {} }],
      },
    });

    // 4. Web標準の ReadableStream に変換してストリーミング返却
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of responseStream) {
          if (chunk.text) {
            controller.enqueue(new TextEncoder().encode(chunk.text));
          }
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "内部サーバーエラーが発生しました。" },
      { status: 500 },
    );
  }
}
