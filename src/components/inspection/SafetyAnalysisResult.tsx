'use client';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { AnalyzeForkliftSafetyOutput } from '@/ai/flows/analyze-forklift-safety';

interface SafetyAnalysisResultProps {
  analysisResult: AnalyzeForkliftSafetyOutput | null;
  isLoading: boolean;
  onResetInspection: () => void;
}

export default function SafetyAnalysisResult({ analysisResult, isLoading, onResetInspection }: SafetyAnalysisResultProps) {
  const showWarningModal = analysisResult !== null && !analysisResult.is_safe;

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg text-center">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Analyzing Forklift Safety...</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 p-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Please wait while we analyze the inspection records.</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysisResult) {
    return null; // Or a message indicating analysis hasn't run
  }

  return (
    <>
      <Card className={`w-full max-w-md mx-auto shadow-lg ${analysisResult.is_safe ? 'border-green-500' : 'border-red-500'}`}>
        <CardHeader className="text-center">
          {analysisResult.is_safe ? (
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-3" />
          ) : (
            <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-3" />
          )}
          <CardTitle className="font-headline text-2xl">
            {analysisResult.is_safe ? 'Forklift Safe for Operation' : 'Forklift UNSAFE'}
          </CardTitle>
          <CardDescription className="text-base">{analysisResult.reason}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
                Analysis completed. Please follow the instructions based on the safety status.
            </p>
        </CardContent>
      </Card>

      <AlertDialog open={showWarningModal}>
        <AlertDialogContent className="bg-card rounded-lg shadow-xl">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center font-headline text-2xl text-destructive">
              Forklift Unsafe!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base text-muted-foreground py-2">
              {analysisResult.reason}
              <br />
              <strong>Do not use the forklift. Contact your supervisor immediately.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center pt-4">
            <AlertDialogAction onClick={onResetInspection} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground w-full sm:w-auto">
              Acknowledge and Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
