// package.schema.ts
//
// This file used to declare a SECOND, independent Mongoose schema and register
// it under the model name 'Package' — the same name already registered by
// src/mongo/repo/Package.ts. Only one of the two can ever win: whichever module
// is imported first defines the model, and the other's
// `mongoose.models.Package || mongoose.model(...)` guard silently hands back the
// winner's model instead of its own.
//
// In this app the repo schema always won (src/mongo is pulled in through the
// service layer before the package route is mounted), so every validation rule
// written here — `price` required, `numberOfPeople` required, `numberOfDays`
// required, required title/city/description on each translation — was dead
// letter and never enforced. Verified empirically: the live model exposes
// `baseCurrency`/`deletedAt` (repo-only fields) and reports `price` as not
// required.
//
// That is a landmine rather than a visible bug today: any change to import order
// would silently swap the schema underneath this module's controller and change
// which writes validate and which fields persist. Re-exporting the canonical
// model removes the second registration entirely, so there is exactly one
// Package schema in the process. Runtime behaviour is unchanged — this is the
// model that was already in use.
//
// The field-level requirements the old schema described are enforced where they
// actually run: CreatePackageValidator in ./package.validator.ts rejects a
// missing/negative price, numberOfPeople < 1, numberOfDays < 1 and an incomplete
// English translation before the controller is reached.
export { default } from '@mongo/repo/Package';
