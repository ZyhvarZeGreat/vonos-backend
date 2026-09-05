"use client";

/**
 * HQ6 user View / Edit / Add — lifted from manage_user/show|edit|create.blade.php
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { User } from "@vonos/types";
import { EmptyState } from "@/components/atoms/EmptyState";
import { PasswordField } from "@/components/atoms/PasswordField";
import { TagCombobox } from "@/components/molecules/TagCombobox";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { createUser, deactivateUser, getUser, inviteUser, updateUser } from "@/lib/api/users";
import {
  createDesignation,
  createEmployee,
  createPayroll,
  getDesignations,
  getEmployeeByUserId,
  getLatestPayrollForEmployee,
  syncEmployeeWorkLocations,
} from "@/lib/api/hrm";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId, useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { mapTenantRoleToJwtRole } from "@vonos/types";
import { getTenantRoles } from "@/lib/api/tenantRoles";
import { DETAIL_RECORD_STALE_MS } from "@/lib/query/prefetchListDetails";
import { patchEntityInQueries } from "@/lib/query/optimistic";
import { cn } from "@/lib/utils/cn";
import {
  firstValidationError,
  sanitizePersonNameInput,
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validatePersonName,
  validateUsername,
} from "@/lib/utils/formValidation";
import { toast } from "@/stores/toastStore";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { BusyFormShell } from "@/components/molecules/BusyFormShell";
import { withWriteProgress } from "@/stores/mutationBusyStore";
import {
  newIdempotencyKey,
  withIdempotencyKey,
} from "@/lib/utils/idempotency";
import { primaryTenantIdFromWorkLocations } from "@/lib/utils/workLocationTenant";
import { welcomeFirstName } from "@/lib/utils/welcomeFirstName";

/** Autos + lifestyle entities — assigned on the form (VAG does not switch entity to add users). */
const WORK_LOCATION_OPTIONS = [
  { value: "VW", label: "Vonos Warehouse" },
  { value: "VM", label: "Vonos Mechanic" },
  { value: "VP", label: "Vonos Painting" },
  { value: "VISP", label: "Vonos Institute Spare Parts" },
  { value: "VSP", label: "Vonos Spare Parts" },
  { value: "VC", label: "Vonos Cafe" },
  { value: "VS", label: "Vonos Saloon" },
  { value: "VKW", label: "Vonos Kids Wear" },
] as const;

function formatJwtRole(role: User["role"]): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const NAME_TITLE_RE =
  /^(mr|mrs|miss|ms|dr|prof|sir|madam|madame|engr|eng|hon|rev|pastor|chief)\.?$/i;

function splitName(full: string): {
  surname: string;
  first: string;
  last: string;
} {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { surname: "", first: "", last: "" };

  let surname = "";
  let rest = parts;
  if (NAME_TITLE_RE.test(parts[0]!)) {
    surname = parts[0]!;
    rest = parts.slice(1);
  }

  if (rest.length === 0) {
    return { surname, first: welcomeFirstName(full, ""), last: "" };
  }
  if (rest.length === 1) {
    return { surname, first: rest[0]!, last: "" };
  }
  return {
    surname,
    first: rest[0]!,
    last: rest.slice(1).join(" "),
  };
}

function avatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e5e7eb&color=374151`;
}

async function resolveDesignationId(
  tenantId: string,
  designationName: string,
): Promise<string> {
  const designations = await getDesignations(tenantId);
  const desired = designationName.trim();
  const matched =
    desired.length > 0
      ? designations.find(
          (d) => d.name.trim().toLowerCase() === desired.toLowerCase(),
        )?.id
      : undefined;
  if (matched) return matched;
  const fallbackId = designations[0]?.id;
  if (fallbackId) return fallbackId;
  const createdDes = await createDesignation(tenantId, {
    name: desired || "Staff",
  });
  return createdDes.id;
}

type UserHrProfileInput = {
  accountHolderName?: string;
  bankName?: string;
  bankBranch?: string;
  bankCode?: string;
  bankAccountNo?: string;
  taxPayerId?: string;
  mobile?: string;
  altContact?: string;
  familyContact?: string;
  guardianName?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  idProofName?: string;
  idProofNumber?: string;
  permanentAddress?: string;
  currentAddress?: string;
  salesCommission?: string;
  maxDiscount?: string;
  department?: string;
};

function parseOptionalNumber(raw: string | undefined): number | null {
  if (raw == null || !raw.trim()) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function hrProfilePayload(args: UserHrProfileInput) {
  return {
    accountHolderName: args.accountHolderName?.trim() || null,
    bankName: args.bankName?.trim() || null,
    bankBranch: args.bankBranch?.trim() || null,
    bankCode: args.bankCode?.trim() || null,
    bankAccountNo: args.bankAccountNo?.trim() || null,
    taxPayerId: args.taxPayerId?.trim() || null,
    mobile: args.mobile?.trim() || null,
    altContact: args.altContact?.trim() || null,
    familyContact: args.familyContact?.trim() || null,
    guardianName: args.guardianName?.trim() || null,
    dateOfBirth: args.dateOfBirth?.trim() || null,
    gender: args.gender?.trim() || null,
    maritalStatus: args.maritalStatus?.trim() || null,
    bloodGroup: args.bloodGroup?.trim() || null,
    idProofName: args.idProofName?.trim() || null,
    idProofNumber: args.idProofNumber?.trim() || null,
    permanentAddress: args.permanentAddress?.trim() || null,
    currentAddress: args.currentAddress?.trim() || null,
    salesCommission: parseOptionalNumber(args.salesCommission) ?? 0,
    maxSalesDiscountPercent: parseOptionalNumber(args.maxDiscount),
    department: args.department?.trim() || null,
  };
}

/** Map user form fields → payroll/HR sync payload. */
function formHrProfile(form: {
  bankAccountName: string;
  bankName: string;
  bankBranch: string;
  bankCode: string;
  bankAccountNumber: string;
  taxPayerId: string;
  mobile: string;
  altContact: string;
  familyContact: string;
  guardianName: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  idProofName: string;
  idProofNumber: string;
  permanentAddress: string;
  currentAddress: string;
  salesCommission: string;
  maxDiscount: string;
  department: string;
}): UserHrProfileInput {
  return {
    accountHolderName: form.bankAccountName,
    bankName: form.bankName,
    bankBranch: form.bankBranch,
    bankCode: form.bankCode,
    bankAccountNo: form.bankAccountNumber,
    taxPayerId: form.taxPayerId,
    mobile: form.mobile,
    altContact: form.altContact,
    familyContact: form.familyContact,
    guardianName: form.guardianName,
    dateOfBirth: form.dob,
    gender: form.gender,
    maritalStatus: form.maritalStatus,
    bloodGroup: form.bloodGroup,
    idProofName: form.idProofName,
    idProofNumber: form.idProofNumber,
    permanentAddress: form.permanentAddress,
    currentAddress: form.currentAddress,
    salesCommission: form.salesCommission,
    maxDiscount: form.maxDiscount,
    department: form.department,
  };
}

async function linkUserToPayroll(args: {
  tenantId: string;
  userId: string;
  name: string;
  designationName: string;
  locationCodes: string[];
  basicSalary: string;
  salaryPeriod: string;
} & UserHrProfileInput): Promise<void> {
  const designationId = await resolveDesignationId(
    args.tenantId,
    args.designationName,
  );

  const employee = await createEmployee(args.tenantId, {
    name: args.name,
    userId: args.userId,
    designationId,
    locationCodes: args.locationCodes,
    locationCode: args.locationCodes[0],
    // Omit isServiceStaff — API derives from designation (salon/cafe/auto roles).
    ...hrProfilePayload(args),
  });

  const basic = Number.parseFloat(args.basicSalary);
  const base = Number.isFinite(basic) ? basic : 0;
  const grossPay =
    args.salaryPeriod === "week"
      ? base * 4
      : args.salaryPeriod === "day"
        ? base * 30
        : base;

  const now = new Date();
  const payrollMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const payrollMonthIso = payrollMonth.toISOString().slice(0, 10);

  await createPayroll(args.tenantId, {
    employeeRecordId: employee.id,
    grossPay,
    payrollMonth: payrollMonthIso,
  });
}

async function syncUserHrFields(args: {
  tenantId: string;
  userId: string;
  name: string;
  locationCodes: string[];
  designationName: string;
  basicSalary: string;
  salaryPeriod: string;
} & UserHrProfileInput): Promise<void> {
  const designationId = await resolveDesignationId(
    args.tenantId,
    args.designationName,
  );
  const employee = await syncEmployeeWorkLocations(args.tenantId, args.userId, {
    locationCodes: args.locationCodes,
    locationCode: args.locationCodes[0],
    name: args.name,
    designationId,
    ...hrProfilePayload(args),
  });

  const basic = Number.parseFloat(args.basicSalary);
  if (!Number.isFinite(basic) || basic <= 0 || !employee) return;

  const grossPay =
    args.salaryPeriod === "week"
      ? basic * 4
      : args.salaryPeriod === "day"
        ? basic * 30
        : basic;

  const latest = await getLatestPayrollForEmployee(args.tenantId, employee.id);
  if (latest && Math.abs(latest.grossPay - grossPay) < 0.01) return;

  const now = new Date();
  const payrollMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  await createPayroll(args.tenantId, {
    employeeRecordId: employee.id,
    grossPay,
    payrollMonth: payrollMonth.toISOString().slice(0, 10),
  });
}

/**
 * `/users/:id` (view) · `/users/:id/edit` · `/users/new/edit` (create)
 */
export function Hq6UserDetailView({
  recordId,
  mode = "view",
}: {
  recordId: string;
  mode?: "view" | "edit";
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const viewingTenantId = useTenantId();
  const { config } = useRouteTenant();
  const { listPath, detailPath, goToList } = useRecordNavigation("users");
  const isCreate = recordId === "new" || recordId === "create";
  const isEdit = mode === "edit" || isCreate;
  const isAdminHrmUsers = pathname.startsWith("/admin/hrm/users");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "docs" | "activities">(
    "info",
  );

  const defaultLocationCodes = useMemo(() => {
    const code = config?.code?.trim();
    if (!code) {
      // VAG add-user with no viewing entity: default home to Mechanic (VM→VA).
      return ["VM"] as string[];
    }
    // Map current tenant → work-location code used in the combobox.
    const mapped = code === "VA" || code === "VMS" ? "VM" : code;
    const allowed = new Set(
      WORK_LOCATION_OPTIONS.map((o) => o.value as string),
    );
    return allowed.has(mapped) ? [mapped] : (["VM"] as string[]);
  }, [config?.code]);

  /**
   * On create / entity context: seed work locations so roles load immediately.
   * On VAG edit (no viewing tenant): start empty until the user record loads —
   * otherwise we wrongly default to VA and fetch the wrong HR profile.
   */
  const [formLocationCodes, setFormLocationCodes] = useState<string[]>(() =>
    isCreate || (!isAdminHrmUsers && viewingTenantId)
      ? defaultLocationCodes
      : [],
  );

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    // VAG manage-users is cross-entity — never key/fetch under the switcher tenant.
    queryKey: [
      "user",
      isAdminHrmUsers ? "vag" : (viewingTenantId ?? "vag"),
      recordId,
    ],
    queryFn: () =>
      getUser(recordId, isAdminHrmUsers ? null : viewingTenantId),
    enabled: Boolean(recordId && !isCreate),
    staleTime: DETAIL_RECORD_STALE_MS,
  });

  /** Home entity for API calls: form selection, else user's home, else viewing tenant. */
  const homeTenantId = useMemo(() => {
    const fromForm = primaryTenantIdFromWorkLocations(formLocationCodes);
    if (fromForm) return fromForm;
    if (user?.tenantId) return user.tenantId;
    return viewingTenantId;
  }, [formLocationCodes, user?.tenantId, viewingTenantId]);

  const tenantId = homeTenantId;

  /** Job roles live on the user's home entity — not the first work-location tag. */
  const rolesTenantId = isCreate
    ? homeTenantId
    : (user?.tenantId ?? homeTenantId);

  const { data: hq6Roles = [] } = useQuery({
    queryKey: ["tenant-roles", rolesTenantId],
    queryFn: () => getTenantRoles(rolesTenantId!),
    enabled: Boolean(rolesTenantId),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });

  const { data: linkedHr } = useQuery({
    queryKey: ["user-hr-profile", user?.tenantId ?? tenantId, recordId],
    queryFn: async () => {
      const empty = {
        locationCodes: [] as string[],
        designation: "",
        bankAccountName: "",
        bankAccountNumber: "",
        bankName: "",
        bankCode: "",
        bankBranch: "",
        taxPayerId: "",
        basicSalary: "",
        salesCommission: "0.00",
        maxDiscount: "",
        dob: "",
        gender: "",
        maritalStatus: "",
        bloodGroup: "",
        mobile: "",
        altContact: "",
        familyContact: "",
        guardianName: "",
        idProofName: "",
        idProofNumber: "",
        permanentAddress: "",
        currentAddress: "",
        department: "",
      };
      // Prefer the user's home tenant; API still unions locationCodes across
      // every entity employee copy for this login.
      const hrTenant = user?.tenantId ?? tenantId!;
      const employee = await getEmployeeByUserId(hrTenant, recordId);
      if (!employee) return empty;
      const payroll = await getLatestPayrollForEmployee(tenantId!, employee.id);
      return {
        locationCodes: employee.locationCodes?.length
          ? employee.locationCodes
          : employee.locationCode
            ? [employee.locationCode]
            : [],
        designation: employee.designationName ?? "",
        bankAccountName: employee.accountHolderName ?? "",
        bankAccountNumber: employee.bankAccountNo ?? "",
        bankName: employee.bankName ?? "",
        bankCode: employee.bankCode ?? "",
        bankBranch: employee.bankBranch ?? "",
        taxPayerId: employee.taxPayerId ?? "",
        basicSalary:
          payroll && payroll.grossPay > 0 ? String(payroll.grossPay) : "",
        salesCommission:
          employee.salesCommission != null
            ? String(employee.salesCommission)
            : "0.00",
        maxDiscount:
          employee.maxSalesDiscountPercent != null
            ? String(employee.maxSalesDiscountPercent)
            : "",
        dob: employee.dateOfBirth ?? "",
        gender: employee.gender ?? "",
        maritalStatus: employee.maritalStatus ?? "",
        bloodGroup: employee.bloodGroup ?? "",
        mobile: employee.mobile ?? "",
        altContact: employee.altContact ?? "",
        familyContact: employee.familyContact ?? "",
        guardianName: employee.guardianName ?? "",
        idProofName: employee.idProofName ?? "",
        idProofNumber: employee.idProofNumber ?? "",
        permanentAddress: employee.permanentAddress ?? "",
        currentAddress: employee.currentAddress ?? "",
        department: employee.department ?? "",
      };
    },
    enabled: Boolean((user?.tenantId ?? tenantId) && recordId && !isCreate),
    staleTime: DETAIL_RECORD_STALE_MS,
  });

  const linkedEmployeeLocations = linkedHr?.locationCodes;

  const defaultHq6RoleId = useMemo(() => {
    return (
      hq6Roles.find((r) => r.name.toUpperCase() === "MANAGER")?.id ??
      hq6Roles.find((r) => !r.locked)?.id ??
      hq6Roles[0]?.id ??
      ""
    );
  }, [hq6Roles]);

  /**
   * Seed from user / defaults only — NOT from hq6Roles.
   * Roles used to be in this memo; when the first entity tag changed, home
   * tenant + roles refetch recreated `initial` and wiped entity picks (× felt broken).
   */
  const initial = useMemo(() => {
    const resolvedLocations =
      linkedEmployeeLocations && linkedEmployeeLocations.length > 0
        ? linkedEmployeeLocations
        : defaultLocationCodes;
    if (isCreate || !user) {
      return {
        surname: "",
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        hq6RoleId: "",
        isActive: true,
        allowLogin: true,
        password: "",
        confirmPassword: "",
        salesCommission: "0.00",
        maxDiscount: "",
        dob: "",
        gender: "",
        maritalStatus: "",
        bloodGroup: "",
        mobile: "",
        altContact: "",
        familyContact: "",
        guardianName: "",
        idProofName: "",
        idProofNumber: "",
        permanentAddress: "",
        currentAddress: "",
        bankAccountName: "",
        bankAccountNumber: "",
        bankName: "",
        bankCode: "",
        bankBranch: "",
        taxPayerId: "",
        department: "",
        designation: "",
        locationCodes: isCreate ? defaultLocationCodes : resolvedLocations,
        basicSalary: "",
        salaryPeriod: "month",
      };
    }
    const parts = splitName(user.name);
    return {
      surname: parts.surname,
      firstName: parts.first,
      lastName: parts.last,
      email: user.email,
      username: user.username?.trim() || "",
      hq6RoleId: user.tenantRoleId ?? "",
      isActive: user.status === "active",
      allowLogin: user.status === "active" || user.status === "invited",
      password: "",
      confirmPassword: "",
      salesCommission: linkedHr?.salesCommission ?? "0.00",
      maxDiscount: linkedHr?.maxDiscount ?? "",
      dob: linkedHr?.dob ?? "",
      gender: linkedHr?.gender ?? "",
      maritalStatus: linkedHr?.maritalStatus ?? "",
      bloodGroup: linkedHr?.bloodGroup ?? "",
      mobile: linkedHr?.mobile ?? "",
      altContact: linkedHr?.altContact ?? "",
      familyContact: linkedHr?.familyContact ?? "",
      guardianName: linkedHr?.guardianName ?? "",
      idProofName: linkedHr?.idProofName ?? "",
      idProofNumber: linkedHr?.idProofNumber ?? "",
      permanentAddress: linkedHr?.permanentAddress ?? "",
      currentAddress: linkedHr?.currentAddress ?? "",
      bankAccountName: linkedHr?.bankAccountName ?? "",
      bankAccountNumber: linkedHr?.bankAccountNumber ?? "",
      bankName: linkedHr?.bankName ?? "",
      bankCode: linkedHr?.bankCode ?? "",
      bankBranch: linkedHr?.bankBranch ?? "",
      taxPayerId: linkedHr?.taxPayerId ?? "",
      department: linkedHr?.department ?? "",
      designation: linkedHr?.designation ?? "",
      locationCodes: resolvedLocations,
      basicSalary: linkedHr?.basicSalary ?? "",
      salaryPeriod: "month",
    };
  }, [isCreate, user, defaultLocationCodes, linkedEmployeeLocations, linkedHr]);

  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  /** Fill / repair role when roles load or home entity changes — keep other fields. */
  useEffect(() => {
    if (!defaultHq6RoleId) return;
    setForm((prev) => {
      const stillValid =
        prev.hq6RoleId.length > 0 &&
        hq6Roles.some((r) => r.id === prev.hq6RoleId);
      if (stillValid) return prev;
      return { ...prev, hq6RoleId: defaultHq6RoleId };
    });
  }, [defaultHq6RoleId, hq6Roles]);

  useEffect(() => {
    setFormLocationCodes(form.locationCodes);
  }, [form.locationCodes]);

  useEffect(() => {
    if (searchParams.get("action") === "delete" && !isCreate) {
      setDeleteOpen(true);
    }
  }, [searchParams, isCreate]);

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateUser(recordId, { tenantId }),
    onSuccess: async () => {
      toast.success("User deactivated");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteOpen(false);
      goToList("Redirecting to users…");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to deactivate user");
    },
  });

  const displayRoleName = useMemo(() => {
    if (isEdit && form.hq6RoleId) {
      const match = hq6Roles.find((r) => r.id === form.hq6RoleId);
      if (match) return match.name;
    }
    if (user?.tenantRoleName) return user.tenantRoleName;
    if (user?.tenantRoleId) {
      const match = hq6Roles.find((r) => r.id === user.tenantRoleId);
      if (match) return match.name;
    }
    return user ? formatJwtRole(user.role) : "";
  }, [isEdit, form.hq6RoleId, hq6Roles, user]);

  if (!isCreate && !viewingTenantId && isLoading) {
    return (
      <div className="hq6-page p-6" aria-busy>
        <h1 className="text-xl font-semibold">User</h1>
        <p className="mt-2 text-sm text-muted">Loading profile…</p>
      </div>
    );
  }
  if (!isCreate && isLoading) {
    return (
      <div className="hq6-page p-6" aria-busy>
        <h1 className="text-xl font-semibold">User</h1>
        <p className="mt-2 text-sm text-muted">Loading profile…</p>
      </div>
    );
  }
  if (!isCreate && (isError || !user)) {
    return (
      <EmptyState
        title="User not found"
        message="This user could not be loaded."
        ctaLabel="Back to users"
        onCta={() => goToList("Redirecting to users…")}
      />
    );
  }

  const displayName = isCreate
    ? "New user"
    : user?.name ?? [form.surname, form.firstName, form.lastName]
        .filter(Boolean)
        .join(" ");
  const username =
    form.username.trim() ||
    user?.username?.trim() ||
    user?.email.split("@")[0] ||
    "";

  const patch = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = firstValidationError(
      validatePersonName(form.surname, "Prefix", { required: false }),
      validatePersonName(form.firstName, "First name"),
      validatePersonName(form.lastName, "Last name", { required: false }),
      validateEmail(form.email),
      validateUsername(form.username, { required: false }),
      form.allowLogin && form.password
        ? validatePassword(form.password, {
            required: isCreate,
            strong: true,
          })
        : null,
      form.allowLogin && form.password
        ? validatePasswordConfirm(form.password, form.confirmPassword)
        : null,
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const name = [form.surname, form.firstName, form.lastName]
      .map((p) => p.trim())
      .filter(Boolean)
      .join(" ");

    const selectedHq6 = form.hq6RoleId
      ? hq6Roles.find((r) => r.id === form.hq6RoleId) ?? null
      : null;
    if (!selectedHq6) {
      toast.error("Select a role from the Roles list.");
      return;
    }
    if (isCreate && !form.locationCodes.length) {
      toast.error("Select at least one entity this user belongs to.");
      return;
    }
    if (isCreate && !tenantId) {
      toast.error("Could not resolve the home entity from the selection.");
      return;
    }
    const jwtRole = mapTenantRoleToJwtRole(selectedHq6);
    const multiEntityNote =
      form.locationCodes.length > 1
        ? ` Visible on ${form.locationCodes.join(", ")}; use the header switcher to change active entity.`
        : "";

    // Validate password before leaving so we don't dump the user on the list
    // with a failed create.
    if (isCreate && form.allowLogin) {
      const pwdErr = validatePassword(form.password, { strong: true });
      if (pwdErr) {
        toast.error(pwdErr);
        return;
      }
    }

    setSaving(true);
    // Leave first — write (+ retries) finishes in the background.
    goToList(isCreate ? "Creating user…" : "Saving & returning to users…");
    const idempotencyKey = newIdempotencyKey();
    void withWriteProgress(
      () =>
        withIdempotencyKey(idempotencyKey, async () => {
      if (isCreate) {
        if (form.allowLogin) {
          const created = await createUser(
            {
              email: form.email.trim(),
              name,
              role: jwtRole,
              tenantRoleId: selectedHq6.id,
              password: form.password,
              username: form.username.trim() || undefined,
              tenantId: tenantId ?? undefined,
            },
            { tenantId },
          );
          if (tenantId && created.user?.id) {
            try {
              await linkUserToPayroll({
                tenantId,
                userId: created.user.id,
                name,
                designationName: form.designation,
                locationCodes: form.locationCodes,
                basicSalary: form.basicSalary,
                salaryPeriod: form.salaryPeriod,
                ...formHrProfile(form),
              });
              void queryClient.invalidateQueries({ queryKey: ["employees"] });
              void queryClient.invalidateQueries({ queryKey: ["payrolls"] });
              void queryClient.invalidateQueries({ queryKey: ["hrm"] });
              toast.success(`Created ${name} (linked to payroll)${multiEntityNote}`);
            } catch (payrollErr) {
              console.error("[user→payroll]", payrollErr);
              const detail =
                payrollErr instanceof Error
                  ? payrollErr.message
                  : "Unknown error";
              toast.warning(
                `Created ${name}, but payroll setup failed: ${detail}. Add them under HRM / Payroll.`,
              );
            }
          } else {
            toast.success(`Created ${name}${multiEntityNote}`);
          }
        } else {
          const invited = await inviteUser(
            {
              email: form.email.trim(),
              name,
              role: jwtRole,
              tenantRoleId: selectedHq6.id,
              tenantId: tenantId ?? undefined,
            },
            { tenantId },
          );

          if (tenantId && invited.user?.id) {
            try {
              await linkUserToPayroll({
                tenantId,
                userId: invited.user.id,
                name,
                designationName: form.designation,
                locationCodes: form.locationCodes,
                basicSalary: form.basicSalary,
                salaryPeriod: form.salaryPeriod,
                ...formHrProfile(form),
              });
              void queryClient.invalidateQueries({ queryKey: ["employees"] });
              void queryClient.invalidateQueries({ queryKey: ["payrolls"] });
              void queryClient.invalidateQueries({ queryKey: ["hrm"] });
              toast.success(`Invited ${name} (linked to payroll)${multiEntityNote}`);
            } catch (payrollErr) {
              console.error("[invite→payroll]", payrollErr);
              const detail =
                payrollErr instanceof Error
                  ? payrollErr.message
                  : "Unknown error";
              toast.warning(
                `Invited ${name}, but payroll setup failed: ${detail}. Add them under HRM / Payroll.`,
              );
            }
          } else {
            toast.success(`Invited ${name}${multiEntityNote}`);
          }

          if (invited.devInviteUrl && typeof window !== "undefined") {
            console.info("[invite]", invited.devInviteUrl);
          }
        }
      } else {
        await updateUser(
          recordId,
          {
            email: form.email.trim(),
            name,
            role: jwtRole,
            tenantRoleId: selectedHq6.id,
            username: form.username.trim() || null,
            status: form.isActive ? "active" : "suspended",
            ...(form.allowLogin && form.password
              ? { password: form.password }
              : {}),
          },
          { tenantId },
        );
        toast.success(`Updated ${name}${multiEntityNote}`);
        const userPatch = {
          name,
          email: form.email.trim(),
          role: jwtRole,
          tenantRoleId: selectedHq6.id,
          username: form.username.trim() || null,
          status: (form.isActive ? "active" : "suspended") as User["status"],
        };
        queryClient.setQueryData(
          [
            "user",
            isAdminHrmUsers ? "vag" : (viewingTenantId ?? "vag"),
            recordId,
          ],
          (prev: User | undefined) =>
            prev ? { ...prev, ...userPatch } : prev,
        );
        patchEntityInQueries(queryClient, ["users"], recordId, userPatch);
        void queryClient.invalidateQueries({ queryKey: ["users"] });
        void queryClient.invalidateQueries({
          queryKey: [
            "user",
            isAdminHrmUsers ? "vag" : (viewingTenantId ?? "vag"),
            recordId,
          ],
        });
        // HR sync in background — don't hold the redirect for payroll fields.
        if (tenantId) {
          void syncUserHrFields({
            tenantId,
            userId: recordId,
            name,
            locationCodes: form.locationCodes,
            designationName: form.designation,
            basicSalary: form.basicSalary,
            salaryPeriod: form.salaryPeriod,
            ...formHrProfile(form),
          })
            .then(() => {
              void queryClient.invalidateQueries({
                queryKey: ["user-hr-profile"],
              });
              void queryClient.invalidateQueries({ queryKey: ["employees"] });
              void queryClient.invalidateQueries({ queryKey: ["payrolls"] });
            })
            .catch((hrErr) => {
              console.error("[user→hr]", hrErr);
              toast.warning(
                `Updated ${name}, but HR/payroll fields failed to save. Re-edit if needed.`,
              );
            });
        }
      }
      if (isCreate) {
        void queryClient.invalidateQueries({ queryKey: ["users"] });
      }
        }),
      isCreate ? "Creating user" : "Updating user",
    )
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error
            ? err.message
            : isCreate
              ? "Failed to create user"
              : "Failed to update user",
        );
      })
      .finally(() => {
        setSaving(false);
      });
  };

  /* ——— Edit / Create form (manage_user/edit|create.blade.php) ——— */
  if (isEdit) {
  return (
      <div className="hq6-page hq6-user-form-page">
        <section className="content-header">
          <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
            {isCreate ? "Add user" : "Edit user"}
          </h1>
        </section>
        <section className="content">
          <BusyFormShell busy={saving}>
          <form id="user_edit_form" onSubmit={handleSave}>
            <div className="row">
              <div className="col-md-12">
                <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
                  <div className="tw-p-2 sm:tw-p-3">
                    <div className="tw-flow-root">
                      <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                        <div className="row">
                          <div className="col-md-2">
                            <div className="form-group">
                              <label htmlFor="surname">Prefix:</label>
                              <input
                                id="surname"
                                className="form-control"
                                placeholder="Mr / Mrs / Miss"
                                value={form.surname}
                                onChange={(e) =>
                                  patch(
                                    "surname",
                                    sanitizePersonNameInput(e.target.value),
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-5">
                            <div className="form-group">
                              <label htmlFor="first_name">
                                First Name:<span className="req">*</span>
                              </label>
                              <input
                                id="first_name"
                                className="form-control"
                                required
                                placeholder="First Name"
                                value={form.firstName}
                                onChange={(e) =>
                                  patch(
                                    "firstName",
                                    sanitizePersonNameInput(e.target.value),
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-5">
                            <div className="form-group">
                              <label htmlFor="last_name">Last Name:</label>
                              <input
                                id="last_name"
                                className="form-control"
                                placeholder="Last Name"
                                value={form.lastName}
                                onChange={(e) =>
                                  patch(
                                    "lastName",
                                    sanitizePersonNameInput(e.target.value),
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="clearfix" />
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="email">
                                Email:<span className="req">*</span>
                              </label>
                              <input
                                id="email"
                                type="email"
                                className="form-control"
                                required
                                placeholder="Email"
                                value={form.email}
                                onChange={(e) => patch("email", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="col-md-2">
                            <div className="form-group">
                              <div className="checkbox">
                                <br />
                                <label>
                                  <input
                                    type="checkbox"
                                    className="input-icheck status"
                                    checked={form.isActive}
                                    onChange={(e) =>
                                      patch("isActive", e.target.checked)
                                    }
                                  />{" "}
                                  Status (Active)
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="form-group">
                              <div className="checkbox">
                                <br />
                                <label>
                                  <input
                                    type="checkbox"
                                    className="input-icheck"
                                    checked={false}
                                    readOnly
                                    disabled
                                  />{" "}
                                  Enable service staff pin
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-12">
                <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
                  <div className="tw-p-2 sm:tw-p-3">
                    <div className="box-header">
                      <h3 className="box-title">Roles and Permissions</h3>
                    </div>
                    <div className="tw-flow-root">
                      <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="form-group">
                              <div className="checkbox">
                                <label>
                                  <input
                                    type="checkbox"
                                    id="allow_login"
                                    className="input-icheck"
                                    checked={form.allowLogin}
                                    onChange={(e) =>
                                      patch("allowLogin", e.target.checked)
                                    }
                                  />{" "}
                                  Allow login
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className="clearfix" />
                          {form.allowLogin ? (
                            <div className="user_auth_fields">
                              <div className="col-md-4">
                                <div className="form-group">
                                  <label htmlFor="username">
                                    Email or Username:
                                  </label>
                                  <input
                                    id="username"
                                    className="form-control"
                                    placeholder="Email or username"
                                    autoComplete="username"
                                    value={form.username}
                                    onChange={(e) =>
                                      patch("username", e.target.value)
                                    }
                                  />
                                  <p className="help-block">
                                    Login ID — they can sign in with this or their email.
                                  </p>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="form-group">
                                  <PasswordField
                                    id="password"
                                    label="Password:"
                                    requiredMark={isCreate}
                                    showStrength={Boolean(
                                      form.allowLogin && form.password,
                                    )}
                                    placeholder="Password"
                                    value={form.password}
                                    onChange={(e) =>
                                      patch("password", e.target.value)
                                    }
                                  />
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="form-group">
                                  <PasswordField
                                    id="confirm_password"
                                    label="Confirm Password:"
                                    requiredMark={isCreate}
                                    placeholder="Confirm Password"
                                    value={form.confirmPassword}
                                    onChange={(e) =>
                                      patch("confirmPassword", e.target.value)
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ) : null}
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="role">
                                Role:<span className="req">*</span>
                              </label>
                              <select
                                id="role"
                                className="form-control"
                                value={form.hq6RoleId}
                                onChange={(e) =>
                                  patch("hq6RoleId", e.target.value)
                                }
                                required
                              >
                                {hq6Roles.length === 0 ? (
                                  <option value="">
                                    {rolesTenantId
                                      ? "No roles — create one under Roles"
                                      : "Pick an entity below to load roles"}
                                  </option>
                                ) : (
                                  hq6Roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))
                                )}
                              </select>
                              <p className="help-block">
                                Role list comes from the first entity in
                                Entities (below).
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-12">
                <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
                  <div className="tw-p-2 sm:tw-p-3">
                    <div className="box-header">
                      <h3 className="box-title">Sales</h3>
                    </div>
                    <div className="tw-flow-root">
                      <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="cmmsn_percent">
                                Sales Commission Percentage (%):
                              </label>
                              <input
                                id="cmmsn_percent"
                                className="form-control"
                                value={form.salesCommission}
                                onChange={(e) =>
                                  patch("salesCommission", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="max_sales_discount">
                                Max sales discount percent:
                              </label>
                              <input
                                id="max_sales_discount"
                                className="form-control"
                                value={form.maxDiscount}
                                onChange={(e) =>
                                  patch("maxDiscount", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-12">
                <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
                  <div className="tw-p-2 sm:tw-p-3">
                    <div className="box-header">
                      <h3 className="box-title">More Informations</h3>
                    </div>
                    <div className="tw-flow-root">
                      <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="dob">Date of birth:</label>
                              <input
                                id="dob"
                                type="date"
                                className="form-control"
                                value={form.dob}
                                onChange={(e) => patch("dob", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="gender">Gender:</label>
                              <select
                                id="gender"
                                className="form-control"
                                value={form.gender}
                                onChange={(e) => patch("gender", e.target.value)}
                              >
                                <option value="">Please Select</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Others</option>
                              </select>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="marital_status">
                                Marital Status:
                              </label>
                              <select
                                id="marital_status"
                                className="form-control"
                                value={form.maritalStatus}
                                onChange={(e) =>
                                  patch("maritalStatus", e.target.value)
                                }
                              >
                                <option value="">Please Select</option>
                                <option value="married">Married</option>
                                <option value="unmarried">Unmarried</option>
                                <option value="divorced">Divorced</option>
                              </select>
                            </div>
                          </div>
                          <div className="clearfix" />
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="blood_group">Blood Group:</label>
                              <input
                                id="blood_group"
                                className="form-control"
                                value={form.bloodGroup}
                                onChange={(e) =>
                                  patch("bloodGroup", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="mobile">Mobile Number:</label>
                              <input
                                id="mobile"
                                className="form-control"
                                value={form.mobile}
                                onChange={(e) => patch("mobile", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="alt_number">
                                Alternate contact number:
                              </label>
                              <input
                                id="alt_number"
                                className="form-control"
                                value={form.altContact}
                                onChange={(e) =>
                                  patch("altContact", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="clearfix" />
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="family_number">
                                Family contact number:
                              </label>
                              <input
                                id="family_number"
                                className="form-control"
                                value={form.familyContact}
                                onChange={(e) =>
                                  patch("familyContact", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="guardian_name">
                                Guardian Name:
                              </label>
                              <input
                                id="guardian_name"
                                className="form-control"
                                value={form.guardianName}
                                onChange={(e) =>
                                  patch("guardianName", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="id_proof_name">
                                ID Proof Name:
                              </label>
                              <input
                                id="id_proof_name"
                                className="form-control"
                                value={form.idProofName}
                                onChange={(e) =>
                                  patch("idProofName", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="clearfix" />
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="id_proof_number">
                                ID Proof Number:
                              </label>
                              <input
                                id="id_proof_number"
                                className="form-control"
                                value={form.idProofNumber}
                                onChange={(e) =>
                                  patch("idProofNumber", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-group">
                              <label htmlFor="permanent_address">
                                Permanent Address:
                              </label>
                              <textarea
                                id="permanent_address"
                                className="form-control"
                                rows={3}
                                value={form.permanentAddress}
                                onChange={(e) =>
                                  patch("permanentAddress", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-group">
                              <label htmlFor="current_address">
                                Current Address:
                              </label>
                              <textarea
                                id="current_address"
                                className="form-control"
                                rows={3}
                                value={form.currentAddress}
                                onChange={(e) =>
                                  patch("currentAddress", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-12">
                <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
                  <div className="tw-p-2 sm:tw-p-3">
                    <div className="box-header">
                      <h3 className="box-title">Bank Details</h3>
                    </div>
                    <div className="tw-flow-root">
                      <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="bankAccountName">
                                Account Holder&apos;s Name:
                              </label>
                              <input
                                id="bankAccountName"
                                className="form-control"
                                value={form.bankAccountName}
                                onChange={(e) =>
                                  patch("bankAccountName", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="bankAccountNumber">
                                Account Number:
                              </label>
                              <input
                                id="bankAccountNumber"
                                className="form-control"
                                value={form.bankAccountNumber}
                                onChange={(e) =>
                                  patch("bankAccountNumber", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="bankName">Bank Name:</label>
                              <input
                                id="bankName"
                                className="form-control"
                                value={form.bankName}
                                onChange={(e) =>
                                  patch("bankName", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="bankCode">
                                Bank Identifier Code:
                              </label>
                              <input
                                id="bankCode"
                                className="form-control"
                                value={form.bankCode}
                                onChange={(e) =>
                                  patch("bankCode", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="bankBranch">Branch:</label>
                              <input
                                id="bankBranch"
                                className="form-control"
                                value={form.bankBranch}
                                onChange={(e) =>
                                  patch("bankBranch", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="taxPayerId">Tax Payer ID:</label>
                              <input
                                id="taxPayerId"
                                className="form-control"
                                value={form.taxPayerId}
                                onChange={(e) =>
                                  patch("taxPayerId", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-12">
                <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
                  <div className="tw-p-2 sm:tw-p-3">
                    <div className="box-header">
                      <h3 className="box-title">HRM Details</h3>
                    </div>
                    <div className="tw-flow-root">
                      <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="department">Department:</label>
                              <input
                                id="department"
                                className="form-control"
                                placeholder="Department"
                                value={form.department}
                                onChange={(e) =>
                                  patch("department", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="designation">Designation:</label>
                              <input
                                id="designation"
                                className="form-control"
                                placeholder="Designation"
                                value={form.designation}
                                onChange={(e) =>
                                  patch("designation", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-12">
                <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
                  <div className="tw-p-2 sm:tw-p-3">
                    <div className="box-header">
                      <h3 className="box-title">Payroll</h3>
                    </div>
                    <div className="tw-flow-root">
                      <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="basic_salary">Basic salary:</label>
                              <div className="input-group">
                                <input
                                  id="basic_salary"
                                  className="form-control"
                                  value={form.basicSalary}
                                  onChange={(e) =>
                                    patch("basicSalary", e.target.value)
                                  }
                                />
                                <span
                                  className="input-group-addon"
                                  style={{ padding: 0 }}
                                >
                                  <select
                                    className="form-control"
                                    style={{ border: 0, height: "34px" }}
                                    value={form.salaryPeriod}
                                    onChange={(e) =>
                                      patch("salaryPeriod", e.target.value)
                                    }
                                  >
                                    <option value="month">Per Month</option>
                                    <option value="week">Per Week</option>
                                    <option value="day">Per Day</option>
                                  </select>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-12">
                <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
                  <div className="tw-p-2 sm:tw-p-3">
                    <div className="box-header">
                      <h3 className="box-title">Entities</h3>
                    </div>
                    <div className="tw-flow-root">
                      <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                        <div className="form-group">
                          <label htmlFor="work_locations">
                            Entities this user belongs to:
                            <span className="req">*</span>
                          </label>
                          <TagCombobox
                            id="work_locations"
                            values={form.locationCodes}
                            options={[...WORK_LOCATION_OPTIONS]}
                            placeholder="Add entity…"
                            onChange={(locationCodes) =>
                              setForm((prev) => ({ ...prev, locationCodes }))
                            }
                          />
                          <p className="help-block">
                            Assign one or more businesses here. First selection
                            is the home entity for role &amp; payroll. Multiple
                            enables the header location switcher and shows this
                            user on each assigned entity&apos;s Users list (VW,
                            VM→VA, VP, VISP, VSP; operations: VC, VS, VKW).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-12">
                <Hq6BusyButton
                  type="submit"
                  id="submit_user_button"
                  className="tw-dw-btn tw-dw-btn-primary tw-text-white tw-dw-btn-lg"
                  busy={saving}
                  busyLabel={isCreate ? "Creating…" : "Updating…"}
                >
                  {isCreate ? "Save" : "Update"}
                </Hq6BusyButton>{" "}
        <button
          type="button"
                  className="tw-dw-btn"
                  disabled={saving}
                  onClick={() => goToList("Redirecting to users…")}
        >
                  Cancel
        </button>
              </div>
            </div>
          </form>
          </BusyFormShell>
        </section>
      </div>
    );
  }

  /* ——— View (manage_user/show.blade.php) ——— */
  return (
    <div className="hq6-page hq6-user-show-page">
      <div className="hq6-user-show-topbar">
        <h1 className="hq6-user-show-title">View User</h1>
        <select
          className="hq6-user-show-switcher"
          id="user_id"
          value={recordId}
          onChange={(e) => {
            if (e.target.value) router.push(detailPath(e.target.value));
          }}
          aria-label="Select user"
        >
          <option value={recordId}>{displayName}</option>
        </select>
      </div>

      <div className="hq6-user-show-body">
        <div className="hq6-user-show-card hq6-user-show-profile-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="hq6-user-show-avatar"
            src={avatarUrl(displayName)}
            alt=""
          />
          <h2 className="hq6-user-show-name">{displayName}</h2>
          <p className="hq6-user-show-role">{displayRoleName}</p>

          <dl className="hq6-user-show-meta">
            <div className="hq6-user-show-meta-row">
              <dt>Username</dt>
              <dd>{username}</dd>
            </div>
            <div className="hq6-user-show-meta-row">
              <dt>Email</dt>
              <dd>{user?.email}</dd>
            </div>
            <div className="hq6-user-show-meta-row">
              <dt>Status for user</dt>
              <dd>
                {user?.status === "active" ? (
                  <span className="hq6-user-show-badge hq6-user-show-badge-ok">
                    Active
                  </span>
                ) : (
                  <span className="hq6-user-show-badge hq6-user-show-badge-off">
                    Inactive
                  </span>
                )}
              </dd>
            </div>
          </dl>

            <button
              type="button"
            className="hq6-user-show-edit-btn"
              onClick={() => router.push(`${detailPath(recordId)}/edit`)}
            >
              Edit
            </button>
        </div>

        <div className="hq6-user-show-card hq6-user-show-tabs-card">
          <nav className="hq6-user-show-tabs" aria-label="User sections">
            {(
              [
                { id: "info" as const, label: "User info" },
                { id: "docs" as const, label: "Documents & Notes" },
                { id: "activities" as const, label: "Activities" },
              ] as const
            ).map((tab) => (
            <button
                key={tab.id}
              type="button"
                className={cn(
                  "hq6-user-show-tab",
                  activeTab === tab.id && "hq6-user-show-tab-active",
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
          </button>
            ))}
          </nav>

          <div className="hq6-user-show-tab-body">
            {activeTab === "info" ? (
              <div className="hq6-user-show-info-grid">
                <p>
                  <strong>Sales Commission Percentage:</strong> 0%
                </p>
                <p>
                  <strong>Allowed contacts:</strong> All
                </p>
                <p>
                  <strong>Role:</strong> {displayRoleName || "—"}
                </p>
                <p>
                  <strong>Username:</strong> {username}
                </p>
                <p>
                  <strong>Email:</strong> {user?.email}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {user?.status === "active" ? "Active" : "Inactive"}
                </p>
          </div>
            ) : null}
            {activeTab === "docs" ? (
              <p className="hq6-user-show-empty">No documents or notes.</p>
            ) : null}
            {activeTab === "activities" ? (
              <p className="hq6-user-show-empty">No activity logged yet.</p>
            ) : null}
          </div>
          </div>
          </div>

      <div className="hq6-user-show-footer">
        <button
          type="button"
          className="hq6-user-show-back-btn"
          onClick={() => router.push(listPath)}
        >
          Back to users
        </button>
          </div>

      <Hq6ConfirmModal
        open={deleteOpen}
        danger
        onClose={() => {
          setDeleteOpen(false);
          router.replace(detailPath(recordId));
        }}
        onConfirm={() => {
          if (!deactivateMutation.isPending) {
            deactivateMutation.mutate();
          }
        }}
        title="Are you sure?"
        message={`This will deactivate “${displayName}” and revoke their access.`}
        confirmLabel={deactivateMutation.isPending ? "Deactivating…" : "Yes, deactivate"}
      />
    </div>
  );
}
