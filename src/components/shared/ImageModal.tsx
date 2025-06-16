
'use client';

import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLACEHOLDER_IMAGE_DATA_URL } from '@/lib/mock-data'; // Import placeholder

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  altText?: string;
}

export default function ImageModal({ isOpen, onClose, imageUrl, altText = "Enlarged image" }: ImageModalProps) {
  if (!isOpen || !imageUrl || imageUrl === PLACEHOLDER_IMAGE_DATA_URL) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-1 sm:p-2 max-w-4xl w-auto bg-background/80 backdrop-blur-md border-none shadow-2xl rounded-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>{altText || "Enlarged Image View"}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-auto max-h-[85vh] aspect-[16/10]">
          <Image
            src={imageUrl}
            alt={altText}
            layout="fill"
            objectFit="contain"
            className="rounded"
            onError={(e) => {
              // In case of an error, try to prevent broken image icon or close modal
              console.warn("Error loading image in modal:", imageUrl);
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; // Fallback or hide
            }}
          />
        </div>
        <DialogClose asChild className="absolute top-2 right-2 z-10">
          <Button variant="ghost" size="icon" className="rounded-full bg-black/40 hover:bg-black/60 text-white hover:text-white h-8 w-8">
            <X className="h-5 w-5" />
            <span className="sr-only">Close image viewer</span>
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
