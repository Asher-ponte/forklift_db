'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Camera, CheckCircle, XCircle } from 'lucide-react';
import type { ChecklistItem } from '@/lib/mock-data';
import Image from 'next/image'; // Using next/image for potential optimization if real images were used

interface SafetyCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
  onSubmit: (itemId: string, isSafe: boolean, photoUrl: string) => void;
}

export default function SafetyCheckModal({ isOpen, onClose, item, onSubmit }: SafetyCheckModalProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset preview when modal opens for a new item
    if (isOpen) {
      setPhotoPreview(null);
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

  const handleSubmit = async (isSafe: boolean) => {
    if (!item) return;
    setIsSubmitting(true);
    // Use a placeholder data URI if no photo is taken, or the actual preview
    const photoDataUrl = photoPreview || `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`; // 1x1 black pixel
    
    // Simulate submission delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onSubmit(item.id, isSafe, photoDataUrl);
    setIsSubmitting(false);
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">{item.part_name} Inspection</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="photo-upload" className="mb-2 block font-medium">Capture Photo</Label>
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
                variant="destructive" 
                size="lg" 
                onClick={() => handleSubmit(false)} 
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white rounded-md py-3 text-base"
              >
                <XCircle className="mr-2 h-5 w-5" /> Unsafe
              </Button>
              <Button 
                variant="default" 
                size="lg" 
                onClick={() => handleSubmit(true)} 
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white rounded-md py-3 text-base"
              >
                <CheckCircle className="mr-2 h-5 w-5" /> Safe
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-center">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
