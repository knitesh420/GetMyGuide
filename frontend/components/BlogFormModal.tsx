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
import { Loader2, Upload, X, Video, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const [hasImage, setHasImage] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a valid video file",
        variant: "destructive",
      });
    }
  };

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

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
  };

  const removeImage = () => {
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

    if (!videoFile) {
      toast({
        title: "Validation Error",
        description: "Please upload a video file",
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
    formData.append("hasImage", String(hasImage));
    formData.append("video", videoFile);

    if (hasImage && imageFile) {
      formData.append("image", imageFile);
    }

    onSubmit(formData);

    // Reset form after submission
    setDescription("");
    setHasImage(false);
    setVideoFile(null);
    setImageFile(null);
    setVideoPreview(null);
    setImagePreview(null);
  };

  const handleClose = () => {
    if (!isLoading) {
      // Reset form when closing
      setDescription("");
      setHasImage(false);
      setVideoFile(null);
      setImageFile(null);
      setVideoPreview(null);
      setImagePreview(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Blog Post</DialogTitle>
          <DialogDescription>
            Share an amazing tour experience. Upload a video and add a
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

          {/* Video Upload */}
          <div className="space-y-2">
            <Label htmlFor="video-upload">
              Video <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3">
              <Input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
              />
              {!videoPreview ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    document.getElementById("video-upload")?.click()
                  }
                  className="w-full h-32 border-2 border-dashed hover:border-primary"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Video className="w-8 h-8 text-gray-400" />
                    <span>Click to upload video</span>
                    <span className="text-xs text-gray-500">
                      MP4, WebM, or other video formats
                    </span>
                  </div>
                </Button>
              ) : (
                <div className="relative border rounded-lg p-4 bg-black">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 z-10"
                    onClick={removeVideo}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <video
                    src={videoPreview}
                    controls
                    className="w-full rounded-md max-h-64"
                  />
                  {videoFile && (
                    <p className="text-xs text-white mt-2">{videoFile.name}</p>
                  )}
                </div>
              )}
            </div>
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
