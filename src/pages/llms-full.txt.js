/**
 * Page endpoint for /llms-full.txt
 *
 * Called at build time by Astro. Reads content collections,
 * generates the full-text concatenation, and queues mirror files.
 */
import { buildLlmsPage } from "./_llmsPage.js";

export const GET = buildLlmsPage((result) => result.llmsFullTxt);
