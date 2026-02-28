// models.ts (or a similar initialization file)

import { openai } from "@ai-sdk/openai";
import { retrieveRelevantChunks } from "@/lib/retrieve";

// Global variable to hold the pre-loaded model and embeddings
let model: any = null;

export async function initializeModel() {
  // Initialize the model only once
  if (!model) {
    model = openai.responses("gpt-5-nano");
    console.log("Model loaded successfully.");
  }
}

// Export the model for use in other parts of your application
export function getModel() {
  return model;
}

// Preload embeddings if necessary, depending on your setup.
export async function loadEmbeddingsOnce() {
  // Embedding logic to load once
  // Can be a database call or caching setup
}
