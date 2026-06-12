import {
  listConversations,
  createConversation,
  type ConversationType,
} from "@/lib/db";

export async function GET() {
  const conversations = listConversations();
  return Response.json(conversations);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, model, type } = body as {
    title?: string;
    model?: string;
    type?: ConversationType;
  };
  const id = Math.random().toString(36).substring(2, 10);
  const conversation = createConversation(
    id,
    title || "新的对话",
    model || "gpt-4o-mini",
    type || "chat"
  );
  return Response.json(conversation, { status: 201 });
}
