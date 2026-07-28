"use client";

/**
 * HQ6 user View / Edit / Add — lifted from manage_user/show|edit|create.blade.php
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@vonos/types";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { createUser, deactivateUser, getUser, inviteUser, updateUser } from "@/lib/api/users";
import {
  createDesignation,
  createEmployee,
  getDesignations,
} from "@/lib/api/hrm";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId, useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { BUSINESS_LOCATION_PRESETS } from "@vonos/types";
import { DETAIL_RECORD_STALE_MS } from "@/lib/query/prefetchListDetails";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/stores/toastStore";

function formatRole(role: User["role"]): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function splitName(full: string): {
  surname: string;
  first: string;
  last: string;
} {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { surname: "", first: "", last: "" };
  if (parts.length === 1) return { surname: "", first: parts[0]!, last: "" };
  if (parts.length === 2) return { surname: "", first: parts[0]!, last: parts[1]! };
  return {
    surname: parts[0]!,
    first: parts[1]!,
    last: parts.slice(2).join(" "),
  };
}

function avatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e5e7eb&color=374151`;
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
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const { listPath, detailPath } = useRecordNavigation("users");

  const payrollLocations = useMemo(() => {
    const fromConfig = config?.businessLocations ?? [];
    const vag = BUSINESS_LOCATION_PRESETS.VAG ?? [];
    const codes = new Set(fromConfig.map((l) => l.code));
    const merged = [...fromConfig];
    for (const loc of vag) {
      if (!codes.has(loc.code)) merged.push(loc);
    }
    if (!merged.some((l) => l.code === "ALL")) {
      merged.unshift({ code: "ALL", name: "All Locations" });
    }
    if (!merged.some((l) => l.code === "VISP")) {
      merged.push({
        code: "VISP",
        name: "Vonos Institute Spare Parts",
      });
    }
    return merged;
  }, [config?.businessLocations]);
  const isCreate = recordId === "new" || recordId === "create";
  const isEdit = mode === "edit" || isCreate;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "docs" | "activities">(
    "info",
  );

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["user", tenantId, recordId],
    queryFn: () => getUser(recordId, tenantId),
    enabled: Boolean(tenantId && recordId && !isCreate),
    staleTime: DETAIL_RECORD_STALE_MS,
  });

  const initial = useMemo(() => {
    if (isCreate || !user) {
      return {
        surname: "",
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        role: "staff" as User["role"],
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
        primaryLocation: "",
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
      username: user.email.split("@")[0] ?? "",
      role: user.role,
      isActive: user.status === "active",
      allowLogin: user.status === "active" || user.status === "invited",
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
      primaryLocation: "",
      basicSalary: "",
      salaryPeriod: "month",
    };
  }, [isCreate, user]);

  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  useEffect(() => {
    if (searchParams.get("action") === "delete" && !isCreate) {
      setDeleteOpen(true);
    }
  }, [searchParams, isCreate]);

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateUser(recordId, { tenantId }),
    onSuccess: async () => {
      toast.success("User deactivated");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteOpen(false);
      router.push(listPath);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to deactivate user");
    },
  });

  if (!tenantId) {
    return (
      <div className="hq6-page p-6" aria-busy>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="mt-2 text-sm text-muted">Connecting to entity…</p>
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
        onCta={() => router.push(listPath)}
      />
    );
  }

  const displayName = isCreate
    ? "New user"
    : user?.name ?? [form.surname, form.firstName, form.lastName]
        .filter(Boolean)
        .join(" ");
  const username = form.username || (user?.email.split("@")[0] ?? "");

  const patch = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.email.trim()) {
      toast.error("First name and email are required.");
      return;
    }
    if (
      form.allowLogin &&
      form.password &&
      form.password !== form.confirmPassword
    ) {
      toast.error("Passwords do not match.");
      return;
    }

    const name = [form.surname, form.firstName, form.lastName]
      .map((p) => p.trim())
      .filter(Boolean)
      .join(" ");

    setSaving(true);
    try {
      if (isCreate) {
        if (form.allowLogin) {
          if (!form.password || form.password.length < 8) {
            toast.error("Password must be at least 8 characters.");
            setSaving(false);
            return;
          }
          const created = await createUser(
            {
              email: form.email.trim(),
              name,
              role: form.role,
              password: form.password,
              tenantId: tenantId ?? undefined,
            },
            { tenantId },
          );
          if (tenantId && created.user?.id) {
            try {
              let designations = await getDesignations(tenantId);
              let designationId = designations[0]?.id;
              if (!designationId) {
                const createdDes = await createDesignation(tenantId, {
                  name: "Staff",
                });
                designationId = createdDes.id;
              }
              const locationCode =
                form.primaryLocation === "ALL"
                  ? "VISP"
                  : form.primaryLocation || "VISP";
              await createEmployee(tenantId, {
                name,
                userId: created.user.id,
                designationId,
                locationCode,
                isServiceStaff: false,
              });
              await queryClient.invalidateQueries({ queryKey: ["employees"] });
              await queryClient.invalidateQueries({ queryKey: ["hrm"] });
            } catch (payrollErr) {
              console.error("[user→payroll]", payrollErr);
              toast.info(
                "User created, but payroll employee link failed — add them under HRM.",
              );
            }
          }
          toast.success(`Created ${name} (linked to payroll)`);
        } else {
          const invited = await inviteUser(
            {
              email: form.email.trim(),
              name,
              role: form.role,
              tenantId: tenantId ?? undefined,
            },
            { tenantId },
          );
          toast.success(`Invited ${name}`);
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
            role: form.role,
            status: form.isActive ? "active" : "suspended",
            ...(form.allowLogin && form.password
              ? { password: form.password }
              : {}),
          },
          { tenantId },
        );
        toast.success(`Updated ${name}`);
        await queryClient.invalidateQueries({
          queryKey: ["user", tenantId, recordId],
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push(listPath);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isCreate
            ? "Failed to create user"
            : "Failed to update user",
      );
    } finally {
      setSaving(false);
    }
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
                                onChange={(e) => patch("surname", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="col-md-5">
                            <div className="form-group">
                              <label htmlFor="first_name">First Name:*</label>
                              <input
                                id="first_name"
                                className="form-control"
                                required
                                placeholder="First Name"
                                value={form.firstName}
                                onChange={(e) =>
                                  patch("firstName", e.target.value)
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
                                  patch("lastName", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="clearfix" />
                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="email">Email:*</label>
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
                                  <label htmlFor="username">Username:</label>
                                  <input
                                    id="username"
                                    className="form-control"
                                    placeholder="Username"
                                    value={form.username}
                                    onChange={(e) =>
                                      patch("username", e.target.value)
                                    }
                                  />
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="form-group">
                                  <label htmlFor="password">Password:</label>
                                  <input
                                    id="password"
                                    type="password"
                                    className="form-control"
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
                                  <label htmlFor="confirm_password">
                                    Confirm Password:
                                  </label>
                                  <input
                                    id="confirm_password"
                                    type="password"
                                    className="form-control"
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
                              <label htmlFor="role">Role:*</label>
                              <select
                                id="role"
                                className="form-control"
                                value={form.role}
                                onChange={(e) =>
                                  patch(
                                    "role",
                                    e.target.value as User["role"],
                                  )
                                }
                              >
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="staff">Staff</option>
                                <option value="viewer">Viewer</option>
                              </select>
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
                              <label htmlFor="primary_location">
                                Primary work location:
                              </label>
                              <select
                                id="primary_location"
                                className="form-control"
                                value={form.primaryLocation || "VISP"}
                                onChange={(e) =>
                                  patch("primaryLocation", e.target.value)
                                }
                              >
                                {payrollLocations.map((loc) => (
                                  <option key={loc.code} value={loc.code}>
                                    {loc.name} ({loc.code})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
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
                <button
                  type="submit"
                  id="submit_user_button"
                  className="tw-dw-btn tw-dw-btn-primary tw-text-white tw-dw-btn-lg"
                  disabled={saving}
                >
                  {saving ? "Saving…" : isCreate ? "Save" : "Update"}
                </button>{" "}
                <button
                  type="button"
                  className="tw-dw-btn"
                  onClick={() => router.push(listPath)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
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
          <p className="hq6-user-show-role">{user ? formatRole(user.role) : ""}</p>

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
                  <strong>Role:</strong> {user ? formatRole(user.role) : "—"}
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
