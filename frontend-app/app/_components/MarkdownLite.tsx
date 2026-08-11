/**
 * Thin rendering layer over lib/markdownLite.ts's pure parser — see that
 * file for why this exists (PLAN.md §3.29). No "use client" needed: this
 * has no state/hooks, safe to render from a server or client parent either
 * way (its one caller, AskAboutRecipe.tsx, happens to be a client component).
 */
import type { InlineToken } from "@/lib/markdownLite";
import { parseBlocks } from "@/lib/markdownLite";

function renderInline(tokens: InlineToken[]) {
  return tokens.map((token, i) => {
    if (token.type === "bold") return <strong key={i}>{token.value}</strong>;
    if (token.type === "code") return <code key={i}>{token.value}</code>;
    return token.value;
  });
}

export function MarkdownLite({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ListTag>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <span key={j}>
                {renderInline(line)}
                {j < block.lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}
