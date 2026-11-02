import { describe, expect, it } from "vitest";
import { getDemoQuestions, selectDemoQuestion } from "./chat-questions";

describe("local Demo research questions", () => {
  it("provides Japanese questions for each canonical topic and the general fallback", () => {
    for (const title of ["Developer Productivity", "Code Quality & Reliability", "Developer Experience", "Adoption & Organizational Impact", "Unknown", "toString"]) {
      const ja = getDemoQuestions(title, "ja");
      expect(ja.length).toBeGreaterThan(1);
      expect(ja.every((text) => /[ぁ-んァ-ヶ一-龠]/.test(text))).toBe(true);
      expect(ja).not.toEqual(getDemoQuestions(title, "en"));
      expect(selectDemoQuestion(ja, ja[0], () => 0)).not.toBe(ja[0]);
      if (title !== "Developer Productivity") expect(ja.join(" ")).not.toContain("METR");
    }
  });
  it("scopes study comparisons to productivity and uses cautious explanations", () => {
    const questions = getDemoQuestions("Developer Productivity");
    expect(questions).toHaveLength(5);
    expect(questions[0]).toContain("possible explanations");
    for (const title of ["Code Quality & Reliability", "Developer Experience", "Adoption & Organizational Impact", "Unknown", "toString"]) {
      expect(getDemoQuestions(title).length).toBeGreaterThan(1);
      expect(getDemoQuestions(title).join(" ")).not.toMatch(/METR|productivity study/);
    }
  });
  it("selects each candidate and excludes the previous question even with identical randomness", () => {
    const questions = getDemoQuestions("Developer Productivity");
    questions.forEach((question, index) => {
      expect(selectDemoQuestion(questions, "", () => (index + 0.5) / questions.length)).toBe(question);
      expect(selectDemoQuestion(questions, question, () => 0)).not.toBe(question);
    });
    expect(selectDemoQuestion(["Only"], "Only")).toBe("Only");
    expect(selectDemoQuestion([], "")).toBe("");
  });
});
