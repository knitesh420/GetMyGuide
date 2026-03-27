// components/admin/LanguageFormModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { LanguageOption, CreateLanguageOption } from '@/types/admin';

interface LanguageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (language: LanguageOption | CreateLanguageOption) => void;
  languageData?: LanguageOption | null;
  isLoading?: boolean;
}

// ✅ UPDATED: New initial state for the tiered pricing structure
const initialFormState: CreateLanguageOption = {
  languageName: '',
  pricing: {
    standardGroup: { price: 0 },
    largeGroup: { price: 0 },
  },
};

export function LanguageFormModal({ isOpen, onClose, onSave, languageData, isLoading = false }: LanguageFormModalProps) {
  const [formData, setFormData] = useState<LanguageOption | CreateLanguageOption>(initialFormState);

  useEffect(() => {
    if (isOpen) {
      if (languageData) {
        // Populate form with existing data, providing a fallback for old data
        setFormData({
            ...languageData,
            pricing: languageData.pricing ?? initialFormState.pricing
        });
      } else {
        setFormData(initialFormState);
      }
    }
  }, [languageData, isOpen]);

  // ✅ UPDATED: Generic handler for top-level fields like languageName
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // ✅ ADDED: Specific handler for updating nested pricing state
  const handlePricingChange = (group: 'standardGroup' | 'largeGroup', value: string) => {
    setFormData(prev => ({
        ...prev,
        pricing: {
            ...prev.pricing,
            [group]: {
                price: value === '' ? 0 : parseFloat(value)
            }
        }
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{languageData ? 'Edit Language' : 'Add New Language'}</DialogTitle>
          <DialogDescription>
            Set the language name and its additional price based on group size.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="languageName" className="text-right">
              Language
            </Label>
            <Input
              id="languageName"
              name="languageName"
              value={formData.languageName}
              onChange={handleChange}
              className="col-span-3"
              placeholder="e.g., Russian"
              disabled={isLoading}
            />
          </div>
          
          {/* ✅ UPDATED: Replaced single charge with tiered pricing inputs */}
          <div className="col-span-4 space-y-3 rounded-md border p-3">
             <h4 className="font-semibold text-center text-sm">Language Surcharge (₹)</h4>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="standard-price" className="text-right col-span-2">
                  For 1-14 Persons
                </Label>
                <Input
                  id="standard-price"
                  name="standardGroup"
                  type="number"
                  value={formData.pricing?.standardGroup?.price ?? 0}
                  onChange={(e) => handlePricingChange('standardGroup', e.target.value)}
                  className="col-span-2"
                  placeholder="e.g., 800"
                  disabled={isLoading}
                />
             </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="large-price" className="text-right col-span-2">
                  For 15+ Persons
                </Label>
                <Input
                  id="large-price"
                  name="largeGroup"
                  type="number"
                  value={formData.pricing?.largeGroup?.price ?? 0}
                  onChange={(e) => handlePricingChange('largeGroup', e.target.value)}
                  className="col-span-2"
                  placeholder="e.g., 1000"
                  disabled={isLoading}
                />
             </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : languageData ? (
              'Save Changes'
            ) : (
              'Add Language'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}