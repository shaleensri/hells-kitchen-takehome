/**
 * Minimal markdown parser for LLM answers (PLAN.md §3.29). The model
 * routinely emits `**bold**`, inline `` `code` ``, and bullet/numbered
 * lists (asked to keep formatting light in the system prompt, llm.ts, but
 * not to avoid it entirely) — rendering that as literal asterisks read as
 * unprofessional. Deliberately not a full markdown library (no headings,
 * tables, nested lists, links): the domain is narrow (short cooking-
 * assistant answers), and pulling in a dependency for four token types is
 * more than this needs. Pure data output (no JSX) so it's plain-Vitest
 * testable — the thin rendering layer lives in
 * app/_components/MarkdownLite.tsx, verified visually instead, matching
 * this project's established pure-logic-vs-UI test split.
 */

export type InlineToken = { type: "text"; value: string } | { type: "bold"; value: string } | { type: "code"; value: string };

export type Block = { type: "paragraph"; lines: InlineToken[][] } | { type: "list"; ordered: boolean; items: InlineToken[][] };

const BOLD_OR_CODE = /\*\*(.+?)\*\*|`(.+?)`/g;
const BULLET_LINE = /^[-*]\s+/;
const NUMBERED_LINE = /^\d+\.\s+/;

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  BOLD_OR_CODE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BOLD_OR_CODE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ type: "bold", value: match[1] });
    } else {
      tokens.push({ type: "code", value: match[2] });
    }
    lastIndex = BOLD_OR_CODE.lastIndex;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}

export function parseBlocks(text: string): Block[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const blocks: Block[] = [];
  for (const raw of normalized.split(/\n{2,}/)) {
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    const allBullet = lines.every((l) => BULLET_LINE.test(l));
    const allNumbered = !allBullet && lines.every((l) => NUMBERED_LINE.test(l));

    if (allBullet || allNumbered) {
      const stripPrefix = allBullet ? BULLET_LINE : NUMBERED_LINE;
      blocks.push({
        type: "list",
        ordered: allNumbered,
        items: lines.map((l) => parseInline(l.replace(stripPrefix, ""))),
      });
    } else {
      blocks.push({ type: "paragraph", lines: lines.map(parseInline) });
    }
  }
  return blocks;
}
