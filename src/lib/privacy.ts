// Bump this when the policy text changes; users are asked to accept again.
export const PRIVACY_POLICY_VERSION = "2026-10-24";

export const PRIVACY_POLICY_POINTS = [
  {
    title: "Your identity stays out of the game",
    body: "We don't know or use who you are in the game. Your account only signs you in and keeps your case records.",
  },
  {
    title: "Every story is fiction",
    body: "All cases, characters and events in this game are made up. Any resemblance to real people or events is coincidental.",
  },
  {
    title: "No offence intended",
    body: "No character or story was written to insult anyone. If you find something that does, please tell us using the game's Report option.",
  },
] as const;
