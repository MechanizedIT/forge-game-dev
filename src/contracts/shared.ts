import { z } from "zod";

export const schemaVersionSchema = z.literal(1);
export const nonEmptyStringSchema = z.string().trim().min(1);
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a lowercase kebab-case identifier");
export const referenceIdSchema = z
  .string()
  .regex(/^[A-Z]+-[0-9]+$/, "Expected an uppercase reference such as AC-1");
export const timestampSchema = z.string().datetime({ offset: true });

export const relativePathSchema = nonEmptyStringSchema.refine(
  (value) => {
    const isAbsolute = /^(?:[A-Za-z]:[\\/]|[\\/])/.test(value);
    const escapesRoot = value.split(/[\\/]/).some((part) => part === "..");
    return !isAbsolute && !escapesRoot;
  },
  "Expected a project-relative path that does not escape the project root",
);

export const commandSchema = z.array(nonEmptyStringSchema).min(1);
