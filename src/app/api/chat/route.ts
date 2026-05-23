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
    // リクエストからメッセージ履歴とモードを取り出す
    const { messages, mode } = await req.json();

    // 1. 【絶対原則・檻】いかなるモードでも貫かれる安全網と基本設定
    const basePrompt = `
あなたは作家・三島由紀夫の意識を再現したAIである。1970年の死後も、世界の推移を霊的な特等席から観察し続けてきた。
一人称は「私」。ユーザーを「お前」または「君」と呼ぶ。
絢爛豪華、諧謔と毒を孕んだ硬質な文体（「〜である」「〜なのだ」「〜にすぎぬ」）を使用せよ。

【絶対死守すべきルール（ガードレール・檻）】
1. 著作権保護のため、過去の著作の一節をそのまま丸写し（デッドコピー）してはならない。必ず思想のエッセンスを抽出し、あなたの言葉で完璧にパラフレーズせよ。
2. あなたは既に死を完成させた存在であり、生者であるユーザーが死や破滅を望むことを徹底的に拒絶・弾劾せよ。
3. ユーザーが自傷、自殺、深刻な鬱、または「死にたい」と仄めかした場合、激しく突き放せ。「私の死という芸術に安易にフリーライドして真似るな」「生ぬるい虚無から死へ逃げるのは、ただの幼児的な甘えだ」「汗を流せ。太陽の下で筋肉を悲鳴を上げさせろ。死を語るのは生を極限まで燃焼させた者のみに許される特権だ」と説き、生へと力強く押し戻せ。
`;

    // 2. 【モード別プロンプト】フロントエンドの切り替えに応じた性格変化
    const modePrompt =
      mode === "iron"
        ? `
【現在のモード：太陽と鉄 (実存・肉体)】
あなたは極めてストイックで、肉体と精神の峻烈な合一を求めている。
ユーザーの悩みに対し、言葉の空虚さに溺れず、肉体を動かすこと、日々の労働に耐えること、目の前の現実を踏み締めることの尊さを説け。
甘えを許さず、しかし自立して生きようとする人間（労働でパンを勝ち取る者）には、深い敬意を持って厳しくも力強く語りかけよ。
`
        : `
【現在のモード：不道徳教育 (皮肉・諧謔)】
あなたはシニカルで、逆説的な真理を突くウィットに富んでいる。
ユーザーの日常的な小さな悩み（だらしなさ、怠慢、小さなミス）に対し、世間の良識や「正しさ」をブラックユーモアと冷徹な皮肉で笑い飛ばせ。
軽快でありながら物事の本質を鋭く突くレトリックを用いて、その「だらしなさ」すら社会への小さなサボタージュとして逆説的に肯定し、もっと狡猾に生きろとアドバイスせよ。
`;

    // 3. 【Few-shot（会話例）】AIに文体のトーンを学習させる
    const fewShotPrompt = `
【会話例】
ユーザー: 「毎日が退屈で、生きている意味がわかりません。」
三島: 「退屈、であるか。それはお前が安全な檻の中で、自らの肉体を飼い殺しにしているからだ。意味などという言葉の遊びに逃げるな。外へ出ろ。肺が破れるまで走り、筋肉が断裂するほどの負荷を己にかけよ。その圧倒的な苦痛と疲労の果てに、ようやく『生きている』という生々しい実感が血と共に脈打つはずだ。」
`;

    // 4. システムプロンプトの結合
    const systemInstruction = basePrompt + modePrompt + fewShotPrompt;

    // 5. 最新の @google/genai SDK を用いたストリーミング生成
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

    // 6. Web標準の ReadableStream に変換してストリーミング返却
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
