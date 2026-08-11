import { describe, expect, it } from "vitest";
import { parseBlocks, parseInline } from "./markdownLite";

describe("parseInline", () => {
  it("returns a single text token for plain text", () => {
    expect(parseInline("just plain text")).toEqual([{ type: "text", value: "just plain text" }]);
  });

  it("parses a bold segment", () => {
    expect(parseInline("Use **fresh basil** for best flavor")).toEqual([
      { type: "text", value: "Use " },
      { type: "bold", value: "fresh basil" },
      { type: "text", value: " for best flavor" },
    ]);
  });

  it("parses an inline code segment", () => {
    expect(parseInline("Set the oven to `450°F`")).toEqual([
      { type: "text", value: "Set the oven to " },
      { type: "code", value: "450°F" },
    ]);
  });

  it("parses multiple bold segments in one line", () => {
    expect(parseInline("**Flour**: 2 cups. **Oil**: 1 tbsp.")).toEqual([
      { type: "bold", value: "Flour" },
      { type: "text", value: ": 2 cups. " },
      { type: "bold", value: "Oil" },
      { type: "text", value: ": 1 tbsp." },
    ]);
  });

  it("leaves an unmatched single asterisk as plain text", () => {
    expect(parseInline("2 * 3 = 6")).toEqual([{ type: "text", value: "2 * 3 = 6" }]);
  });
});

describe("parseBlocks", () => {
  it("treats a single line with no blank-line breaks as one paragraph", () => {
    expect(parseBlocks("Just a simple answer.")).toEqual([
      { type: "paragraph", lines: [[{ type: "text", value: "Just a simple answer." }]] },
    ]);
  });

  it("splits on blank lines into separate paragraphs", () => {
    const blocks = parseBlocks("First paragraph.\n\nSecond paragraph.");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[1].type).toBe("paragraph");
  });

  it("detects a bullet list (- prefix) and strips the marker", () => {
    const blocks = parseBlocks("- Fresh mozzarella\n- Dairy-free alternative");
    expect(blocks).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          [{ type: "text", value: "Fresh mozzarella" }],
          [{ type: "text", value: "Dairy-free alternative" }],
        ],
      },
    ]);
  });

  it("detects a bullet list using * prefix too", () => {
    const blocks = parseBlocks("* Option A\n* Option B");
    expect(blocks[0]).toMatchObject({ type: "list", ordered: false });
  });

  it("detects a numbered list and strips the marker, marking it ordered", () => {
    const blocks = parseBlocks("1. Fresh Mozzarella: use dairy-free\n2. Diced Tomatoes: use canned");
    expect(blocks[0]).toMatchObject({ type: "list", ordered: true });
    expect((blocks[0] as { items: unknown[] }).items).toHaveLength(2);
  });

  it("a real example from the live model output renders as one ordered list, bold terms parsed", () => {
    const text =
      "Sure! Here are two ingredient substitution ideas for the Classic Margherita Pizza:\n\n" +
      "1. **Fresh Mozzarella**: You can use shredded mozzarella or a dairy-free cheese alternative.\n" +
      "2. **Diced Tomatoes**: Canned crushed tomatoes work well too.\n\n" +
      "Let me know if you need more help!";
    const blocks = parseBlocks(text);
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "list", "paragraph"]);
    const list = blocks[1] as { type: "list"; ordered: boolean; items: { type: string; value: string }[][] };
    expect(list.ordered).toBe(true);
    expect(list.items[0][0]).toEqual({ type: "bold", value: "Fresh Mozzarella" });
  });

  it("does not treat a mixed block (some bullet lines, some not) as a list", () => {
    const blocks = parseBlocks("- Option A\nNot a bullet line");
    expect(blocks[0].type).toBe("paragraph");
  });

  it("returns an empty array for empty/whitespace-only input", () => {
    expect(parseBlocks("")).toEqual([]);
    expect(parseBlocks("   \n  ")).toEqual([]);
  });

  it("preserves multiple lines within a single paragraph block (single newline, no blank line)", () => {
    const blocks = parseBlocks("Line one.\nLine two.");
    expect(blocks).toHaveLength(1);
    expect((blocks[0] as { lines: unknown[] }).lines).toHaveLength(2);
  });
});
