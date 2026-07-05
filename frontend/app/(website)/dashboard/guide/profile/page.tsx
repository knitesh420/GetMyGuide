// app/dashboard/guide/profile/page.tsx
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { getMyGuideProfile, updateMyGuideProfile } from "@/lib/redux/thunks/guide/guideThunk";
import { fetchLanguages } from "@/lib/redux/thunks/admin/languageThunks";
import Image from "next/image";

import { MultiSelect, Option } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const DAY_OPTIONS: Option[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
].map((d) => ({ value: d, label: d }));

const GuideProfilePage = () => {
  const dispatch: AppDispatch = useDispatch();

  const { myProfile, loading, error } = useSelector((state: RootState) => state.guide);
  const { languages } = useSelector((state: RootState) => state.admin);

  const [formData, setFormData] = useState({
    experience: "",
    city: "",
    state: "",
    country: "",
    price: "",
    about: "",
    specialization: "",
    availableTime: "",
  });

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [identityProofFiles, setIdentityProofFiles] = useState<File[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  useEffect(() => {
    dispatch(getMyGuideProfile());
    dispatch(fetchLanguages());
  }, [dispatch]);

  useEffect(() => {
    if (myProfile) {
      setFormData({
        experience: myProfile.experience || "",
        city: myProfile.city || "",
        state: myProfile.state || "",
        country: myProfile.country || "",
        price: myProfile.price ? String(myProfile.price) : "",
        about: myProfile.about || "",
        specialization: myProfile.specialization?.join(", ") || "",
        availableTime: myProfile.availableTime || "",
      });

      if (myProfile.languages) setSelectedLanguages(myProfile.languages);
      if (myProfile.availableDays) setSelectedDays(myProfile.availableDays);
      if (myProfile.profileImage) setProfileImagePreview(myProfile.profileImage);
    }
  }, [myProfile]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProfileImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleIdentityProofsChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setIdentityProofFiles(Array.from(e.target.files));
  };

  const handleGalleryChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setGalleryFiles(Array.from(e.target.files));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!myProfile?.registrationCompleted) {
      if (!profileImageFile) {
        return; // required on first submission — input already marks required
      }
      if (identityProofFiles.length === 0) {
        return;
      }
    }

    const submissionFormData = new FormData();
    submissionFormData.append("experience", formData.experience);
    submissionFormData.append("city", formData.city);
    submissionFormData.append("state", formData.state);
    submissionFormData.append("country", formData.country);
    submissionFormData.append("price", formData.price);
    submissionFormData.append("about", formData.about);
    submissionFormData.append("availableTime", formData.availableTime);

    formData.specialization
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => submissionFormData.append("specialization[]", s));

    selectedLanguages.forEach((lang) => submissionFormData.append("languages[]", lang));
    selectedDays.forEach((day) => submissionFormData.append("availableDays[]", day));

    if (profileImageFile) submissionFormData.append("profileImage", profileImageFile);
    identityProofFiles.forEach((f) => submissionFormData.append("identityProofs", f));
    galleryFiles.forEach((f) => submissionFormData.append("galleryImages", f));

    dispatch(updateMyGuideProfile(submissionFormData));
  };

  const languageOptions: Option[] = Array.isArray(languages)
    ? languages.map((lang) => ({ value: lang.languageName, label: lang.languageName }))
    : [];

  return (
    <div className="container mx-auto p-4 md:p-8 bg-background">
      <div className="bg-card p-6 md:p-8 rounded-lg shadow-md border">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h1 className="text-2xl md:text-3xl font-bold text-card-foreground">
            Guide Profile
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Account (read-only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={myProfile?.name || ""} disabled />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={myProfile?.email || ""} disabled />
            </div>
          </div>

          {/* Section 2: Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" value={formData.city} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" value={formData.state} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" value={formData.country} onChange={handleInputChange} required />
            </div>
          </div>

          {/* Section 3: Professional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="experience">Experience (e.g., 5 years)</Label>
              <Input id="experience" name="experience" value={formData.experience} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="price">Price per day (₹)</Label>
              <Input id="price" name="price" type="number" min="0" value={formData.price} onChange={handleInputChange} required />
            </div>
            <div className="bg-white z-50">
              <Label>Languages</Label>
              <MultiSelect className="bg-white" options={languageOptions} selected={selectedLanguages} onChange={setSelectedLanguages} placeholder="Select languages..." />
            </div>
            <div className="bg-white z-50">
              <Label>Available Days</Label>
              <MultiSelect className="bg-white" options={DAY_OPTIONS} selected={selectedDays} onChange={setSelectedDays} placeholder="Select available days..." />
            </div>
            <div>
              <Label htmlFor="availableTime">Available Time (e.g., 9 AM - 6 PM)</Label>
              <Input id="availableTime" name="availableTime" value={formData.availableTime} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="specialization">Specialization (comma separated)</Label>
              <Input id="specialization" name="specialization" value={formData.specialization} onChange={handleInputChange} placeholder="e.g. History, Adventure, Food Tours" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="about">About / Bio</Label>
              <Textarea id="about" name="about" value={formData.about} onChange={handleInputChange} rows={5} placeholder="Tell travelers a little about yourself..." required />
            </div>
          </div>

          {/* Section 4: File Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div>
              <Label className="mb-2 block">
                Profile Photo {!myProfile?.registrationCompleted && "(required)"}
              </Label>
              <div className="flex items-center gap-4 mt-2">
                {profileImagePreview && (
                  <Image src={profileImagePreview} alt="Profile Preview" width={80} height={80} className="rounded-full object-cover w-20 h-20" />
                )}
                <Input type="file" onChange={handleProfileImageChange} accept="image/*" required={!myProfile?.registrationCompleted} />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">
                Identity Proof(s) {!myProfile?.registrationCompleted && "(required)"}
              </Label>
              <Input type="file" multiple onChange={handleIdentityProofsChange} accept="image/*,.pdf" required={!myProfile?.registrationCompleted} />
              {identityProofFiles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{identityProofFiles.length} file(s) selected</p>
              )}
              {myProfile?.identityProofs && myProfile.identityProofs.length > 0 && identityProofFiles.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {myProfile.identityProofs.length} document(s) already on file
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <Label className="mb-2 block">Gallery Images (optional)</Label>
              <Input type="file" multiple onChange={handleGalleryChange} accept="image/*" />
              {galleryFiles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{galleryFiles.length} file(s) selected</p>
              )}
            </div>
          </div>

          <div className="pt-6 border-t flex items-center justify-end gap-4">
            {error && <p className="text-sm text-destructive animate-pulse">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuideProfilePage;
