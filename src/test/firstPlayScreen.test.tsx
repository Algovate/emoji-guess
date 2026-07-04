import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QUESTIONS } from "../content/questions";
import { FirstPlayScreen } from "../features/onboarding/FirstPlayScreen";
import { buildFirstPlayQuestions } from "../features/onboarding/firstPlay";

afterEach(cleanup);

describe("FirstPlayScreen", () => {
  it("shows one directly playable question without lobby systems", () => {
    const question = buildFirstPlayQuestions(QUESTIONS)[0];
    const onAnswer = vi.fn();
    render(<FirstPlayScreen question={question} questions={QUESTIONS} onAnswer={onAnswer} />);

    expect(screen.getByText("选出答案")).toBeTruthy();
    expect(screen.queryByText("60 秒快猜")).toBeNull();
    expect(screen.queryByText(/XP/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: question.answer }));
    expect(onAnswer).toHaveBeenCalledWith(question.answer);
  });

  it("keeps trying after a wrong answer", () => {
    const question = buildFirstPlayQuestions(QUESTIONS)[0];
    render(<FirstPlayScreen question={question} questions={QUESTIONS} onAnswer={vi.fn()} />);
    const wrong = screen.getAllByRole("button").find((button) => button.textContent !== question.answer);
    if (!wrong) throw new Error("Expected a wrong choice");
    fireEvent.click(wrong);
    expect((screen.getByRole("button", { name: question.answer }) as HTMLButtonElement).disabled).toBe(false);
  });
});
