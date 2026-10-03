import type { Stock } from "../schemas/stock";

/**
 * ストック配列を Markdown 形式に変換
 */
export function formatAsMarkdown(stocks: Stock[], exportDateStr: string): string {
  let md = `# Stockly エクスポート (${exportDateStr})\n\n`;
  md += `累計ストック件数: ${stocks.length}件\n\n---\n\n`;

  for (const stock of stocks) {
    const date = new Date(stock.created_at);
    // JST 表示形式
    const jstStr = date.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    md += `## ${jstStr}\n\n`;

    if (stock.tags && stock.tags.length > 0) {
      md += `**タグ**: ${stock.tags.map((t) => `#${t}`).join(" ")}\n\n`;
    }

    md += `${stock.content}\n\n`;

    if (stock.ai_comment) {
      md += `> 💡 **AIからの問いかけ**: ${stock.ai_comment}\n\n`;
    }

    if (stock.image_keys) {
      try {
        const keys: string[] = JSON.parse(stock.image_keys);
        if (keys.length > 0) {
          md += `**添付画像キー**: ${keys.join(", ")}\n\n`;
        }
      } catch {
        // ignore parse error
      }
    }

    md += `---\n\n`;
  }

  return md;
}

/**
 * CSV カラムのエスケープ処理 (RFC 4180)
 */
function escapeCsv(value: string | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * ストック配列を CSV 形式に変換
 */
export function formatAsCsv(stocks: Stock[]): string {
  const header = ["id", "created_at", "content", "tags", "ai_comment", "image_keys"];
  const rows = [header.join(",")];

  for (const stock of stocks) {
    const tagsStr = stock.tags ? stock.tags.join(";") : "";
    const row = [
      escapeCsv(stock.id),
      escapeCsv(stock.created_at),
      escapeCsv(stock.content),
      escapeCsv(tagsStr),
      escapeCsv(stock.ai_comment),
      escapeCsv(stock.image_keys),
    ];
    rows.push(row.join(","));
  }

  return rows.join("\r\n");
}
