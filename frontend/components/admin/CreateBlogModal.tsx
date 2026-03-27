"use client";

import { useState, useMemo, FormEvent, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Assuming a Blog type is available, e.g., from '@/lib/data'
interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string;
  thumbnail?: string;
  tags?: string[];
  published?: boolean;
  publishedAt?: string;
}

interface BlogFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  isLoading?: boolean;
  initialData?: Blog | null; // Used for editing
}

// Helper function to create a URL-friendly slug from the title
const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-');     // Replace multiple - with single -
};

export function BlogFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading = false, 
  initialData = null 
}: BlogFormModalProps) {
  
  const isEditMode = !!initialData;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [published, setPublished] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const ReactQuill = useMemo(() => dynamic(() => import('react-quill'), { ssr: false }), []);
  
  // Effect to populate form when in edit mode or reset when in create mode
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) {
        setTitle(initialData.title);
        setSlug(initialData.slug);
        setContent(initialData.content || '');
        setTags(initialData.tags?.join(', ') || '');
        setPublished(initialData.published || false);
        setImagePreview(initialData.thumbnail || null);
        setThumbnail(null); // Clear file input
      } else {
        // Reset form for create mode
        setTitle('');
        setSlug('');
        setContent('');
        setTags('');
        setPublished(false);
        setThumbnail(null);
        setImagePreview(null);
      }
    }
  }, [isOpen, initialData, isEditMode]);

  // Effect to auto-generate slug from title ONLY in create mode
  useEffect(() => {
    if (!isEditMode) {
      setSlug(slugify(title));
    }
  }, [title, isEditMode]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnail(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert('Title and Content are required.');
      return;
    }
    
    // Thumbnail is required for new posts, but not when editing an existing one
    if (!isEditMode && !thumbnail) {
      alert('Please upload a thumbnail image');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('slug', slug);
    formData.append('content', content);
    
    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    formData.append('tags', JSON.stringify(tagsArray));
    
    formData.append('published', String(published));
    
    // Only append the thumbnail if a new file has been selected.
    // The backend will keep the old one if this field is omitted on update.
    if (thumbnail) {
      formData.append('thumbnail', thumbnail);
    }
    
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[95vh]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Blog Post' : 'Create a New Blog Post'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update the details for this article. Click "Save Changes" when finished.'
              : 'Fill in the details below to publish a new article. Click "Create Post" when finished.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form id="blog-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto grid gap-6 p-6">
          {/* Title Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="col-span-3" 
              placeholder="Enter blog title"
              required 
            />
          </div>

          {/* Slug Input (Disabled) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="slug" className="text-right">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))} // Allow manual editing if needed, still slugified
              className="col-span-3 bg-gray-50"
              placeholder="Auto-generated from title"
              required
            />
          </div>

          {/* Tags Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Travel, Tips, Destinations"
            />
          </div>

          {/* Published Checkbox */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="published" className="text-right">Status</Label>
            <div className="col-span-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="published" className="cursor-pointer">Publish immediately</Label>
            </div>
          </div>

          {/* Thumbnail Upload */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="thumbnail-image" className="text-right pt-2">
              Thumbnail {!isEditMode && <span className="text-red-500">*</span>}
            </Label>
            <div className="col-span-3">
              <Input id="thumbnail-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <Button type="button" variant="outline" onClick={() => document.getElementById('thumbnail-image')?.click()}>
                <Upload className="w-4 h-4 mr-2"/> {imagePreview ? 'Change Image' : 'Upload Image'}
              </Button>
              {imagePreview && (
                <div className="mt-4 border rounded-md p-2">
                  <img src={imagePreview} alt="Thumbnail preview" className="rounded-md max-h-48 w-auto object-cover"/>
                </div>
              )}
            </div>
          </div>
          
          {/* Content Editor */}
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="content" className="mb-2">
              Content <span className="text-red-500">*</span>
            </Label>
            <div className="h-64 mb-12">
              <ReactQuill 
                theme="snow" 
                value={content} 
                onChange={setContent} 
                className="h-full bg-background" 
                placeholder="Write your blog content here..."
              />
            </div>
          </div>
        </form>
        
        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="blog-form" disabled={isLoading} className="red-gradient">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Save Changes' : 'Create Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}