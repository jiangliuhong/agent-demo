import { addMessage } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const body = await req.json();
  const { id, role, content, toolName, toolCallId } = body as {
    id: string;
    role: "user" | "assistant" | "tool";
    content: string;
    toolName?: string;
    toolCallId?: string;
  };

  if (!id || !role || !content) {
    return Response.json(
      { error: "缺少必要字段: id, role, content" },
      { status: 400 }
    );
  }

  const message = addMessage(id, conversationId, role, content, toolName, toolCallId);
  return Response.json(message, { status: 201 });
}
