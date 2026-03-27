// app/dashboard/admin/users/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import type { User } from '@/lib/data';

import { useUser } from '@/lib/hooks/useUser'; // <-- 1. Import the custom hook

import { 
  Search, Filter, Eye, Trash2, Users as UsersIcon,
  ShoppingBag, Calendar, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Card, CardContent, CardHeader, CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetFooter, SheetClose,
} from "@/components/ui/sheet";

// 2. A custom hook to debounce user input
const useDebounce = (value: string, delay: number): string => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

export default function UsersAdminPage() {
  // 3. Use the custom hook to interact with the Redux store
  const { 
    users, 
    pagination, 
    loading, 
    error, 
    getAllUsers, 
    deleteUser 
  } = useUser();
  
  // 4. State for UI controls
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'guide'>('user');
  const debouncedSearch = useDebounce(searchTerm, 500); // 500ms delay
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // 5. Fetch users whenever a filter, search term, or page changes
  useEffect(() => {
    getAllUsers({ page, limit: 10, search: debouncedSearch, role: roleFilter });
  }, [page, debouncedSearch, roleFilter]); // Removed getAllUsers from deps as it's stable

  // Effect to show errors from the store
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleViewUser = (user: User) => {
      setSelectedUser(user);
      setIsSheetOpen(true);
  };

  const handleDelete = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete the user "${userName}"? This cannot be undone.`)) {
      deleteUser(userId)
        .then((result: any) => {
          if (result.type.endsWith('fulfilled')) {
            toast.success(`User "${userName}" was deleted.`);
          } else {
            toast.error(`Failed to delete user: ${result.payload}`);
          }
        });
    }
  };

  // In a real app, user bookings would be fetched via another API call/thunk
  const userBookings: any[] = []; 

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-muted-foreground mt-1">View and manage all registered users.</p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className="px-4 py-2 rounded-md border bg-transparent">
                  <option value="all">All Roles</option>
                  <option value="user">Users Only</option>
                  <option value="guide">Guides Only</option>
                </select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : users.length > 0 ? (
                    users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">{user.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <p className="font-semibold">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'guide' ? 'default' : 'secondary'}>{user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                              <Eye className="w-4 h-4 mr-1" /> View
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(user.id, user.name)}>
                              <Trash2 className="w-4 h-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <UsersIcon className="w-8 h-8 text-muted-foreground"/>
                            <p>No users found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 6. Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-end items-center mt-6">
             <span className="text-sm text-muted-foreground mr-4">
                Page {pagination.page} of {pagination.totalPages}
             </span>
             <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={pagination.page <= 1}>
                    <ChevronLeft className="w-4 h-4 mr-1"/> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.totalPages}>
                    Next <ChevronRight className="w-4 h-4 ml-1"/>
                </Button>
             </div>
          </div>
        )}
      </div>

      {/* --- USER DETAILS SHEET --- */}
      {selectedUser && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full max-w-2xl sm:max-w-2xl flex flex-col p-0">
            <SheetHeader className="p-6 border-b">
              <SheetTitle className="text-2xl">User Details</SheetTitle>
              <SheetDescription>Viewing profile and booking history for {selectedUser.name}.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Card */}
              <Card>
                <CardHeader><CardTitle>User Profile</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold">{selectedUser.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <p className="font-bold text-xl">{selectedUser.name}</p>
                            <p className="text-muted-foreground">{selectedUser.email}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-muted-foreground">Role</p>
                        <Badge variant={selectedUser.role === 'guide' ? 'default' : 'secondary'} className="mt-1">{selectedUser.role}</Badge>
                    </div>
                </CardContent>
              </Card>

              {/* Booking History Card */}
              <Card>
                <CardHeader><CardTitle>Booking History ({userBookings.length})</CardTitle></CardHeader>
                <CardContent>
                  {userBookings.length > 0 ? (
                    <div className="space-y-4">
                      {/* Booking history would be rendered here */}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-2" />
                      <p>This user has not made any bookings yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <SheetFooter className="p-6 border-t bg-muted/50">
              <SheetClose asChild><Button variant="outline">Close</Button></SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}