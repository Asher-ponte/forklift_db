'use server';
/**
 * @fileOverview Generates a summary of forklift inspection records.
 *
 * - summarizeInspection - A function that takes inspection records and returns a summary.
 * - SummarizeInspectionInput - The input type for the summarizeInspection function (reuses AnalyzeForkliftSafetyInput).
 * - SummarizeInspectionOutput - The return type for the summarizeInspection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { AnalyzeForkliftSafetyInputSchema, type AnalyzeForkliftSafetyInput } from './analyze-forklift-safety'; // Reusing the input schema

export type SummarizeInspectionInput = AnalyzeForkliftSafetyInput;

const SummarizeInspectionOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the forklift inspection, including overall safety status, number of items, and any unsafe items.'),
});
export type SummarizeInspectionOutput = z.infer<typeof SummarizeInspectionOutputSchema>;

export async function summarizeInspection(input: SummarizeInspectionInput): Promise<SummarizeInspectionOutput> {
  return summarizeInspectionFlow(input);
}

const summarizeInspectionPrompt = ai.definePrompt({
  name: 'summarizeInspectionPrompt',
  input: {schema: AnalyzeForkliftSafetyInputSchema}, // Reusing the input schema
  output: {schema: SummarizeInspectionOutputSchema},
  prompt: `You are an AI assistant that summarizes forklift inspection records.
Based on the following inspection records, provide a concise summary.
The summary should state:
1. The overall safety status (e.g., "The forklift appears to be safe" or "The forklift appears to be unsafe based on N items.").
2. The total number of items inspected.
3. If unsafe, list the checklist item IDs that were marked as unsafe.

Inspection Records:
{{#each inspection_records}}
- Checklist Item ID: {{checklist_item_id}}, Safe: {{is_safe}}
{{/each}}

Generate the summary.`,
});

const summarizeInspectionFlow = ai.defineFlow(
  {
    name: 'summarizeInspectionFlow',
    inputSchema: AnalyzeForkliftSafetyInputSchema, // Reusing the input schema
    outputSchema: SummarizeInspectionOutputSchema,
  },
  async input => {
    const {output} = await summarizeInspectionPrompt(input);
    return output!;
  }
);
