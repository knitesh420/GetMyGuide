"use client";

import { useState, FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Youtube, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/** Extract YouTube video ID from a URL for preview purposes */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

interface BlogFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  isLoading?: boolean;
}

export function BlogFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: BlogFormModalProps) {
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [hasImage, setHasImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const videoId = extractVideoId(youtubeUrl);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const allowedTypes = ["image/png", "image/webp", "image/jpg", "image/jpeg"];

    if (file && allowedTypes.includes(file.type)) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (PNG, JPG, or WEBP)",
        variant: "destructive",
      });
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const resetForm = () => {
    setDescription("");
    setYoutubeUrl("");
    setHasImage(false);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required.",
        variant: "destructive",
      });
      return;
    }

    if (!youtubeUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "YouTube URL is required",
        variant: "destructive",
      });
      return;
    }

    if (!videoId) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (hasImage && !imageFile) {
      toast({
        title: "Validation Error",
        description: 'Please upload an image or uncheck "Include Image"',
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("description", description.trim());
    formData.append("youtubeUrl", youtubeUrl.trim());
    formData.append("hasImage", String(hasImage));

    if (hasImage && imageFile) {
      formData.append("image", imageFile);
    }

    onSubmit(formData);
    resetForm();
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Blog Post</DialogTitle>
          <DialogDescription>
            Share an amazing tour experience. Add a YouTube video and a
            description.
          </DialogDescription>
        </DialogHeader>

        <form id="blog-form" onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this amazing tour experience..."
              className="min-h-[100px] resize-y"
              required
            />
            <p className="text-xs text-gray-500">
              Share details about the location, experience, and what makes it
              special.
            </p>
          </div>

          {/* YouTube URL */}
          <div className="space-y-2">
            <Label htmlFor="youtube-url">
              YouTube Video URL <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
              <Input
                id="youtube-url"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="pl-10"
                required
              />
            </div>

            {/* YouTube Preview */}
            {videoId && (
              <div className="mt-2 border rounded-lg overflow-hidden">
                <div className="aspect-video">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video preview"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-2 bg-gray-50 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-gray-700">
                    Video ID: {videoId}
                  </span>
                </div>
              </div>
            )}

            {youtubeUrl.trim() && !videoId && (
              <p className="text-xs text-red-500 mt-1">
                Could not detect a valid YouTube video ID from this URL.
              </p>
            )}
          </div>

          {/* Include Image Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasImage"
              checked={hasImage}
              onChange={(e) => setHasImage(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="hasImage" className="cursor-pointer font-normal">
              Include a thumbnail image
            </Label>
          </div>

          {/* Image Upload (Conditional) */}
          {hasImage && (
            <div className="space-y-2">
              <Label htmlFor="image-upload">
                Thumbnail Image <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-3">
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {!imagePreview ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("image-upload")?.click()
                    }
                    className="w-full h-32 border-2 border-dashed hover:border-primary"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                      <span>Click to upload image</span>
                      <span className="text-xs text-gray-500">
                        PNG, JPG, or WEBP
                      </span>
                    </div>
                  </Button>
                ) : (
                  <div className="relative border rounded-lg p-4">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 z-10"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <img
                      src={imagePreview}
                      alt="Thumbnail preview"
                      className="w-full rounded-md max-h-64 object-cover"
                    />
                    {imageFile && (
                      <p className="text-xs text-gray-600 mt-2">
                        {imageFile.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" form="blog-form" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Blog Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
