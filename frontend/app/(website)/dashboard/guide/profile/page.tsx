// app/dashboard/guide/profile/page.tsx
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { getMyGuideProfile, updateMyGuideProfile } from "@/lib/redux/thunks/guide/guideThunk";
// ✅ CORRECTED: These thunks will update the 'admin' slice state
import { fetchLanguages } from "@/lib/redux/thunks/admin/languageThunks";
import { fetchAdminLocations } from "@/lib/redux/thunks/admin/locationThunks";
import Image from "next/image";

// Import your ShadCN UI components
import { MultiSelect, Option } from "@/components/ui/multi-select"; // Assuming this path is correct
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Helper function to format date strings for the date input field
const formatDateForInput = (isoDate?: string) => {
  if (!isoDate) return "";
  try {
    return new Date(isoDate).toISOString().split("T")[0];
  } catch (error) {
    console.error("Invalid date format:", isoDate);
    return "";
  }
};

const GuideProfilePage = () => {
  const dispatch: AppDispatch = useDispatch();
  
  // --- REDUX STATE ---
  const { myProfile, loading, error } = useSelector(
    (state: RootState) => state.guide
  );
  
  // ✅ CORRECTED: Access locations and languages from within the 'admin' state slice.
  const { locations, languages } = useSelector(
    (state: RootState) => state.admin
  );

  // --- LOCAL STATE FOR THE FORM ---
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    dob: "",
    state: "",
    country: "",
    experience: "",
    description: "",
    specializations: "",
  });
  
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // State for file objects and previews
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);

  // --- SIDE EFFECTS ---

  useEffect(() => {
    dispatch(getMyGuideProfile());
    // These thunks will correctly populate state.admin.languages and state.admin.locations
    dispatch(fetchLanguages());
    dispatch(fetchAdminLocations());
  }, [dispatch]);

  useEffect(() => {
    if (myProfile) {
      setFormData({
        name: myProfile.name || "",
        mobile: myProfile.mobile || "",
        dob: formatDateForInput(myProfile.dob),
        state: myProfile.state || "",
        country: myProfile.country || "",
        experience: myProfile.experience || "",
        description: myProfile.description || "",
        specializations: myProfile.specializations?.join(", ") || "",
      });

      if (myProfile.languages) {
        setSelectedLanguages(myProfile.languages);
      }
      
      if (myProfile.serviceLocations) {
        setSelectedLocations(myProfile.serviceLocations);
      }
      
      if (myProfile.photo) setPhotoPreview(myProfile.photo);
      if (myProfile.license) setLicensePreview(myProfile.license);
    }
  }, [myProfile]);

  // --- EVENT HANDLERS ---

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      if (name === "photo") {
        setPhotoFile(file);
        setPhotoPreview(previewUrl);
      } else if (name === "license") {
        setLicenseFile(file);
        setLicensePreview(file.type.startsWith("image/") ? previewUrl : file.name);
      }
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submissionFormData = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (key === "specializations") {
        const arrayValue = value.split(",").map(item => item.trim()).filter(Boolean);
        arrayValue.forEach(item => submissionFormData.append(`${key}[]`, item));
      } else {
        submissionFormData.append(key, String(value));
      }
    });

    selectedLanguages.forEach(lang => submissionFormData.append('languages[]', lang));
    selectedLocations.forEach(loc => submissionFormData.append('serviceLocations[]', loc));

    if (photoFile) submissionFormData.append("photo", photoFile);
    if (licenseFile) submissionFormData.append("license", licenseFile);
    
    dispatch(updateMyGuideProfile(submissionFormData));
  };
  
  // --- OPTIONS FOR SELECT DROPDOWNS ---
  // Ensure that 'languages' and 'locations' are arrays before mapping
  const languageOptions: Option[] = Array.isArray(languages) ? languages.map(lang => ({ value: lang.languageName, label: lang.languageName })) : [];
  const locationOptions: Option[] = Array.isArray(locations) ? locations.map(loc => ({ value: loc.placeName, label: loc.placeName })) : [];

  return (
    <div className="container mx-auto p-4 md:p-8 bg-background">
      <div className="bg-card p-6 md:p-8 rounded-lg shadow-md border">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h1 className="text-2xl md:text-3xl font-bold text-card-foreground">
            Profile Information
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={myProfile?.email || ""} disabled />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" name="dob" type="date" value={formData.dob} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" value={formData.state} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" value={formData.country} onChange={handleInputChange} />
            </div>
          </div>

          {/* Section 2: Professional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="experience">Experience (e.g., 5 years)</Label>
              <Input id="experience" name="experience" value={formData.experience} onChange={handleInputChange} />
            </div>
            <div className="bg-white z-50">
              <Label>Languages</Label>
              <MultiSelect className="bg-white" options={languageOptions} selected={selectedLanguages} onChange={setSelectedLanguages} placeholder="Select languages..."/>
            </div>
            <div>
                <Label>Service Locations</Label>
                <MultiSelect options={locationOptions} selected={selectedLocations} onChange={setSelectedLocations} placeholder="Select locations..."/>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="specializations">Specializations (comma separated)</Label>
              <Input id="specializations" name="specializations" value={formData.specializations} onChange={handleInputChange} placeholder="e.g. History, Adventure, Food Tours" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description / Bio</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={5} placeholder="Tell travelers a little about yourself..." />
            </div>
          </div>

          {/* Section 3: File Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div>
              <Label className="mb-2 block">Profile Photo</Label>
              <div className="flex items-center gap-4 mt-2">
                {photoPreview && <Image src={photoPreview} alt="Profile Preview" width={80} height={80} className="rounded-full object-cover w-20 h-20" />}
                <Input type="file" name="photo" onChange={handleFileChange} accept="image/*" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">License/Certificate (Image or PDF)</Label>
              <div className="flex flex-col gap-4 mt-2">
                {licensePreview && (
                  <div className="p-2 border border-dashed rounded-md">
                    {licensePreview.startsWith('blob:') || licenseFile?.type.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(licensePreview) ? (
                      <Image src={licensePreview} alt="License Preview" width={120} height={80} className="rounded-md object-contain" />
                    ) : (
                      <p className="text-sm text-muted-foreground p-2">
                        Current document: {licenseFile?.name || licensePreview.split('/').pop()}
                      </p>
                    )}
                  </div>
                )}
                <Input type="file" name="license" onChange={handleFileChange} accept="image/*,.pdf" />
              </div>
            </div>
          </div>

          {/* Section 4: Submission */}
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