// ingest.ts
import fs from "fs";
import path from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { supabase, embeddings, initEmbeddings } from "../lib/vector";
import { v4 as uuidv4 } from "uuid";
import { Database } from "./supabase";  // Import the Database type

type Document = Database['public']['Tables']['documents']['Row'];
// ---- Types ----
interface Chunk {
  pageContent: string;
  metadata: Record<string, any>;
}

// ---- Load documents from folder ----
async function loadDocs(dir: string) {
  if (!fs.existsSync(dir)) {
    console.error(`Folder not found: ${dir}`);
    return [];
  }

  const files = fs.readdirSync(dir);
  if (files.length === 0) {
    console.warn(`No files found in folder: ${dir}`);
    return [];
  }

  return files.map((file) => ({
    id: uuidv4(),
    filename: file,
    content: fs.readFileSync(path.join(dir, file), "utf8"),
  }));
}

// ---- Ingest logic ----
async function ingest() {
  console.log("Initializing embeddings...");
  await initEmbeddings();

  if (!embeddings) throw new Error("Embeddings not initialized");
  console.log("Embeddings initialized ✅");

  const rawDocs = await loadDocs("./documents");
  if (rawDocs.length === 0) {
    console.warn("No documents to ingest. Exiting.");
    return;
  }

  console.log(`Found ${rawDocs.length} documents. Splitting into chunks...`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 100,
  });

  const chunks: Chunk[] = [];

  for (const doc of rawDocs) {
    const splitDocs = await splitter.createDocuments([doc.content]);
    splitDocs.forEach((chunk: any) => {
      chunks.push({
        pageContent: chunk.pageContent,
        metadata: {
          originalId: doc.id,
          filename: doc.filename,
        },
      });
    });
  }

  console.log(`Created ${chunks.length} chunks from ${rawDocs.length} documents.`);

  // ---- Process chunks and insert into Supabase ----
  for (const [index, chunk] of chunks.entries()) {
    console.log(`Processing chunk ${index + 1}/${chunks.length}:`, chunk.pageContent.slice(0, 50) + "...");

    // Generate embedding
    const vector = (await embeddings.embedDocuments([chunk.pageContent]))[0];

    if (!vector || vector.some((v: number) => Number.isNaN(v))) {
      console.error("Invalid embedding, skipping this chunk");
      continue;
    }

    // Insert into Supabase (cast to the table Insert type to satisfy TS)
    const insertPayload: Database['public']['Tables']['documents']['Insert'] = {
      id: uuidv4(), // optional
      content: chunk.pageContent,
      embedding: vector,
      metadata: chunk.metadata,
    };

    const res = (await (supabase.from("documents") as any).insert(insertPayload)) as unknown as {
      data: Database['public']['Tables']['documents']['Row'][] | null;
      error: any;
    };

    const { data, error } = res;

    if (error) {
      console.error("Supabase insert error:", error);
    } else if (data && data.length > 0) {
      console.log("Inserted chunk:", data[0].id);
    } else {
      console.warn("Insert succeeded but no data returned");
    }
  }

  console.log("✅ Ingestion complete");
}

// ---- Entrypoint ----
async function main() {
  try {
    await ingest();
  } catch (err) {
    console.error("Ingestion failed:", err);
    process.exitCode = 1;
  }
}

main();


