import { z } from "zod";

// File validation helpers
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_DOCUMENT_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"];

// Custom file validation
const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_FILE_SIZE, {
    message: "File size must be less than 5MB",
  })
  .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), {
    message: "Only .jpg, .jpeg, .png and .webp formats are supported",
  });

const documentFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_FILE_SIZE, {
    message: "File size must be less than 5MB",
  })
  .refine((file) => ACCEPTED_DOCUMENT_TYPES.includes(file.type), {
    message: "Only .jpg, .jpeg, .png, .webp and .pdf formats are supported",
  });

// Main form schema
export const guideRegistrationSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name should be at least 2 characters long")
    .regex(/^[a-zA-Z\s]+$/, "Name should only contain letters and spaces"),

  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\d+$/, "Phone number must contain only digits")
    .length(10, "Phone number must be 10 digits long"),

  location: z
    .string()
    .min(1, "Location is required")
    .min(2, "Location should be at least 2 characters long")
    .regex(/^[a-zA-Z\s]+$/, "Location should only contain letters and spaces"),

  pan: z
    .string()
    .optional()
    .refine(
      (val) => !val || (val.length === 10 && /^[A-Z0-9]+$/.test(val)),
      {
        message: "PAN must be 10 characters (uppercase letters and numbers)",
      }
    ),

  guideType: z.enum(["Escort", "Normal"], {
    required_error: "Please select a guide type",
  }),

  languages: z
    .array(z.string())
    .min(1, "Please select at least one preferred language"),

  profileFile: imageFileSchema,

  licenseFile: documentFileSchema,

  aadhaarFile: documentFileSchema,
});

export type GuideRegistrationFormData = z.infer<typeof guideRegistrationSchema>;
