"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { AdminPackage, AdminLocation } from '@/types/admin';
import { fetchAdminLocations } from '@/lib/redux/thunks/admin/locationThunks';

// Import thunks from the dedicated package thunks file
import { fetchPackages, addPackage, updatePackage, deletePackage } from '@/lib/redux/thunks/admin/packageThunks';
import { toast } from 'react-toastify';
import { PackageFormModal } from '@/components/admin/PackageFormModal';
import { Search, Plus, Edit, Trash2, Filter, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function PackagesAdminPage() {
  const dispatch = useAppDispatch();
  // ✅ UPDATED: Selecting state from the dedicated 'packages' slice
  const { items: packages, loading, error, currentAction } = useAppSelector((state) => state.packages);
  const allLocations = useAppSelector((state) => state.admin.locations);

  // State for UI and filtering/pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // State for modals and alerts
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<AdminPackage | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  
  const PACKAGES_PER_PAGE = 5;

  // Fetch initial data when the component mounts
  useEffect(() => {
    dispatch(fetchAdminLocations());
    dispatch(fetchPackages());
  }, [dispatch]);
  
  // Optional: Show a toast if any fetch/action fails
  useEffect(() => {
    if (loading === 'failed' && error) {
      toast.error(error);
    }
  }, [error, loading]);


  // Memoized filtering logic for performance
  const filteredPackages = useMemo(() => {
    return packages
      .filter(pkg => statusFilter === 'all' || (statusFilter === 'active' ? pkg.isActive : !pkg.isActive))
      .filter(pkg => {
        const searchLower = searchTerm.toLowerCase();
        return pkg.title.toLowerCase().includes(searchLower) || (pkg.locations || []).join(' ').toLowerCase().includes(searchLower);
      });
  }, [packages, searchTerm, statusFilter]);

  // Pagination calculations based on the *filtered* data
  const totalPages = Math.ceil(filteredPackages.length / PACKAGES_PER_PAGE);
  const paginatedPackages = filteredPackages.slice(
    (currentPage - 1) * PACKAGES_PER_PAGE,
    currentPage * PACKAGES_PER_PAGE
  );

  // Handler for saving (Create/Update)
  const handleSave = async (formData: FormData) => {
    try {
      if (editingPackage) {
        await dispatch(updatePackage({ id: editingPackage._id, packageData: formData })).unwrap();
        toast.success("Package updated successfully!");
      } else {
        await dispatch(addPackage(formData)).unwrap();
        toast.success("Package created successfully!");
      }
      setShowForm(false);
      setEditingPackage(null);
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    }
  };
  
  // Handler for deletion
  const handleDelete = async () => {
    if (!packageToDelete) return;
    try {
      await dispatch(deletePackage(packageToDelete)).unwrap();
      toast.success("Package deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete package.");
    }
    setIsAlertOpen(false);
    setPackageToDelete(null);
  };

  // Handler for opening the edit modal
  const handleEdit = (pkg: AdminPackage) => {
    setEditingPackage(pkg);
    setShowForm(true);
  };
  
  // Handler for toggling the active status of a package
  const handleToggleStatus = async (pkg: AdminPackage) => {
      const formDataToSend = new FormData();
      formDataToSend.append('title', pkg.title);
      formDataToSend.append('description', pkg.description);
      formDataToSend.append('price', (pkg.price ?? 0).toString());
      formDataToSend.append('basePrice', (pkg.basePrice ?? 0).toString());
      formDataToSend.append('duration', pkg.duration);
      (pkg.locations || []).forEach(loc => formDataToSend.append('locations', loc));
      (pkg.images || []).forEach(img => formDataToSend.append('existingImages', img));
      formDataToSend.append('isActive', (!pkg.isActive).toString());
      
      try {
        await dispatch(updatePackage({id: pkg._id, packageData: formDataToSend})).unwrap();
        toast.success(`Package status changed to ${!pkg.isActive ? 'Active' : 'Inactive'}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to toggle status.");
      }
  };
  
  const handlePageChange = (page: number) => {
      if (page > 0 && page <= totalPages) {
          setCurrentPage(page);
      }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Packages Management</h1>
            <p className="text-muted-foreground mt-1">Add, edit, and manage all tour packages.</p>
          </div>
          <Button onClick={() => { setEditingPackage(null); setShowForm(true); }}>
            <Plus className="w-5 h-5 mr-2" /> Add New Package
          </Button>
        </div>
        
        {/* Filter and Search Section */}
        <div className="bg-card rounded-lg p-4 border mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input type="text" placeholder="Search by title or location..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="pl-10" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value as any); setCurrentPage(1);}} className="px-4 py-2 rounded-md border bg-transparent">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        
        {/* Packages Table */}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* ✅ UPDATED: Loading state is more specific now */}
                {loading === 'pending' && currentAction === 'fetching' && packages.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8"><RefreshCw className="mx-auto h-6 w-6 animate-spin"/></td></tr>
                ) : paginatedPackages.map((pkg) => (
                  <tr key={pkg._id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={(pkg.images && pkg.images[0]) ? pkg.images[0] : '/placeholder.png'} alt={pkg.title} className="w-16 h-12 rounded-md object-cover" />
                        <div>
                          <div className="font-semibold text-foreground">{pkg.title}</div>
                          <div className="text-sm text-muted-foreground">{(pkg.locations || []).join(', ')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">₹{(pkg.price ?? 0).toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground line-through">₹{(pkg.basePrice ?? 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleToggleStatus(pkg)} disabled={loading === 'pending' && currentAction === 'updating'}>
                        <Badge variant={pkg.isActive ? 'default' : 'destructive'} className="cursor-pointer">
                          {pkg.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(pkg)}><Edit className="w-4 h-4 mr-1"/>Edit</Button>
                        <Button className='bg-red-600' variant="destructive" size="sm" onClick={() => { setPackageToDelete(pkg._id); setIsAlertOpen(true); }}><Trash2 className="w-4 h-4 mr-1"/>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                          <ChevronLeft className="h-4 w-4" />
                          <span className="ml-2">Previous</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                          <span className="mr-2">Next</span>
                          <ChevronRight className="h-4 w-4" />
                      </Button>
                  </div>
              </div>
          )}
        </div>
      </div>

      {/* Reusable Form Modal */}
      <PackageFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingPackage(null); }}
        onSave={handleSave}
        editingPackage={editingPackage}
        isLoading={loading === 'pending' && (currentAction === 'adding' || currentAction === 'updating')}
        allLocations={allLocations} // Pass the fetched locations here
      />
      
      {/* Reusable Alert Dialog for Delete Confirmation */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone and will permanently delete the package.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-500/90">Yes, delete it</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}