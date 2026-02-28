import { getModel, initializeModel } from "@/lib/preload"; // Import your model and initialization function
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { retrieveRelevantChunks, type DocumentChunk } from "@/lib/retrieve";

// Make sure model is initialized before the route handler starts
initializeModel();

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    // Convert messages to model format
    const modelMessages = await convertToModelMessages(messages);

    // Safely get last user message
    const lastUserMessage =
      [...modelMessages].reverse().find((m) => m.role === "user")?.content ?? "";

    // Retrieve relevant context from your vector database
    const docs: DocumentChunk[] = await retrieveRelevantChunks(
      typeof lastUserMessage === "string"
        ? lastUserMessage
        : JSON.stringify(lastUserMessage)
    );

    // Combine context into one string
    const context = docs
      .map((d) => `Source: ${d.metadata.filename}\n${d.content}`)
      .join("\n\n---\n\n");

    // Build the system prompt with context
    const systemPrompt = `
You may use the provided context to answer the user's questions, but you can also rely on your own knowledge.
Use the context when it helps, but if the answer is outside the context, answer based on your general knowledge.
If the question requires current events or internet knowledge, answer using your latest information.
Context:
${context}
`;

    // Get pre-loaded model
    const model = getModel();

    // Stream the model's response
    const result = streamText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...modelMessages,
      ],
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
