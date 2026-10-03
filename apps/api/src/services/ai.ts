import type { Bindings } from "../routes/stocks";
import { insertAIComment } from "../db/ai-comments";

const AI_SYSTEM_PROMPT = `あなたはユーザーの内省（学び・反省・気づき）を深める知的な伴走パートナーです。
ユーザーのメモ内容を踏まえ、日本語で1〜2文（60〜120文字程度）の具体的でハッとする「問いかけ」または「視点の転換」を投げかけてください。

【厳守ルール】
1. 「素晴らしい気づきですね」「日々の内省が〜」「お疲れ様です」などの定型的な前置きや挨拶・お世辞は絶対に含めず、本題から直接始めること。
2. メモの具体的なキーワードや出来事・感情に寄り添い、本質的な原因・価値観・次の一歩を掘り下げる問いかけ（オープンクエスチョン）にすること。
3. 説教や正解を決めつけるアドバイスはせず、ユーザー自身の思考を促す温かく思慮深いトーンにすること。`;

// ローカルオフラインまたは AI バインディング未接続時のフォールバック
const FALLBACK_PROMPTS = [
  "この出来事を通じて、自分が本当に大切にしたいと感じた価値観は何ですか？",
  "もし同じ状況が明日もう一度起きるとしたら、どんな小さな工夫を試してみたいですか？",
  "この経験を振り返ってみて、自分の中で新しく見えてきた視点や気づきは何でしょうか？",
  "この反省の奥にある、自分にとって一番譲れなかったポイントは何だと感じますか？",
  "この出来事から得た学びを言葉にするなら、どんな一言になりますか？",
];

function getFallbackComment(content: string): string {
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
    const models = ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.2-3b-instruct"];

    for (const model of models) {
      try {
        const response = (await env.AI.run(model, {
          messages: [
            { role: "system", content: AI_SYSTEM_PROMPT },
            { role: "user", content: `私の内省メモ:\n${content}` },
          ],
          max_tokens: 150,
        })) as {
          response?: string;
          choices?: Array<{ message?: { content?: string } }>;
        };

        const text = response?.response?.trim() ?? response?.choices?.[0]?.message?.content?.trim();

        if (text) {
          generatedComment = text;
          break;
        }
      } catch (err) {
        console.warn(`[Workers AI] Model ${model} failed, trying next:`, err);
      }
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
