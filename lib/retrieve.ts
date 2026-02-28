
import { supabase, embeddings, initEmbeddings } from "./vector";
import { Database } from "../scripts/supabase";

// Type for your document chunks
export type DocumentChunk = {
  content: string;
  metadata: {
    filename: string;
    [key: string]: any;
  };
};

// Fully typed function to retrieve relevant chunks from Supabase
export async function retrieveRelevantChunks(query: string): Promise<DocumentChunk[]> {
  // Make sure embeddings are initialized
  await initEmbeddings();
  if (!embeddings) throw new Error("Embeddings not initialized");

  // Embed the query
  const queryVector = await embeddings.embedQuery(query);

  // Call Supabase RPC
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryVector,
    match_count: 5,
  } as any); // we can keep `as any` if TS types for Supabase RPC aren't complete

  if (error) throw error;

  // Return typed array (always fallback to empty array)
  return (data ?? []) as DocumentChunk[];
}
