// Game rules in one place, so balancing the game never means touching game logic.

// How many final reports a player may file per case.
export const MAX_REPORT_ATTEMPTS = 3;

// After the last failed report: true closes the case as unsolved and opens the next one,
// false keeps the player on this case.
export const UNSOLVED_UNLOCKS_NEXT = true;

// How the "why" part of a report is judged:
// "choice" - the picked motive option must be right
// "llm"    - the written explanation is graded by the model
// "hybrid" - both
export const MOTIVE_MODE: "choice" | "llm" | "hybrid" = "hybrid";

// Minimum grader score (0-100) for a written explanation to pass.
export const MOTIVE_PASS_SCORE = 60;

export const MAX_EXPLANATION_LENGTH = 1000;

// Interrogation limits, per player.
export const MAX_QUESTIONS_PER_WITNESS = 20;
export const MAX_QUESTION_LENGTH = 500;
// Across all witnesses and cases, to cap spend. 0 turns the cap off.
export const MAX_QUESTIONS_PER_DAY = 200;

// Which facts are highlighted with a save button when a witness reveals them:
// "all" every fact, "key" only facts that matter for the solution, "none" no highlight.
export const HIGHLIGHT_MODE: "all" | "key" | "none" = "all";

// Token ceilings per call, including the model's hidden reasoning.
export const WITNESS_MAX_TOKENS = 2000;
export const GRADER_MAX_TOKENS = 4000;
