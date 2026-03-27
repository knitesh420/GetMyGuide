// "use client";

// import React, { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useRouter } from "next/navigation";
// import { AppDispatch, RootState } from "@/lib/store";
// import { createBlog } from "@/lib/redux/thunks/blog/blogThunks";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Loader2,
//   X,
//   Video,
//   Image as ImageIcon,
//   ArrowLeft,
//   Upload,
//   CheckCircle2,
// } from "lucide-react";
// import Link from "next/link";
// import { toast } from "@/hooks/use-toast";

// export default function CreateBlogPage() {
//   const dispatch = useDispatch<AppDispatch>();
//   const router = useRouter();

//   const { user, isAuthenticated } = useSelector(
//     (state: RootState) => state.auth,
//   );

//   const [description, setDescription] = useState("");
//   const [hasImage, setHasImage] = useState(false);
//   const [videoFile, setVideoFile] = useState<File | null>(null);
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [videoPreview, setVideoPreview] = useState<string | null>(null);
//   const [imagePreview, setImagePreview] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);

//   // Check authentication and admin role
//   React.useEffect(() => {
//     if (!isAuthenticated) {
//       toast({
//         title: "Authentication Required",
//         description: "Please login to create a blog post",
//         variant: "destructive",
//       });
//       router.push("/login");
//     } else if (user?.role !== "admin") {
//       toast({
//         title: "Access Denied",
//         description: "Only admins can create blog posts",
//         variant: "destructive",
//       });
//       router.push("/blogs");
//     }
//   }, [isAuthenticated, user, router]);

//   const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file && file.type.startsWith("video/")) {
//       setVideoFile(file);
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setVideoPreview(reader.result as string);
//       };
//       reader.readAsDataURL(file);
//     } else {
//       toast({
//         title: "Invalid file",
//         description: "Please select a valid video file",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     const allowedTypes = ["image/png", "image/webp", "image/jpg", "image/jpeg"];

//     if (file && allowedTypes.includes(file.type)) {
//       setImageFile(file);
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setImagePreview(reader.result as string);
//       };
//       reader.readAsDataURL(file);
//     } else {
//       toast({
//         title: "Invalid file",
//         description: "Please select a valid image file (PNG, JPG, or WEBP)",
//         variant: "destructive",
//       });
//     }
//   };

//   const removeVideo = () => {
//     setVideoFile(null);
//     setVideoPreview(null);
//   };

//   const removeImage = () => {
//     setImageFile(null);
//     setImagePreview(null);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!description.trim()) {
//       toast({
//         title: "Validation error",
//         description: "Description is required.",
//         variant: "destructive",
//       });
//       return;
//     }

//     if (!videoFile) {
//       toast({
//         title: "Validation error",
//         description: "Please upload a video file",
//         variant: "destructive",
//       });
//       return;
//     }

//     if (hasImage && !imageFile) {
//       toast({
//         title: "Validation error",
//         description:
//           'Please upload an image or uncheck "Include Thumbnail Image"',
//         variant: "destructive",
//       });
//       return;
//     }

//     const formData = new FormData();
//     formData.append("description", description.trim());
//     formData.append("hasImage", String(hasImage));
//     formData.append("video", videoFile);

//     if (hasImage && imageFile) {
//       formData.append("image", imageFile);
//     }

//     setIsLoading(true);

//     try {
//       console.log("Submitting blog with:", {
//         description: description.trim(),
//         hasImage,
//         videoFile: videoFile?.name,
//         imageFile: imageFile?.name,
//       });

//       await dispatch(createBlog(formData)).unwrap();

//       toast({
//         title: "Success!",
//         description: "Blog post created successfully",
//       });

//       // Redirect to blogs list
//       router.push("/blogs");
//     } catch (error: any) {
//       console.error("Failed to create blog:", error);

//       let errorMessage = "Failed to create blog post. Please try again.";
//       if (typeof error === "string") {
//         errorMessage = error;
//       } else if (error?.message) {
//         errorMessage = error.message;
//       } else if (error?.data?.message) {
//         errorMessage = error.data.message;
//       }

//       toast({
//         title: "Error",
//         description: errorMessage,
//         variant: "destructive",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="bg-gray-50 min-h-screen py-20">
//       <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//         {/* Header */}
//         <div className="mb-8">
//           <Link href="/blogs">
//             <Button variant="ghost" className="mb-4 gap-2">
//               <ArrowLeft className="w-4 h-4" />
//               Back to Blogs
//             </Button>
//           </Link>
//           <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
//             Create New Blog Post
//           </h1>
//           <p className="mt-2 text-lg text-gray-500">
//             Share an amazing tour experience with videos and images.
//           </p>
//         </div>

//         {/* Form */}
//         <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
//           <form onSubmit={handleSubmit} className="space-y-6">
//             {/* Description */}
//             <div className="space-y-2">
//               <Label htmlFor="description" className="text-base font-semibold">
//                 Description <span className="text-red-500">*</span>
//               </Label>
//               <Textarea
//                 id="description"
//                 value={description}
//                 onChange={(e) => setDescription(e.target.value)}
//                 placeholder="Describe this amazing tour experience..."
//                 className="min-h-[150px] resize-y"
//                 required
//               />
//               <p className="text-sm text-gray-500">
//                 Share details about the location, experience, and what makes it
//                 special.
//               </p>
//             </div>

//             {/* Video Upload */}
//             <div className="space-y-2">
//               <Label htmlFor="video-upload" className="text-base font-semibold">
//                 Video <span className="text-red-500">*</span>
//               </Label>
//               <div className="space-y-3">
//                 <Input
//                   id="video-upload"
//                   type="file"
//                   accept="video/*"
//                   onChange={handleVideoChange}
//                   className="hidden"
//                 />
//                 {!videoPreview ? (
//                   <Button
//                     type="button"
//                     variant="outline"
//                     onClick={() =>
//                       document.getElementById("video-upload")?.click()
//                     }
//                     className="w-full h-48 border-2 border-dashed hover:border-primary hover:bg-gray-50 transition-colors"
//                   >
//                     <div className="flex flex-col items-center gap-3">
//                       <div className="rounded-full bg-gray-100 p-4">
//                         <Video className="w-8 h-8 text-gray-600" />
//                       </div>
//                       <div className="text-center">
//                         <span className="font-semibold text-gray-900 block">
//                           Click to upload video
//                         </span>
//                         <span className="text-sm text-gray-500 mt-1 block">
//                           MP4, WebM, or other video formats
//                         </span>
//                       </div>
//                     </div>
//                   </Button>
//                 ) : (
//                   <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden bg-black">
//                     <Button
//                       type="button"
//                       variant="destructive"
//                       size="icon"
//                       className="absolute top-4 right-4 z-10 shadow-lg"
//                       onClick={removeVideo}
//                     >
//                       <X className="w-4 h-4" />
//                     </Button>
//                     <div className="p-4">
//                       <video
//                         src={videoPreview}
//                         controls
//                         className="w-full rounded-lg max-h-96"
//                       />
//                       {videoFile && (
//                         <div className="mt-3 flex items-center gap-2 text-white">
//                           <CheckCircle2 className="w-4 h-4 text-green-400" />
//                           <span className="text-sm font-medium">
//                             {videoFile.name}
//                           </span>
//                           <span className="text-xs text-gray-400">
//                             ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
//                           </span>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Include Image Checkbox */}
//             <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
//               <input
//                 type="checkbox"
//                 id="hasImage"
//                 checked={hasImage}
//                 onChange={(e) => setHasImage(e.target.checked)}
//                 className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
//               />
//               <div className="flex-1">
//                 <Label
//                   htmlFor="hasImage"
//                   className="cursor-pointer font-semibold text-gray-900"
//                 >
//                   Include a thumbnail image
//                 </Label>
//                 <p className="text-sm text-gray-600 mt-1">
//                   Add a custom thumbnail that will be displayed in the blog list
//                 </p>
//               </div>
//             </div>

//             {/* Image Upload (Conditional) */}
//             {hasImage && (
//               <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
//                 <Label
//                   htmlFor="image-upload"
//                   className="text-base font-semibold"
//                 >
//                   Thumbnail Image <span className="text-red-500">*</span>
//                 </Label>
//                 <div className="space-y-3">
//                   <Input
//                     id="image-upload"
//                     type="file"
//                     accept="image/png,image/jpeg,image/jpg,image/webp"
//                     onChange={handleImageChange}
//                     className="hidden"
//                   />
//                   {!imagePreview ? (
//                     <Button
//                       type="button"
//                       variant="outline"
//                       onClick={() =>
//                         document.getElementById("image-upload")?.click()
//                       }
//                       className="w-full h-48 border-2 border-dashed hover:border-primary hover:bg-gray-50 transition-colors"
//                     >
//                       <div className="flex flex-col items-center gap-3">
//                         <div className="rounded-full bg-gray-100 p-4">
//                           <ImageIcon className="w-8 h-8 text-gray-600" />
//                         </div>
//                         <div className="text-center">
//                           <span className="font-semibold text-gray-900 block">
//                             Click to upload image
//                           </span>
//                           <span className="text-sm text-gray-500 mt-1 block">
//                             PNG, JPG, or WEBP (recommended: 16:9 ratio)
//                           </span>
//                         </div>
//                       </div>
//                     </Button>
//                   ) : (
//                     <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden">
//                       <Button
//                         type="button"
//                         variant="destructive"
//                         size="icon"
//                         className="absolute top-4 right-4 z-10 shadow-lg"
//                         onClick={removeImage}
//                       >
//                         <X className="w-4 h-4" />
//                       </Button>
//                       <div className="p-4">
//                         <img
//                           src={imagePreview}
//                           alt="Thumbnail preview"
//                           className="w-full rounded-lg max-h-96 object-cover"
//                         />
//                         {imageFile && (
//                           <div className="mt-3 flex items-center gap-2">
//                             <CheckCircle2 className="w-4 h-4 text-green-600" />
//                             <span className="text-sm font-medium text-gray-900">
//                               {imageFile.name}
//                             </span>
//                             <span className="text-xs text-gray-500">
//                               ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
//                             </span>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}

//             {/* Submit Buttons */}
//             <div className="flex gap-4 pt-6 border-t border-gray-200">
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={() => router.push("/blogs")}
//                 disabled={isLoading}
//                 className="flex-1"
//               >
//                 Cancel
//               </Button>
//               <Button
//                 type="submit"
//                 disabled={isLoading}
//                 className="flex-1 gap-2"
//               >
//                 {isLoading ? (
//                   <>
//                     <Loader2 className="w-4 h-4 animate-spin" />
//                     Creating...
//                   </>
//                 ) : (
//                   <>
//                     <Upload className="w-4 h-4" />
//                     Create Blog Post
//                   </>
//                 )}
//               </Button>
//             </div>
//           </form>
//         </div>
//       </main>
//     </div>
//   );
// }
"use client";

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { createBlog } from "@/lib/redux/thunks/blog/blogThunks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  X,
  Video,
  Image as ImageIcon,
  ArrowLeft,
  Upload,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

export default function CreateBlogPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  const [description, setDescription] = useState("");
  const [hasImage, setHasImage] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check authentication and admin role
  React.useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to create a blog post",
        variant: "destructive",
      });
      router.push("/login");
    } else if (user?.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only admins can create blog posts",
        variant: "destructive",
      });
      router.push("/blogs");
    }
  }, [isAuthenticated, user, router]);

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
        title: "Invalid file",
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
        title: "Invalid file",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast({
        title: "Validation error",
        description: "Description is required.",
        variant: "destructive",
      });
      return;
    }

    if (!videoFile) {
      toast({
        title: "Validation error",
        description: "Please upload a video file",
        variant: "destructive",
      });
      return;
    }

    if (hasImage && !imageFile) {
      toast({
        title: "Validation error",
        description:
          'Please upload a country flag image or uncheck "Include Country Flag"',
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

    setIsLoading(true);

    try {
      console.log("Submitting blog with:", {
        description: description.trim(),
        hasImage,
        videoFile: videoFile?.name,
        imageFile: imageFile?.name,
      });

      await dispatch(createBlog(formData)).unwrap();

      toast({
        title: "Success!",
        description: "Blog post created successfully",
      });

      // Redirect to blogs list
      router.push("/blogs");
    } catch (error: any) {
      console.error("Failed to create blog:", error);

      let errorMessage = "Failed to create blog post. Please try again.";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-20">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/blogs">
            <Button variant="ghost" className="mb-4 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Blogs
            </Button>
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Create New Blog Post
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Share an amazing tour experience with videos and country flags.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this amazing tour experience..."
                className="min-h-[150px] resize-y"
                required
              />
              <p className="text-sm text-gray-500">
                Share details about the location, experience, and what makes it
                special.
              </p>
            </div>

            {/* Video Upload */}
            <div className="space-y-2">
              <Label htmlFor="video-upload" className="text-base font-semibold">
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
                    className="w-full h-48 border-2 border-dashed hover:border-primary hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-gray-100 p-4">
                        <Video className="w-8 h-8 text-gray-600" />
                      </div>
                      <div className="text-center">
                        <span className="font-semibold text-gray-900 block">
                          Click to upload video
                        </span>
                        <span className="text-sm text-gray-500 mt-1 block">
                          MP4, WebM, or other video formats
                        </span>
                      </div>
                    </div>
                  </Button>
                ) : (
                  <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden bg-black">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-4 right-4 z-10 shadow-lg"
                      onClick={removeVideo}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <div className="p-4">
                      <video
                        src={videoPreview}
                        controls
                        className="w-full rounded-lg max-h-96"
                      />
                      {videoFile && (
                        <div className="mt-3 flex items-center gap-2 text-white">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium">
                            {videoFile.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">
                The video will display its own thumbnail in the blog list.
              </p>
            </div>

            {/* Include Country Flag Checkbox */}
            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="hasImage"
                checked={hasImage}
                onChange={(e) => setHasImage(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
              />
              <div className="flex-1">
                <Label
                  htmlFor="hasImage"
                  className="cursor-pointer font-semibold text-gray-900"
                >
                  Include a country flag
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Add a country flag image that will be displayed beside the
                  description
                </p>
              </div>
            </div>

            {/* Country Flag Image Upload (Conditional) */}
            {hasImage && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label
                  htmlFor="image-upload"
                  className="text-base font-semibold"
                >
                  Country Flag <span className="text-red-500">*</span>
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
                      className="w-full h-48 border-2 border-dashed hover:border-primary hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-gray-100 p-4">
                          <ImageIcon className="w-8 h-8 text-gray-600" />
                        </div>
                        <div className="text-center">
                          <span className="font-semibold text-gray-900 block">
                            Click to upload country flag
                          </span>
                          <span className="text-sm text-gray-500 mt-1 block">
                            PNG, JPG, or WEBP (flag image recommended)
                          </span>
                        </div>
                      </div>
                    </Button>
                  ) : (
                    <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-4 right-4 z-10 shadow-lg"
                        onClick={removeImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <div className="p-4">
                        <img
                          src={imagePreview}
                          alt="Country flag preview"
                          className="w-full rounded-lg max-h-96 object-contain bg-white"
                        />
                        {imageFile && (
                          <div className="mt-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-900">
                              {imageFile.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  This flag will appear beside the description in the blog
                  detail page.
                </p>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/blogs")}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Create Blog Post
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
