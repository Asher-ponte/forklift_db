
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Clock, Save, Loader2 } from 'lucide-react';
import type { StoredDowntimeLog, MheUnit } from '@/lib/types';
import * as apiService from '@/services/apiService';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface DowntimeFormProps {
  onLogAdded: () => void;
}

export default function DowntimeForm({ onLogAdded }: DowntimeFormProps) {
  const [selectedMheId, setSelectedMheId] = useState<string>(''); // Store MheUnit.id (UUID)
  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [mheUnits, setMheUnits] = useState<MheUnit[]>([]);
  const [isLoadingMheUnits, setIsLoadingMheUnits] = useState(true);

  useEffect(() => {
    const fetchMheData = async () => {
      setIsLoadingMheUnits(true);
      try {
        const units = await apiService.fetchMheUnits();
        setMheUnits(units.filter(u => u.status !== 'inactive')); // Only show active/maintenance MHEs
      } catch (error) {
        toast({ title: "Error Loading MHE Units", description: (error instanceof Error) ? error.message : "Could not load MHE units for selection.", variant: "destructive"});
        setMheUnits([]);
      } finally {
        setIsLoadingMheUnits(false);
      }
    };
    fetchMheData();
  }, [toast]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMheId || !reason || !startTime || !user) {
      toast({ title: "Validation Error", description: "MHE Unit ID, Reason, and Start Time are required. User must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const selectedMhe = mheUnits.find(m => m.id === selectedMheId);
    if (!selectedMhe) {
        toast({ title: "Error", description: "Selected MHE Unit not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const newLogPayload: Omit<StoredDowntimeLog, 'id' | 'logged_at' | 'unsafe_items' | 'source_report_id_fk'> = {
      unit_id_fk: selectedMhe.id,
      unit_code_display: selectedMhe.unit_code,
      reason,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
      user_id_fk: user.id,
    };

    try {
      await apiService.addDowntimeLog(newLogPayload);
      toast({ title: "Downtime Logged", description: `Downtime for unit ${selectedMhe.unit_code} has been saved via API.`});
      onLogAdded(); 
      setSelectedMheId('');
      setReason('');
      setStartTime('');
      setEndTime('');
    } catch (error) {
      console.error("Error saving downtime log via API:", error);
      toast({
        title: "Submission Error",
        description: (error instanceof Error) ? error.message : "Could not save the downtime log via API.",
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
        <CardDescription>Record periods when a forklift unit is not operational. Data saved to API.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="unitIdSelect">Forklift Unit ID</Label>
              <Select 
                value={selectedMheId} 
                onValueChange={setSelectedMheId}
                disabled={isLoadingMheUnits || mheUnits.length === 0}
              >
                <SelectTrigger id="unitIdSelect" className="text-base">
                  <SelectValue placeholder={isLoadingMheUnits ? "Loading MHEs..." : (mheUnits.length === 0 ? "No MHEs available" : "Select MHE Unit...")} />
                </SelectTrigger>
                <SelectContent>
                  {mheUnits.map(mhe => (
                    <SelectItem key={mhe.id} value={mhe.id}>{mhe.unit_code} - {mhe.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               {mheUnits.length === 0 && !isLoadingMheUnits && (
                <p className="text-xs text-muted-foreground">No active MHE units found. Add them in Data Management.</p>
              )}
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
          
          <Button type="submit" className="w-full md:w-auto text-base" disabled={isSubmitting || isLoadingMheUnits}>
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5" />}
            {isSubmitting ? 'Logging Downtime...' : 'Log Downtime'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
