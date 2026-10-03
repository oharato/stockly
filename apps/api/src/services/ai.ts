import type { Bindings } from "../routes/stocks";
import { insertAIComment } from "../db/ai-comments";

const AI_SYSTEM_PROMPT = `あなたはユーザーの内省（学び・反省・気づき）を深める伴走コーチです。
以下のルールに従って、日本語で1〜2文（80〜120文字程度）の簡潔な「問いかけ」または「共感・視点の転換」を返してください。
1. 説教や正解の押し付けをしない
2. ユーザーの思考をさらに一歩広げるオープンクエスチョン（問い）を含める
3. フレンドリーで温かみのある口調で`;

// ローカルオフラインまたは AI バインディング未接続時のスマートフォールバック
const FALLBACK_PROMPTS = [
  "素晴らしい気づきですね！この学びを次に活かすとしたら、明日の行動にどんな小さな工夫を加えられそうですか？",
  "日々の内省が着実に前進を生んでいますね。もしこの経験を過去の自分にアドバイスするとしたら、何と伝えますか？",
  "立ち止まって考える習慣が素晴らしいです。この出来事の背景にある、自分にとって一番大切にしたい価値観は何でしょうか？",
  "実践したからこそ見えてきた視点ですね！この挑戦から得られた一番の収穫は何だと感じていますか？",
];

function getFallbackComment(content: string): string {
  // コンテンツのハッシュ値等で決定的に選択
  const hash = content.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_PROMPTS[hash % FALLBACK_PROMPTS.length];
}

/**
 * 非同期で AI コメントを生成し、ai_comments テーブルへ保存する
 */
export async function generateAndSaveAIComment(
  env: Bindings,
  stockId: string,
  content: string,
): Promise<string> {
  const commentId = crypto.randomUUID();
  const now = new Date().toISOString();
  let generatedComment: string | null = null;

  // Workers AI バインディングが利用可能な場合は呼び出しを試行
  if (env.AI) {
    try {
      const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: `私の内省メモ:\n${content}` },
        ],
        max_tokens: 150,
      });

      if (response && typeof response === "object" && "response" in response) {
        generatedComment = (response as { response: string }).response.trim();
      }
    } catch (err) {
      console.warn("[Workers AI] Remote call skipped or failed, using fallback:", err);
    }
  }

  // AI 呼び出しが未設定または失敗した場合はフォールバックを使用
  if (!generatedComment) {
    generatedComment = getFallbackComment(content);
  }

  // ai_comments テーブルへ保存
  try {
    await insertAIComment(env.DB, {
      id: commentId,
      stockId,
      comment: generatedComment,
      createdAt: now,
    });
  } catch (err) {
    console.error("[Database] Failed to insert ai_comment:", err);
  }

  return generatedComment;
}
