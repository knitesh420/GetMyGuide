"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Eye, Film, Plus, Trash2, Upload } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  createNewAdvertisement,
  deleteAdvertisementData,
  fetchAllAdvertisements,
  toggleAdvertisement,
} from "@/lib/redux/advertisementSlice";
import { Advertisement } from "@/lib/service/advertisementService";
import { PageHeader, EmptyState, AdminStatusBadge } from "@/components/admin/ui";
import { SkeletonCardGrid } from "@/components/animations/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Videos are served from the same static route the guide documents use. */
const videoUrl = (filename: string) => `${API_BASE}/media/misc/${filename}`;

const MAX_BYTES = 500 * 1024 * 1024; // Mirrors the backend's multer limit.

function UploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle("");
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleSubmit = async () => {
    if (title.trim().length < 3) {
      toast.error("Give the advertisement a title.");
      return;
    }
    if (!file) {
      toast.error("Choose a video to upload.");
      return;
    }
    // Checked here as well as server-side so a 500MB upload isn't pushed over
    // the wire only to be rejected on arrival.
    if (file.size > MAX_BYTES) {
      toast.error("That video is over the 500MB limit.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("video", file);

    setSubmitting(true);
    const result = await dispatch(createNewAdvertisement(formData));
    setSubmitting(false);

    if (createNewAdvertisement.fulfilled.match(result)) {
      toast.success("Advertisement uploaded.");
      reset();
      onOpenChange(false);
    } else {
      toast.error((result.payload as string) || "The upload failed.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New advertisement</DialogTitle>
          <DialogDescription>
            Upload a video to show on the site. It stays hidden until you switch
            it live.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ad-title">Title</Label>
            <Input
              id="ad-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Summer campaign"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ad-video">Video</Label>
            <Input
              id="ad-video"
              ref={fileInput}
              type="file"
              accept="video/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-slate-500">
              Video files only, up to 500MB.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              "Uploading…"
            ) : (
              <>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdCard({ ad }: { ad: Advertisement }) {
  const dispatch = useAppDispatch();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleToggle = async () => {
    const result = await dispatch(toggleAdvertisement(ad.id));
    if (toggleAdvertisement.fulfilled.match(result)) {
      toast.success(ad.isActive ? "Advertisement hidden." : "Advertisement is live.");
    } else {
      toast.error((result.payload as string) || "Could not change the status.");
    }
  };

  const handleDelete = async () => {
    const result = await dispatch(deleteAdvertisementData(ad.id));
    setConfirmingDelete(false);
    if (deleteAdvertisementData.fulfilled.match(result)) {
      toast.success("Advertisement deleted.");
    } else {
      toast.error((result.payload as string) || "Could not delete it.");
    }
  };

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <video
        src={videoUrl(ad.videoFilename)}
        controls
        preload="metadata"
        className="aspect-video w-full bg-slate-900 object-contain"
      />

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 font-semibold text-slate-900">{ad.title}</h2>
          <span className="shrink-0">
            <AdminStatusBadge
              status={ad.isActive ? "live" : "hidden"}
              tone={ad.isActive ? "success" : "neutral"}
              label={ad.isActive ? "Live" : "Hidden"}
            />
          </span>
        </div>

        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <Eye className="h-3.5 w-3.5" />
          {ad.views.toLocaleString()} view{ad.views === 1 ? "" : "s"}
        </p>

        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <Switch checked={ad.isActive} onCheckedChange={handleToggle} />
            Show on site
          </label>

          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{ad.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              The video will be removed from the site and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

export default function AdminAdvertisementsPage() {
  const dispatch = useAppDispatch();
  const { allAdvertisements, loading, error } = useAppSelector(
    (state) => state.advertisement,
  );
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchAllAdvertisements());
  }, [dispatch]);

  const liveCount = allAdvertisements.filter((ad) => ad.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advertisements"
        description={`${allAdvertisements.length} uploaded, ${liveCount} live on the site.`}
      >
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New advertisement
        </Button>
      </PageHeader>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && allAdvertisements.length === 0 ? (
        <SkeletonCardGrid count={3} />
      ) : allAdvertisements.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No advertisements yet"
          description="Upload a video to promote a campaign on the site."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {allAdvertisements.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
