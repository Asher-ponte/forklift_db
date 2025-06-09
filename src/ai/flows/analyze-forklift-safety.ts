// src/ai/flows/analyze-forklift-safety.ts
'use server';

/**
 * @fileOverview Analyzes forklift inspection records to determine if a forklift is safe for operation.
 *
 * - analyzeForkliftSafety - A function that analyzes forklift inspection records and returns a safety assessment.
 * - AnalyzeForkliftSafetyInput - The input type for the analyzeForkliftSafety function.
 * - AnalyzeForkliftSafetyOutput - The return type for the analyzeForkliftSafety function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InspectionRecordSchema = z.object({
  checklist_item_id: z.string().describe('The ID of the checklist item.'),
  photo_url: z.string().describe('URL of the photo taken for the checklist item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'),
  is_safe: z.boolean().describe('Whether the checklist item was marked as safe.'),
  timestamp: z.string().describe('The timestamp of the inspection record.'),
});

const AnalyzeForkliftSafetyInputSchema = z.object({
  inspection_records: z.array(InspectionRecordSchema).describe('An array of inspection records for the forklift.'),
});
export type AnalyzeForkliftSafetyInput = z.infer<typeof AnalyzeForkliftSafetyInputSchema>;

const AnalyzeForkliftSafetyOutputSchema = z.object({
  is_safe: z.boolean().describe('Whether the forklift is safe for operation.'),
  reason: z.string().describe('The reason for the safety assessment. If the forklift is unsafe, this should explain why.'),
});
export type AnalyzeForkliftSafetyOutput = z.infer<typeof AnalyzeForkliftSafetyOutputSchema>;

export async function analyzeForkliftSafety(input: AnalyzeForkliftSafetyInput): Promise<AnalyzeForkliftSafetyOutput> {
  return analyzeForkliftSafetyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeForkliftSafetyPrompt',
  input: {schema: AnalyzeForkliftSafetyInputSchema},
  output: {schema: AnalyzeForkliftSafetyOutputSchema},
  prompt: `You are an AI expert in forklift safety analysis.

You are provided with a list of inspection records for a forklift. Each record includes a photo of the inspected part and whether the part was marked as safe or unsafe by the operator.

Your task is to analyze these records and determine if the forklift is safe for operation. If all parts are marked as safe, then the forklift is considered safe. If any part is marked as unsafe, the forklift is considered unsafe and you must clearly explain why.

Here are the inspection records:
{{#each inspection_records}}
- Item ID: {{checklist_item_id}}
  Photo: {{media url=photo_url}}
  Safe: {{is_safe}}
  Timestamp: {{timestamp}}
{{/each}}

Based on this information, determine if the forklift is safe for operation and provide a reason for your assessment.

Ensure that the is_safe output field accurately reflects the safety status of the forklift.
`,
});

const analyzeForkliftSafetyFlow = ai.defineFlow(
  {
    name: 'analyzeForkliftSafetyFlow',
    inputSchema: AnalyzeForkliftSafetyInputSchema,
    outputSchema: AnalyzeForkliftSafetyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
