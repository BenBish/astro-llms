/**
 * Page endpoint for /llms.txt
 *
 * Called at build time by Astro. Reads content collections,
 * generates the llms.txt index, and queues mirror files.
 */
import { buildLlmsPage } from "./_llmsPage.js";

export const GET = buildLlmsPage((result) => result.llmsTxt);
