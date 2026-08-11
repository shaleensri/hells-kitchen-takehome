import { describe, expect, it } from "vitest";
import { appendExchange, MAX_STORED_EXCHANGES } from "./askHistory";

describe("appendExchange", () => {
  it("appends to an empty list", () => {
    expect(appendExchange([], { question: "q1", answer: "a1" })).toEqual([{ question: "q1", answer: "a1" }]);
  });

  it("appends after existing exchanges, preserving order", () => {
    const current = [{ question: "q1", answer: "a1" }];
    expect(appendExchange(current, { question: "q2", answer: "a2" })).toEqual([
      { question: "q1", answer: "a1" },
      { question: "q2", answer: "a2" },
    ]);
  });

  it("does not mutate the input array", () => {
    const current = [{ question: "q1", answer: "a1" }];
    appendExchange(current, { question: "q2", answer: "a2" });
    expect(current).toHaveLength(1);
  });

  it("caps the stored history at MAX_STORED_EXCHANGES, dropping the oldest first", () => {
    const current = Array.from({ length: MAX_STORED_EXCHANGES }, (_, i) => ({
      question: `q${i}`,
      answer: `a${i}`,
    }));
    const next = appendExchange(current, { question: "newest", answer: "newest-answer" });
    expect(next).toHaveLength(MAX_STORED_EXCHANGES);
    expect(next[0].question).toBe("q1"); // q0 dropped
    expect(next[next.length - 1].question).toBe("newest");
  });
});
