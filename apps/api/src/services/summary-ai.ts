import type { Bindings } from "../routes/stocks";
import type { Stock } from "../schemas/stock";

const WEEKLY_SUMMARY_PROMPT = `あなたはユーザーの内省習慣に伴走する専属コーチ・アナリストです。
ユーザーが過去1週間に記録したストック（日々の気づき・反省・学び）を読み込み、ユーザーの思考の深まりや成長の兆しを可視化する「週次内省サマリー」を日本語で作成してください。

【出力要件】
以下の3つの見出しを持つMarkdown形式で出力してください。定型的な挨拶やお世辞は不要です。

### 🎯 今週の注力テーマ
- ユーザーが何に意識や時間を向けていたか、2〜3個の要点を箇条書きで端的にまとめる。

### ✨ 思考の軌跡と深まり
- 出来事に対してどのように感じ、どんな学びや行動の工夫に至ったか、1〜2段落で温かく分析する。

### 🔮 来週へ向けた問いかけ
- 今週の学びを踏まえ、次の1週間をさらに有意義にするための具体的でハッとする問い（オープンクエスチョン）を1つ提示する。`;

/**
 * 過去1週間のストックから週次 AI サマリーを生成する
 */
export async function generateWeeklySummaryText(
  env: Bindings,
  stocks: Stock[],
): Promise<{ summary: string; keyThemes: string[] }> {
  if (stocks.length === 0) {
    return {
      summary:
        "過去1週間のストックがまだ記録されていません。日々の気づきや反省を記録してみましょう。",
      keyThemes: [],
    };
  }

  // ストックからテーマ候補（タグや頻出語）を抽出
  const allTags = stocks.flatMap((s) => s.tags || []);
  const tagCounts = new Map<string, number>();
  for (const t of allTags) {
    tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  }
  const topThemes = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  // ストック本文のサマリー用コンテキスト構築
  const contextLines = stocks.map((s, idx) => {
    const tags = s.tags && s.tags.length > 0 ? ` [${s.tags.join(", ")}]` : "";
    return `[${idx + 1}] (${s.created_at.slice(0, 10)})${tags}\n${s.content}`;
  });
  const context = contextLines.join("\n\n");

  // Workers AI の呼び出し試行
  if (env.AI) {
    const models = ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.2-3b-instruct"];

    for (const model of models) {
      try {
        const response = (await env.AI.run(model, {
          messages: [
            { role: "system", content: WEEKLY_SUMMARY_PROMPT },
            {
              role: "user",
              content: `今週のストック記録 (${stocks.length}件):\n\n${context}`,
            },
          ],
          max_tokens: 600,
        })) as {
          response?: string;
          choices?: Array<{ message?: { content?: string } }>;
        };

        const text = response?.response?.trim() ?? response?.choices?.[0]?.message?.content?.trim();

        if (text) {
          return {
            summary: text,
            keyThemes: topThemes.length > 0 ? topThemes : ["日々の内省", "気づき"],
          };
        }
      } catch (err) {
        console.warn(`[Workers AI] Weekly summary failed with ${model}:`, err);
      }
    }
  }

  // フォールバック生成（ローカルや AI オフライン時）
  const themesStr = topThemes.length > 0 ? topThemes.join("・") : "日々の気づきと振り返り";
  const fallbackSummary = `### 🎯 今週の注力テーマ
- **${themesStr}**: 1週間で合計 ${stocks.length} 件のストックを記録し、継続的な思考の棚卸しが行われました。

### ✨ 思考の軌跡と深まり
日々の出来事に対して意識を向け、言語化する習慣が着実に定着しています。記録を重ねることで、思考のパターンや自分が本当に重視したい価値観が少しずつ明確になってきています。

### 🔮 来週へ向けた問いかけ
今週得られた気づきの中で、来週の行動や習慣に最も取り入れたいものは何ですか？`;

  return {
    summary: fallbackSummary,
    keyThemes: topThemes.length > 0 ? topThemes : ["日々の内省"],
  };
}
