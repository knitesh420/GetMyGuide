// components/admin/SubscriptionFormModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { SubscriptionPlan, CreateSubscriptionPlan } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface SubscriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: SubscriptionPlan | CreateSubscriptionPlan) => void;
  planData?: SubscriptionPlan | null;
  isLoading?: boolean;
}

const initialPlanState: CreateSubscriptionPlan = {
  title: '',
  duration: '',
  totalPrice: 0,
  monthlyPrice: 0,
  benefits: [],
  popular: false,
};

export function SubscriptionFormModal({ isOpen, onClose, onSave, planData, isLoading = false }: SubscriptionFormModalProps) {
  const [plan, setPlan] = useState<SubscriptionPlan | CreateSubscriptionPlan>(initialPlanState);
  const [benefitsText, setBenefitsText] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (planData) {
        setPlan(planData);
        setBenefitsText(planData.benefits.join('\n'));
      } else {
        setPlan(initialPlanState);
        setBenefitsText('');
      }
    }
  }, [planData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setPlan(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleBenefitsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBenefitsText(e.target.value);
  };

  const handleSave = () => {
    const finalPlan = {
      ...plan,
      benefits: benefitsText.split('\n').filter(b => b.trim() !== ''),
    };
    onSave(finalPlan);
  };

  return (
    <Dialog open={isOpen} onOpenChange={!isLoading ? onClose : undefined}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{planData ? 'Edit Plan' : 'Add New Plan'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the subscription plan below.
          </DialogDescription>
        </DialogHeader>

        {/* --- UI FIX: Replaced the entire grid layout for better alignment --- */}
        <div className="grid gap-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
          
          {/* Row 1: Title */}
          <div className="grid grid-cols-[110px_1fr] items-center gap-x-4">
            <Label htmlFor="title" className="text-right">Title</Label>
            <Input id="title" name="title" value={plan.title} onChange={handleChange} disabled={isLoading} />
          </div>

          {/* Row 2: Duration */}
          <div className="grid grid-cols-[110px_1fr] items-center gap-x-4">
            <Label htmlFor="duration" className="text-right">Duration</Label>
            <Input id="duration" name="duration" value={plan.duration} onChange={handleChange} disabled={isLoading} />
          </div>
          
          {/* Row 3: Total Price */}
          <div className="grid grid-cols-[110px_1fr] items-center gap-x-4">
            <Label htmlFor="totalPrice" className="text-right">Total Price (₹)</Label>
            <Input id="totalPrice" name="totalPrice" type="number" value={plan.totalPrice} onChange={handleChange} disabled={isLoading} />
          </div>

          {/* Row 4: Monthly Price */}
          <div className="grid grid-cols-[110px_1fr] items-center gap-x-4">
            <Label htmlFor="monthlyPrice" className="text-right">Monthly (₹)</Label>
            <Input id="monthlyPrice" name="monthlyPrice" type="number" value={plan.monthlyPrice} onChange={handleChange} disabled={isLoading} />
          </div>

          {/* Row 5: Benefits (using items-start for better textarea label alignment) */}
          <div className="grid grid-cols-[110px_1fr] items-start gap-x-4">
            <Label htmlFor="benefits" className="text-right pt-2">Benefits</Label>
            <Textarea id="benefits" value={benefitsText} onChange={handleBenefitsChange} placeholder="Enter one benefit per line" disabled={isLoading} />
          </div>

          {/* Row 6: Popular Checkbox (aligned with other fields) */}
          <div className="grid grid-cols-[110px_1fr] items-center gap-x-4">
             <Label className="text-right">Popular</Label>
             <div className="flex items-center space-x-2">
                <Checkbox id="popular" name="popular" checked={plan.popular} onCheckedChange={(checked) => setPlan(p => ({...p, popular: !!checked}))} disabled={isLoading} />
                <label htmlFor="popular" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Mark as Most Popular
                </label>
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}