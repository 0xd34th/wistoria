import OpenAI from "openai";

if (!process.env["OPENAI_API_KEY"]) {
  throw new Error(
    "OPENAI_API_KEY environment variable is required but was not provided.",
  );
}

export const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});
