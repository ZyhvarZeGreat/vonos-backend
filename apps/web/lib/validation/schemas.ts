/**
 * Shared Zod schemas aligned with Nest create/update validation.
 * Use with react-hook-form via zodResolver.
 */
import { z } from "zod";

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const PERSON_NAME_RE = /^[\p{L}\s.'’-]+$/u;
/** Contact last name may include plate / registration numbers. */
const CONTACT_LAST_NAME_RE = /^[\p{L}\p{N}\s.'’\-]+$/u;
const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9._-]{1,63}$/;
const PHONE_RE = /^[+]?[\d\s().-]{7,20}$/;

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordCriterionId =
  | "length"
  | "letter"
  | "number"
  | "symbol";

export interface PasswordCriterion {
  id: PasswordCriterionId;
  label: string;
  met: boolean;
}

/** Criteria shown in the password strength meter (must match backend). */
export function getPasswordCriteria(password: string): PasswordCriterion[] {
  return [
    {
      id: "length",
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "letter",
      label: "Contains a letter",
      met: /[A-Za-z]/.test(password),
    },
    {
      id: "number",
      label: "Contains a number",
      met: /\d/.test(password),
    },
    {
      id: "symbol",
      label: "Contains a symbol (!@#$…)",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function passwordStrengthScore(password: string): number {
  if (!password) return 0;
  const criteria = getPasswordCriteria(password);
  return criteria.filter((c) => c.met).length;
}

export function isStrongPassword(password: string): boolean {
  return getPasswordCriteria(password).every((c) => c.met);
}

export function strongPasswordMessage(password: string): string | null {
  if (!password) return "Password is required.";
  const unmet = getPasswordCriteria(password).filter((c) => !c.met);
  if (unmet.length === 0) return null;
  return `Password needs: ${unmet.map((c) => c.label.toLowerCase()).join("; ")}.`;
}

export const personNameSchema = (label: string, required = true) => {
  const base = z.string().trim();
  if (!required) {
    return base
      .refine((v) => !v || !/\d/.test(v), `${label} cannot contain numbers.`)
      .refine(
        (v) => !v || PERSON_NAME_RE.test(v),
        `${label} can only include letters, spaces, hyphens, and apostrophes.`,
      )
      .refine((v) => !v || v.length >= 2, `${label} must be at least 2 characters.`);
  }
  return base
    .min(1, `${label} is required.`)
    .refine((v) => !/\d/.test(v), `${label} cannot contain numbers.`)
    .refine(
      (v) => PERSON_NAME_RE.test(v),
      `${label} can only include letters, spaces, hyphens, and apostrophes.`,
    )
    .refine((v) => v.length >= 2, `${label} must be at least 2 characters.`);
};

/** Contact last name — alphanumeric so plate / registration nos. fit. */
export const contactLastNameSchema = (label = "Last name", required = false) => {
  const base = z.string().trim();
  if (!required) {
    return base.refine(
      (v) => !v || CONTACT_LAST_NAME_RE.test(v),
      `${label} can include letters, numbers, spaces, hyphens, and apostrophes.`,
    );
  }
  return base
    .min(1, `${label} is required.`)
    .refine(
      (v) => CONTACT_LAST_NAME_RE.test(v),
      `${label} can include letters, numbers, spaces, hyphens, and apostrophes.`,
    );
};

export const emailSchema = (required = true) => {
  const base = z.string().trim();
  if (!required) {
    return base.refine(
      (v) => !v || EMAIL_RE.test(v),
      "Enter a valid email address.",
    );
  }
  return base
    .min(1, "Email is required.")
    .refine((v) => EMAIL_RE.test(v), "Enter a valid email address.");
};

export const usernameSchema = (required = false) => {
  const base = z.string().trim();
  return base.superRefine((v, ctx) => {
    if (!v) {
      if (required) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Email or username is required.",
        });
      }
      return;
    }
    if (v.includes("@")) {
      if (!EMAIL_RE.test(v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid email address for login.",
        });
      }
      return;
    }
    if (/\s/.test(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Username cannot contain spaces.",
      });
      return;
    }
    if (/^\d+$/.test(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Username cannot be only numbers.",
      });
      return;
    }
    if (!USERNAME_RE.test(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Username must start with a letter and use only letters, numbers, . _ -",
      });
    }
  });
};

export const phoneSchema = (label = "Phone", required = false) => {
  const base = z.string().trim();
  return base.superRefine((v, ctx) => {
    if (!v) {
      if (required) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} is required.`,
        });
      }
      return;
    }
    if (!PHONE_RE.test(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Enter a valid ${label.toLowerCase()} number.`,
      });
      return;
    }
    const digits = v.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Enter a valid ${label.toLowerCase()} number.`,
      });
    }
  });
};

export const urlSchema = (label = "Website", required = false) => {
  const base = z.string().trim();
  return base.superRefine((v, ctx) => {
    if (!v) {
      if (required) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} is required.`,
        });
      }
      return;
    }
    try {
      const parsed = new URL(v.includes("://") ? v : `https://${v}`);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("bad protocol");
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Enter a valid ${label.toLowerCase()} URL (e.g. https://example.com).`,
      });
    }
  });
};

/** New / changed passwords — must meet all strength criteria. */
export const strongPasswordSchema = (required = true) =>
  z.string().superRefine((v, ctx) => {
    if (!v) {
      if (required) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password is required.",
        });
      }
      return;
    }
    const msg = strongPasswordMessage(v);
    if (msg) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
    }
  });

export const createUserFormSchema = z
  .object({
    prefix: personNameSchema("Prefix", false),
    firstName: personNameSchema("First name", true),
    middleName: personNameSchema("Middle name", false).optional(),
    lastName: personNameSchema("Last name", false),
    email: emailSchema(true),
    username: usernameSchema(false),
    password: strongPasswordSchema(true),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

export const contactFormSchema = z.object({
  prefix: personNameSchema("Prefix", false),
  firstName: personNameSchema("First name", true),
  middleName: personNameSchema("Middle name", false).optional(),
  lastName: contactLastNameSchema("Last name", false),
  mobile: phoneSchema("Mobile", true),
  alternateNumber: phoneSchema("Alternate number", false).optional(),
  landline: phoneSchema("Landline", false).optional(),
  email: emailSchema(false),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const requiredTextSchema = (label: string, min = 1) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required.`);

/** Non-negative money / quantity entered as string or number. */
export const moneyAmountSchema = (
  label = "Amount",
  options?: { required?: boolean; min?: number; allowZero?: boolean },
) => {
  const required = options?.required !== false;
  const min = options?.min ?? (options?.allowZero === false ? 0.01 : 0);
  return z.union([z.string(), z.number()]).superRefine((raw, ctx) => {
    const text = String(raw ?? "").trim();
    if (!text) {
      if (required) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} is required.`,
        });
      }
      return;
    }
    const n = typeof raw === "number" ? raw : Number(text);
    if (!Number.isFinite(n)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Enter a valid ${label.toLowerCase()}.`,
      });
      return;
    }
    if (n < min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          min > 0
            ? `${label} must be greater than zero.`
            : `${label} cannot be negative.`,
      });
    }
  });
};

export const productFormSchema = z.object({
  name: requiredTextSchema("Product name"),
  unit: requiredTextSchema("Unit"),
  /** Optional — VA/VP catalog creates default to 0; staff set prices later. */
  costPrice: moneyAmountSchema("Cost price", {
    required: false,
    allowZero: true,
    min: 0,
  }),
  sku: z.string().trim().optional(),
});

export const expenseFormSchema = z.object({
  amount: moneyAmountSchema("Amount", { allowZero: false }),
  description: requiredTextSchema("Description"),
  category: z.string().trim().optional(),
  date: z.string().trim().optional(),
});

export const paymentAmountSchema = z.object({
  amount: moneyAmountSchema("Payment amount", { allowZero: false }),
});

export const paymentAccountFormSchema = z.object({
  name: requiredTextSchema("Account name"),
  accountNumber: z
    .string()
    .trim()
    .refine(
      (v) => !v || /^[A-Za-z0-9\s\-./]+$/.test(v),
      "Account number can only include letters, numbers, spaces, and - . /",
    )
    .optional()
    .or(z.literal("")),
});

export const depositTransferSchema = z.object({
  amount: moneyAmountSchema("Amount", { allowZero: false }),
});

export const customerGroupFormSchema = z.object({
  name: requiredTextSchema("Customer group name"),
  calculationPercentage: z
    .union([z.string(), z.number()])
    .superRefine((raw, ctx) => {
      const text = String(raw ?? "").trim();
      if (!text) return;
      const n = Number(text);
      if (!Number.isFinite(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Calculation percentage must be a number.",
        });
        return;
      }
      if (n < 0 || n > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Calculation percentage must be between 0 and 100.",
        });
      }
    }),
});

export const variationFormSchema = z.object({
  name: requiredTextSchema("Variation name"),
  values: z
    .array(z.string().trim())
    .refine((arr) => arr.some((v) => v.length > 0), {
      message: "Add at least one variation value.",
    }),
});

export const businessLocationFormSchema = z.object({
  name: requiredTextSchema("Name"),
  city: requiredTextSchema("City"),
  zipCode: requiredTextSchema("Zip code"),
  state: requiredTextSchema("State"),
  country: requiredTextSchema("Country"),
  mobile: phoneSchema("Mobile", false).optional(),
  email: emailSchema(false).optional(),
  website: urlSchema("Website", false).optional(),
});

export const roleFormSchema = z.object({
  name: requiredTextSchema("Role name").refine(
    (v) => !/^\d+$/.test(v),
    "Role name cannot be only numbers.",
  ),
});

export const saleCustomerSchema = z.object({
  customerName: requiredTextSchema("Customer name"),
});

export const moveStockSchema = z.object({
  quantity: moneyAmountSchema("Quantity", { allowZero: false }),
});

export const openingStockSchema = z.object({
  quantity: moneyAmountSchema("Quantity", { allowZero: true, min: 0 }),
});

export const resetPasswordFormSchema = z
  .object({
    password: strongPasswordSchema(true),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const settingsBrandingSchema = z.object({
  displayName: requiredTextSchema("Entity display name"),
});

export const requestResetEmailSchema = z.object({
  email: emailSchema(true),
});

export const acceptInviteFormSchema = z
  .object({
    name: personNameSchema("Name", true),
    password: strongPasswordSchema(true),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const expenseCategoryFormSchema = z.object({
  name: requiredTextSchema("Category name"),
  code: z.string().trim().optional(),
});

export const expiryDateFormSchema = z.object({
  expDate: requiredTextSchema("Expiry date"),
});

export const createItemQuickSchema = z.object({
  sku: requiredTextSchema("SKU"),
  name: requiredTextSchema("Product name"),
  costPrice: moneyAmountSchema("Cost price", { allowZero: true, min: 0 }),
});

export const contactQuickSchema = z.object({
  name: requiredTextSchema("Name"),
  email: emailSchema(false).optional(),
  phone: phoneSchema("Phone", false).optional(),
});

