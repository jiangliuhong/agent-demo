import {
  getConversation,
  getConversationMessages,
  deleteConversation,
  updateConversationTitle,
  updateConversationModel,
} from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversation = getConversation(id);
  if (!conversation) {
    return Response.json({ error: "对话不存在" }, { status: 404 });
  }
  const messages = getConversationMessages(id);
  return Response.json({ ...conversation, messages });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteConversation(id);
  if (!deleted) {
    return Response.json({ error: "对话不存在" }, { status: 404 });
  }
  return Response.json({ success: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { title, model } = body as {
    title?: string;
    model?: string;
  };

  if (title) updateConversationTitle(id, title);
  if (model) updateConversationModel(id, model);

  const conversation = getConversation(id);
  return Response.json(conversation);
}
