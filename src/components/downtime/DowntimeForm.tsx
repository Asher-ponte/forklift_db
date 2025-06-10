
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Clock, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { StoredDowntimeLog } from '@/lib/types';

const LOCAL_STORAGE_DOWNTIME_KEY = 'forkliftDowntimeLogs';

interface DowntimeFormProps {
  onLogAdded: () => void; // Callback to inform parent that a log has been added
}

export default function DowntimeForm({ onLogAdded }: DowntimeFormProps) {
  const [unitId, setUnitId] = useState('');
  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId || !reason || !startTime) {
      toast({ title: "Validation Error", description: "Unit ID, Reason, and Start Time are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const newLogEntry: StoredDowntimeLog = {
      id: uuidv4(),
      unitId,
      reason,
      startTime,
      endTime: endTime || null,
      loggedAt: new Date().toISOString(),
    };

    try {
      const existingLogsRaw = localStorage.getItem(LOCAL_STORAGE_DOWNTIME_KEY);
      const existingLogs: StoredDowntimeLog[] = existingLogsRaw ? JSON.parse(existingLogsRaw) : [];
      existingLogs.push(newLogEntry);
      localStorage.setItem(LOCAL_STORAGE_DOWNTIME_KEY, JSON.stringify(existingLogs));
      
      toast({ title: "Downtime Logged", description: `Downtime for unit ${unitId} has been successfully recorded.`});
      onLogAdded(); // Notify parent to refresh list

      // Reset form
      setUnitId('');
      setReason('');
      setStartTime('');
      setEndTime('');
    } catch (error) {
      console.error("Error saving downtime log to localStorage:", error);
      toast({
        title: "Submission Error",
        description: "Could not save the downtime log locally. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-3xl flex items-center">
          <Clock className="mr-3 h-8 w-8 text-primary" />
          Log Forklift Downtime
        </CardTitle>
        <CardDescription>Record periods when a forklift unit is not operational.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="unitId">Forklift Unit ID</Label>
              <Input
                id="unitId"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                placeholder="e.g. FL001"
                required
                className="text-base"
              />
            </div>
             <div className="space-y-2"> {/* Empty div for spacing, or add another field here */}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Downtime</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Flat tire, Engine maintenance, Battery charging"
              required
              className="text-base min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="startTime">Downtime Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Downtime End Time (Optional)</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-base"
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full md:w-auto text-base" disabled={isSubmitting}>
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting ? 'Logging Downtime...' : 'Log Downtime'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
