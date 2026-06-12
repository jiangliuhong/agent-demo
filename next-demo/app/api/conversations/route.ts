import {
  listConversations,
  createConversation,
} from "@/lib/db";

export async function GET() {
  const conversations = listConversations();
  return Response.json(conversations);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, model } = body as { title?: string; model?: string };
  const id = Math.random().toString(36).substring(2, 10);
  const conversation = createConversation(
    id,
    title || "新的对话",
    model || "gpt-4o-mini"
  );
  return Response.json(conversation, { status: 201 });
}
