export type FormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        environmentKey?: string[];
      };
      message?: string;
      // Echo submitted values back so the form keeps them after an error.
      values?: { name?: string; email?: string };
      // Set when signup turns out to be for the first (admin) account.
      needsEnvironmentKey?: boolean;
    }
  | undefined;

export type SessionPayload = {
  userId: string;
  expiresAt: Date;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup(input: {
  name: string;
  email: string;
  password: string;
}) {
  const errors: NonNullable<NonNullable<FormState>["errors"]> = {};

  if (input.name.length < 2) {
    errors.name = ["Name must be at least 2 characters long."];
  }
  if (!EMAIL_RE.test(input.email)) {
    errors.email = ["Please enter a valid email."];
  }

  const password: string[] = [];
  if (input.password.length < 8) password.push("Be at least 8 characters long.");
  if (!/[a-zA-Z]/.test(input.password)) password.push("Contain at least one letter.");
  if (!/[0-9]/.test(input.password)) password.push("Contain at least one number.");
  if (password.length) errors.password = password;

  return Object.keys(errors).length ? errors : null;
}

export function validateSignin(input: { email: string; password: string }) {
  const errors: NonNullable<NonNullable<FormState>["errors"]> = {};
  if (!EMAIL_RE.test(input.email)) errors.email = ["Please enter a valid email."];
  if (!input.password) errors.password = ["Password is required."];
  return Object.keys(errors).length ? errors : null;
}

export type ReportFormState =
  | {
      errors?: { title?: string[]; description?: string[] };
      message?: string;
      ok?: boolean;
      values?: { title?: string; description?: string };
    }
  | undefined;

export const REPORT_TITLE_MAX = 120;
export const REPORT_DESCRIPTION_MAX = 2000;

export function validateReport(input: { title: string; description: string }) {
  const errors: NonNullable<NonNullable<ReportFormState>["errors"]> = {};
  if (input.title.length < 3) errors.title = ["Title must be at least 3 characters long."];
  else if (input.title.length > REPORT_TITLE_MAX)
    errors.title = [`Title must be at most ${REPORT_TITLE_MAX} characters.`];
  if (input.description.length < 10)
    errors.description = ["Description must be at least 10 characters long."];
  else if (input.description.length > REPORT_DESCRIPTION_MAX)
    errors.description = [`Description must be at most ${REPORT_DESCRIPTION_MAX} characters.`];
  return Object.keys(errors).length ? errors : null;
}

export type MediaKind = "image" | "video";

export const MEDIA_LIMITS: Record<MediaKind, number> = {
  image: 10 * 1024 * 1024,
  video: 500 * 1024 * 1024,
};

// Where each kind lives in the Blob store; the upload route only signs paths inside these.
export const MEDIA_FOLDERS: Record<MediaKind, string> = {
  image: "stories/images",
  video: "stories/videos",
};

export const STORY_LIMITS = {
  title: 120,
  subtitle: 200,
  introStory: 5000,
  caseStory: 20000,
  images: 20,
  evidence: 50,
  evidenceName: 120,
  evidenceDescription: 2000,
  witnesses: 50,
  witnessName: 120,
  witnessAttitude: 500,
  witnessLies: 2000,
  facts: 30,
  factText: 1000,
  factRevealWhen: 300,
  suspects: 30,
  suspectName: 120,
  suspectDescription: 2000,
  motiveOptions: 8,
  motiveText: 200,
  motiveSummary: 2000,
} as const;

// Rows carry ids so chat history, saved statements and the solution can point at them. New rows
// get a random UUID in the editor; stories saved before ids existed get "legacy-…" ids on read.
export const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// One thing a witness knows. Fact ids are unique across the whole story, not just the witness.
export type StoryFact = {
  id: string;
  // The canonical wording: what a player saves to their notebook when the witness reveals it.
  text: string;
  // Matters for the solution.
  key: boolean;
  // Optional condition for the witness to give it up, e.g. "only if shown the torn letter".
  revealWhen: string;
};

export type StoryEvidence = { id: string; imageUrl: string; name: string; description: string };

export type StoryWitness = {
  id: string;
  name: string;
  attitude: string;
  // Set when this witness is also one of the suspects.
  suspectId: string | null;
  facts: StoryFact[];
  // What this witness lies about, and why. Optional.
  lies: string;
};

export type StorySuspect = { id: string; name: string; description: string; imageUrl: string | null };

export type ProofRef = { kind: "evidence" | "fact"; id: string };

// The answer to the case. Admin-only, like caseStory.
export type StorySolution = {
  culpritSuspectId: string;
  // What proves it; a report needs at least minProof of these.
  requiredProof: ProofRef[];
  minProof: number;
  // Players pick one of these as the motive.
  motiveOptions: { id: string; text: string }[];
  correctMotiveId: string;
  // The true motive in a few sentences, for the grader.
  motiveSummary: string;
};

// What the editor sends once its files are uploaded: media are referenced by their Blob URLs.
export type StoryInput = {
  title: string;
  subtitle: string;
  introVideoUrl: string | null;
  imageUrls: string[];
  // What players see when they open the case, with the intro video. Optional.
  introStory: string;
  // The complete story, solution included. Never sent to players.
  caseStory: string;
  evidence: StoryEvidence[];
  witnesses: StoryWitness[];
  suspects: StorySuspect[];
  // Null until the admin writes one; a case can't be solved without it.
  solution: StorySolution | null;
};

// Keys are field paths such as "title" or "evidence.2.name", so the editor can show each
// error under the row it belongs to.
export type StoryErrors = Record<string, string>;

// A successful save redirects to the cases page, so only failures come back.
export type StoryFormState = { errors?: StoryErrors; message?: string } | undefined;

export function validateStory(input: StoryInput) {
  const L = STORY_LIMITS;
  const errors: StoryErrors = {};

  if (input.title.length < 3) errors.title = "Title must be at least 3 characters long.";
  else if (input.title.length > L.title) errors.title = `Title must be at most ${L.title} characters.`;
  if (input.subtitle.length > L.subtitle)
    errors.subtitle = `Subtitle must be at most ${L.subtitle} characters.`;
  if (input.introStory.length > L.introStory)
    errors.introStory = `Intro story must be at most ${L.introStory} characters.`;
  if (input.caseStory.length < 20)
    errors.caseStory = "Main story must be at least 20 characters long.";
  else if (input.caseStory.length > L.caseStory)
    errors.caseStory = `Main story must be at most ${L.caseStory} characters.`;
  if (input.imageUrls.length > L.images) errors.images = `Add at most ${L.images} images.`;

  if (input.evidence.length > L.evidence) errors.evidence = `Add at most ${L.evidence} pieces of evidence.`;
  input.evidence.forEach((item, i) => {
    if (!item.imageUrl) errors[`evidence.${i}.image`] = "Add an image for this evidence.";
    if (!item.name) errors[`evidence.${i}.name`] = "Name is required.";
    else if (item.name.length > L.evidenceName)
      errors[`evidence.${i}.name`] = `Name must be at most ${L.evidenceName} characters.`;
    if (!item.description) errors[`evidence.${i}.description`] = "Description is required.";
    else if (item.description.length > L.evidenceDescription)
      errors[`evidence.${i}.description`] =
        `Description must be at most ${L.evidenceDescription} characters.`;
  });

  if (input.witnesses.length > L.witnesses) errors.witnesses = `Add at most ${L.witnesses} witnesses.`;
  input.witnesses.forEach((w, i) => {
    if (!w.name) errors[`witnesses.${i}.name`] = "Name is required.";
    else if (w.name.length > L.witnessName)
      errors[`witnesses.${i}.name`] = `Name must be at most ${L.witnessName} characters.`;
    if (w.attitude.length > L.witnessAttitude)
      errors[`witnesses.${i}.attitude`] = `Attitude must be at most ${L.witnessAttitude} characters.`;
    if (w.lies.length > L.witnessLies)
      errors[`witnesses.${i}.lies`] = `Lies must be at most ${L.witnessLies} characters.`;
    if (w.suspectId && !input.suspects.some((s) => s.id === w.suspectId))
      errors[`witnesses.${i}.suspectId`] = "That suspect no longer exists.";
    if (!w.facts.length) errors[`witnesses.${i}.facts`] = "Add at least one thing this witness knows.";
    else if (w.facts.length > L.facts) errors[`witnesses.${i}.facts`] = `Add at most ${L.facts} facts.`;
    w.facts.forEach((f, j) => {
      if (!f.text) errors[`witnesses.${i}.facts.${j}.text`] = "Fact text is required.";
      else if (f.text.length > L.factText)
        errors[`witnesses.${i}.facts.${j}.text`] = `Fact must be at most ${L.factText} characters.`;
      if (f.revealWhen.length > L.factRevealWhen)
        errors[`witnesses.${i}.facts.${j}.revealWhen`] = `Condition must be at most ${L.factRevealWhen} characters.`;
    });
  });

  if (input.suspects.length > L.suspects) errors.suspects = `Add at most ${L.suspects} suspects.`;
  input.suspects.forEach((s, i) => {
    if (!s.name) errors[`suspects.${i}.name`] = "Name is required.";
    else if (s.name.length > L.suspectName)
      errors[`suspects.${i}.name`] = `Name must be at most ${L.suspectName} characters.`;
    if (s.description.length > L.suspectDescription)
      errors[`suspects.${i}.description`] = `Description must be at most ${L.suspectDescription} characters.`;
  });

  if (input.solution) Object.assign(errors, validateSolution(input, input.solution));

  const facts = input.witnesses.flatMap((w) => w.facts);
  const idLists = [input.evidence, input.witnesses, input.suspects, facts, input.solution?.motiveOptions ?? []];
  if (idLists.some((list) => !list.every((row) => ID_RE.test(row.id)) || new Set(list.map((row) => row.id)).size !== list.length)) {
    errors.ids = "Some rows have a missing or repeated id. Reload the page and try again.";
  }

  return Object.keys(errors).length ? errors : null;
}

function validateSolution(input: StoryInput, solution: StorySolution) {
  const L = STORY_LIMITS;
  const errors: StoryErrors = {};

  if (!input.suspects.some((s) => s.id === solution.culpritSuspectId))
    errors["solution.culprit"] = "Pick the culprit from the suspects.";

  const factIds = new Set(input.witnesses.flatMap((w) => w.facts.map((f) => f.id)));
  const evidenceIds = new Set(input.evidence.map((e) => e.id));
  const proofKeys = solution.requiredProof.map((p) => `${p.kind}:${p.id}`);
  if (!solution.requiredProof.length) errors["solution.proof"] = "Pick at least one piece of proof.";
  else if (solution.requiredProof.some((p) => !(p.kind === "fact" ? factIds : evidenceIds).has(p.id)))
    errors["solution.proof"] = "Some proof no longer exists. Pick it again.";
  else if (new Set(proofKeys).size !== proofKeys.length) errors["solution.proof"] = "Each piece of proof can be picked once.";
  if (!Number.isInteger(solution.minProof) || solution.minProof < 1 || solution.minProof > solution.requiredProof.length)
    errors["solution.minProof"] = "Must be between 1 and the number of proof items.";

  if (solution.motiveOptions.length < 2) errors["solution.motives"] = "Add at least two motive options.";
  else if (solution.motiveOptions.length > L.motiveOptions)
    errors["solution.motives"] = `Add at most ${L.motiveOptions} motive options.`;
  solution.motiveOptions.forEach((m, i) => {
    if (!m.text) errors[`solution.motives.${i}.text`] = "Motive text is required.";
    else if (m.text.length > L.motiveText)
      errors[`solution.motives.${i}.text`] = `Motive must be at most ${L.motiveText} characters.`;
  });
  if (!solution.motiveOptions.some((m) => m.id === solution.correctMotiveId))
    errors["solution.correctMotive"] = "Mark which motive is correct.";
  if (!solution.motiveSummary) errors["solution.motiveSummary"] = "Summarize the true motive.";
  else if (solution.motiveSummary.length > L.motiveSummary)
    errors["solution.motiveSummary"] = `Summary must be at most ${L.motiveSummary} characters.`;

  return errors;
}
