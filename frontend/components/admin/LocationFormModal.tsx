"use client";

import { useState, useEffect, FormEvent } from 'react';
import { AdminLocation } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw } from 'lucide-react';
import Image from 'next/image';

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
  locationData: AdminLocation | null;
  isLoading: boolean;
}

const initialPricingState = {
  smallGroup: { price: 0 },
  mediumGroup: { price: 0 },
  largeGroup: { price: 0 },
};

export function LocationFormModal({ isOpen, onClose, onSave, locationData, isLoading }: LocationFormModalProps) {
  const [placeName, setPlaceName] = useState('');
  const [description, setDescription] = useState('');  
  const [pricing, setPricing] = useState(initialPricingState);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (locationData) {
      setPlaceName(locationData.placeName);
      setDescription(locationData.description);
      // Use optional chaining here as well, just in case of old data
      setPricing(locationData.pricing ?? initialPricingState); 
      setImageFile(null);
      setPreview(locationData.image);
    } else {
      setPlaceName('');
      setDescription('');
      setPricing(initialPricingState);
      setImageFile(null);
      setPreview(null);
    }
  }, [locationData, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handlePricingChange = (group: 'smallGroup' | 'mediumGroup' | 'largeGroup', value: string) => {
    setPricing(prev => ({
      ...prev,
      [group]: {
        price: Number(value)
      }
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!locationData && !imageFile) {
        alert("Please select an image for the new location.");
        return;
    }
    
    const formData = new FormData();
    formData.append('placeName', placeName);
    formData.append('description', description);

    formData.append('pricing[smallGroup][price]', pricing.smallGroup.price.toString());
    formData.append('pricing[mediumGroup][price]', pricing.mediumGroup.price.toString());
    formData.append('pricing[largeGroup][price]', pricing.largeGroup.price.toString());
    
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{locationData ? 'Edit Location' : 'Add New Location'}</DialogTitle>
          <DialogDescription>
            {locationData ? 'Update the details for this location.' : 'Fill in the details for a new location.'}
          </DialogDescription>
        </DialogHeader>
        {/* ✅ FIX: Added classes to make the form scrollable on smaller screens */}
        <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-6">
          <div>
            <Label htmlFor="placeName">Place Name</Label>
            <Input id="placeName" value={placeName} onChange={(e) => setPlaceName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="space-y-3 rounded-md border p-4">
            <h4 className="font-semibold">Guide Fee Pricing (₹)</h4>
            <div>
              <Label htmlFor="sg-price">For 1-5 Persons</Label>
              {/* Added a fallback value just in case pricing is not defined */}
              <Input id="sg-price" type="number" value={pricing?.smallGroup?.price ?? 0} onChange={(e) => handlePricingChange('smallGroup', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="mg-price">For 6-14 Persons</Label>
              <Input id="mg-price" type="number" value={pricing?.mediumGroup?.price ?? 0} onChange={(e) => handlePricingChange('mediumGroup', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="lg-price">For 15-40 Persons</Label>
              <Input id="lg-price" type="number" value={pricing?.largeGroup?.price ?? 0} onChange={(e) => handlePricingChange('largeGroup', e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="imageFile">{locationData ? "Change Image" : "Image"}</Label>
            <Input id="imageFile" type="file" accept="image/*" onChange={handleImageChange} required={!locationData} />
            {preview && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Image Preview:</p>
                <Image src={preview} alt="Image preview" width={100} height={100} className="rounded-md object-cover" />
              </div>
            )}
          </div>
          <DialogFooter className="sticky bottom-0 bg-background pt-4 pr-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}