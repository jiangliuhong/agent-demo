export async function GET() {
  const modelsEnv = process.env.OPENAI_MODELS || "gpt-4o-mini";
  const models = modelsEnv
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  return Response.json({ models, default: models[0] || "gpt-4o-mini" });
}
