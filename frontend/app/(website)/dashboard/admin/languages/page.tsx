// app/admin/languages/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks'; // Using custom hooks
import {
  fetchLanguages,
  addLanguage,
  updateLanguage,
  deleteLanguage,
} from '@/lib/redux/thunks/admin/languageThunks';
import { LanguageOption, CreateLanguageOption } from '@/types/admin';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { LanguageFormModal } from '@/components/admin/LanguageFormModal';
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
import { toast } from 'react-toastify';

export default function AdminLanguagesPage() {
  const dispatch = useAppDispatch();
  // Ensure your RootState type is correct for this slice
  const { languages, loading, error } = useAppSelector((state) => state.admin);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<LanguageOption | null>(null);
  const [languageToDelete, setLanguageToDelete] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchLanguages());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleOpenModalForNew = () => {
    setEditingLanguage(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (language: LanguageOption) => {
    setEditingLanguage(language);
    setIsModalOpen(true);
  };

  const handleSaveLanguage = (languageToSave: LanguageOption | CreateLanguageOption) => {
    // The thunks expect a plain object, which formData is.
    const action = '_id' in languageToSave ? updateLanguage(languageToSave as LanguageOption) : addLanguage(languageToSave);

    dispatch(action)
      .unwrap()
      .then(() => {
        toast.success(`Language ${'_id' in languageToSave ? 'updated' : 'added'} successfully!`);
        setIsModalOpen(false);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to save language.');
      });
  };

  const handleDeleteClick = (languageId: string) => {
    setLanguageToDelete(languageId);
    setIsAlertOpen(true);
  };

  const confirmDelete = () => {
    if (languageToDelete) {
      dispatch(deleteLanguage(languageToDelete))
        .unwrap()
        .then(() => {
          toast.success("Language deleted successfully!");
        })
        .catch((err) => {
          toast.error(err.message || 'Failed to delete language.');
        })
        .finally(() => {
          setIsAlertOpen(false);
          setLanguageToDelete(null);
        });
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Language Charges</h1>
          <p className="text-muted-foreground">Add surcharges for specialized language guides.</p>
        </div>
        <Button onClick={handleOpenModalForNew} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Language
        </Button>
      </div>

      <div className="bg-background border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Language Name</TableHead>
              {/* ✅ UPDATED: Header for tiered pricing */}
              <TableHead>Surcharge (1-14 / 15+ Persons)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && languages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : languages.map((language) => (
              <TableRow key={language._id}>
                <TableCell className="font-medium">{language.languageName}</TableCell>
                <TableCell>
                  {/* ✅ UPDATED: Display tiered pricing safely with optional chaining */}
                  <div className="flex flex-col text-sm">
                    <span>
                      <strong>₹{(language.pricing?.standardGroup?.price ?? 0).toLocaleString()}</strong>
                      <span className="text-muted-foreground"> (1-14)</span>
                    </span>
                    <span>
                      <strong>₹{(language.pricing?.largeGroup?.price ?? 0).toLocaleString()}</strong>
                       <span className="text-muted-foreground"> (15+)</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleOpenModalForEdit(language)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(language._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <LanguageFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveLanguage}
        languageData={editingLanguage}
        isLoading={loading}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the language option. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, delete it'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}