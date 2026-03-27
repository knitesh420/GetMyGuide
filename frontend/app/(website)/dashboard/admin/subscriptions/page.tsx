// app/admin/subscriptions/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store'; // Adjust import path
import {
  fetchSubscriptions,
  addSubscription,
  updateSubscription,
  deleteSubscription,
} from '@/lib/redux/thunks/admin/subscriptionThunks'; // Adjust import path
import { SubscriptionPlan, CreateSubscriptionPlan } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { SubscriptionFormModal } from '@/components/admin/SubscriptionFormModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'react-toastify'; // Assuming you use a toast library

export default function AdminSubscriptionsPage() {
  const dispatch: AppDispatch = useDispatch();
  const { plans, loading, error } = useSelector((state: RootState) => state.subscriptions);
  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchSubscriptions());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleOpenModalForNew = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleSavePlan = (planToSave: SubscriptionPlan | CreateSubscriptionPlan) => {
    const action = '_id' in planToSave ? updateSubscription(planToSave as SubscriptionPlan) : addSubscription(planToSave);

    dispatch(action)
      .unwrap()
      .then(() => {
        toast.success(`Plan ${'_id' in planToSave ? 'updated' : 'created'} successfully!`);
        setIsModalOpen(false);
      })
      .catch((err) => console.error("Failed to save plan:", err));
  };

  const handleDeleteClick = (planId: string) => {
    setPlanToDelete(planId);
    setIsAlertOpen(true);
  };

  const confirmDelete = () => {
    if (planToDelete) {
      dispatch(deleteSubscription(planToDelete))
        .unwrap()
        .then(() => {
          toast.success("Plan deleted successfully!");
          setIsAlertOpen(false);
          setPlanToDelete(null);
        })
        .catch((err) => {
          console.error("Failed to delete plan:", err);
          setIsAlertOpen(false);
        });
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Subscriptions</h1>
          <p className="text-muted-foreground">Create, edit, or remove guide membership plans.</p>
        </div>
        <Button onClick={handleOpenModalForNew} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Plan
        </Button>
      </div>

      <div className="bg-background border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Benefits</TableHead>
              <TableHead>Most Popular</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan._id}>
                  <TableCell className="font-medium">
                    <div>{plan.title}</div>
                    <div className="text-sm text-muted-foreground">{plan.duration}</div>
                  </TableCell>
                  <TableCell>
                    <div>₹{plan.totalPrice.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">₹{plan.monthlyPrice}/month</div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <ul className="list-disc pl-4 text-sm text-muted-foreground">
                      {plan.benefits.slice(0, 2).map(b => <li key={b}>{b}</li>)}
                      {plan.benefits.length > 2 && <li>...and {plan.benefits.length - 2} more</li>}
                    </ul>
                  </TableCell>
                  <TableCell>
                    {plan.popular? <Badge variant="secondary">Yes</Badge>:<Badge variant="destructive">No</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleOpenModalForEdit(plan)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(plan._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SubscriptionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlan}
        planData={editingPlan}
        isLoading={loading}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the subscription plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={loading} className="bg-[var(--destructive)] hover:bg-[var(--destructive)]/90">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, delete plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}