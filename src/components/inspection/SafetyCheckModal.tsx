
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { Camera, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import type { ChecklistItem } from '@/lib/mock-data';
import Image from 'next/image';

interface SafetyCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
  onSubmit: (itemId: string, isSafe: boolean, photoUrl: string, remarks: string | null) => void; // Added remarks
}

export default function SafetyCheckModal({ isOpen, onClose, item, onSubmit }: SafetyCheckModalProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<string>('');
  const [currentDecision, setCurrentDecision] = useState<'safe' | 'unsafe' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhotoPreview(null);
      setRemarks('');
      setCurrentDecision(null);
    }
  }, [isOpen, item]);

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitDecision = async () => {
    if (!item || currentDecision === null) return;
    setIsSubmitting(true);
    
    const photoDataUrl = photoPreview || `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`;
    const finalRemarks = currentDecision === 'unsafe' ? remarks : null;

    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate submission
    
    onSubmit(item.id, currentDecision === 'safe', photoDataUrl, finalRemarks);
    setIsSubmitting(false);
    onClose(); 
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">{item.part_name} Inspection</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="photo-upload" className="mb-2 block font-medium">Capture Photo (Optional)</Label>
            <div className="flex items-center space-x-3">
              <Button asChild variant="outline" size="lg" className="flex-grow">
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Camera className="mr-2 h-5 w-5" />
                  {photoPreview ? 'Change Photo' : 'Take Photo'}
                </label>
              </Button>
              <Input id="photo-upload" type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />
            </div>
            {photoPreview && (
              <div className="mt-3 rounded-md border border-border p-2 aspect-video relative w-full max-h-60 overflow-hidden">
                <Image src={photoPreview} alt="Photo preview" layout="fill" objectFit="contain" className="rounded" />
              </div>
            )}
          </div>
          
          <div className="text-center">
            <p className="font-medium text-lg mb-3">{item.question}</p>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant={currentDecision === 'unsafe' ? "destructive" : "outline"}
                size="lg" 
                onClick={() => setCurrentDecision('unsafe')} 
                disabled={isSubmitting}
                className="rounded-md py-3 text-base"
              >
                <XCircle className="mr-2 h-5 w-5" /> Unsafe
              </Button>
              <Button 
                variant={currentDecision === 'safe' ? "default" : "outline"}
                size="lg" 
                onClick={() => setCurrentDecision('safe')} 
                disabled={isSubmitting}
                className={`${currentDecision === 'safe' ? 'bg-green-600 hover:bg-green-700 text-white' : ''} rounded-md py-3 text-base`}
              >
                <CheckCircle className="mr-2 h-5 w-5" /> Safe
              </Button>
            </div>
          </div>

          {currentDecision === 'unsafe' && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="remarks" className="font-medium flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                Remarks for Unsafe Item
              </Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Describe the issue or deviation..."
                className="min-h-[80px] text-base"
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>
        
        <DialogFooter className="sm:justify-center space-y-2 sm:space-y-0 sm:space-x-2">
           <Button 
            type="button" 
            onClick={handleSubmitDecision} 
            disabled={isSubmitting || currentDecision === null}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Saving...' : 'Confirm & Save Item Status'}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
