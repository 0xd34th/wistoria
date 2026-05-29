import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY must be set. Add it in the Secrets pane to enable redesigns.",
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
