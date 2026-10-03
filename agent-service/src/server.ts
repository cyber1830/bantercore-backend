import "dotenv/config";
import express from "express";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const app = express();
const port = Number(process.env.PORT || 4110);

app.use(express.json({ limit: "64kb" }));
app.use((request, response, next) => {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }
  next();
});

const summarySchema = z.object({
  summary: z.string().min(1),
  keyViewpoints: z.array(z.string()).min(1).max(5),
  tone: z.enum(["constructive", "mixed", "heated", "informational"]),
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "bantercore-agent-service" });
});

app.post("/v1/thread-summary", async (request, response) => {
  const { topic, body, replies } = request.body ?? {};

  if (typeof topic !== "string" || typeof body !== "string" || !Array.isArray(replies)) {
    response.status(400).json({ error: "topic, body, and replies are required" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: "GROQ_API_KEY is not configured" });
    return;
  }

  try {
    const provider = createOpenAI({
      apiKey,
      baseURL: process.env.GROQ_API_KEY
        ? "https://api.groq.com/openai/v1"
        : undefined,
    });

    const result = await generateObject({
      model: provider(
        process.env.GROQ_API_KEY
          ? process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
          : process.env.OPENAI_MODEL || "gpt-4o-mini",
      ),
      schema: summarySchema,
      system: "You summarize online discussions fairly. Never invent viewpoints. Keep summaries concise and neutral.",
      prompt: JSON.stringify({ topic, body, replies: replies.slice(0, 100) }),
    });
    response.json(result.object);
  } catch (error) {
    console.error("thread_summary_failed", error);
    response.status(502).json({ error: "Unable to generate thread summary" });
  }
});

app.listen(port, () => {
  console.log(`BanterCore agent service listening on :${port}`);
});
