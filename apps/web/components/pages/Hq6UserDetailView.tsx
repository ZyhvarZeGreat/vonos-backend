"use client";

/**
 * HQ6 user View / Edit / Add — lifted from manage_user/show|edit|create.blade.php
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@vonos/types";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { getUser } from "@/lib/api/users";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { DETAIL_RECORD_STALE_MS } from "@/lib/query/prefetchListDetails";
import { DetailPageSkeleton } from "@/components/organisms/skeletons";
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
  const tenantId = useTenantId();
  const { listPath, detailPath } = useRecordNavigation("users");
  const isCreate = recordId === "new" || recordId === "create";
  const isEdit = mode === "edit" || isCreate;
  const [deleteOpen, setDeleteOpen] = useState(false);
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
      allowLogin: user.status === "active",
      password: "",
      confirmPassword: "",
    };
  }, [isCreate, user]);

  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  useEffect(() => {
    if (searchParams.get("action") === "delete" && !isCreate) {
      setDeleteOpen(true);
    }
  }, [searchParams, isCreate]);

  if (!tenantId) return <DetailPageSkeleton />;
  if (!isCreate && isLoading) return <DetailPageSkeleton />;
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

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.email.trim()) {
      toast.error("First name and email are required.");
      return;
    }
    if (form.allowLogin && form.password && form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    toast.info(
      isCreate
        ? "Create user will use the users API when available."
        : "Update user will use the users API when available.",
    );
    router.push(listPath);
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
                <button
                  type="submit"
                  className="tw-dw-btn tw-dw-btn-primary tw-text-white tw-dw-btn-lg"
                >
                  Save
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
      <section className="content">
        <div className="row">
          <div className="col-md-4">
            <h3>View User</h3>
          </div>
          <div className="col-md-4 col-xs-12 mt-15 pull-right">
            <select
              className="form-control"
              id="user_id"
              value={recordId}
              onChange={(e) => {
                if (e.target.value) router.push(detailPath(e.target.value));
              }}
            >
              <option value={recordId}>{displayName}</option>
            </select>
          </div>
        </div>
        <br />
        <div className="row">
          <div className="col-md-3">
            <div className="box box-primary">
              <div className="box-body box-profile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="profile-user-img img-responsive img-circle"
                  src={avatarUrl(displayName)}
                  alt="User profile"
                />
                <h3 className="profile-username text-center">{displayName}</h3>
                <p className="text-muted text-center" title="Role">
                  {user ? formatRole(user.role) : ""}
                </p>
                <ul className="list-group list-group-unbordered">
                  <li className="list-group-item">
                    <b>Username</b>
                    <a className="pull-right">{username}</a>
                  </li>
                  <li className="list-group-item">
                    <b>Email</b>
                    <a className="pull-right">{user?.email}</a>
                  </li>
                  <li className="list-group-item">
                    <b>Status for user</b>
                    {user?.status === "active" ? (
                      <span className="label label-success pull-right">
                        Active
                      </span>
                    ) : (
                      <span className="label label-danger pull-right">
                        Inactive
                      </span>
                    )}
                  </li>
                </ul>
                <a
                  href={`${detailPath(recordId)}/edit`}
                  className="tw-dw-btn tw-dw-btn-primary tw-dw-btn-sm tw-text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`${detailPath(recordId)}/edit`);
                  }}
                >
                  <i className="glyphicon glyphicon-edit" aria-hidden /> Edit
                </a>
              </div>
            </div>
          </div>
          <div className="col-md-9">
            <div className="nav-tabs-custom">
              <ul className="nav nav-tabs nav-justified">
                <li className={cn(activeTab === "info" && "active")}>
                  <a
                    href="#user_info_tab"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab("info");
                    }}
                  >
                    <i className="fas fa-user" aria-hidden /> User info
                  </a>
                </li>
                <li className={cn(activeTab === "docs" && "active")}>
                  <a
                    href="#documents_and_notes_tab"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab("docs");
                    }}
                  >
                    <i className="fas fa-paperclip" aria-hidden /> Documents &amp;
                    Notes
                  </a>
                </li>
                <li className={cn(activeTab === "activities" && "active")}>
                  <a
                    href="#activities_tab"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab("activities");
                    }}
                  >
                    <i className="fas fa-pen-square" aria-hidden /> Activities
                  </a>
                </li>
              </ul>
              <div className="tab-content">
                {activeTab === "info" ? (
                  <div className="tab-pane active" id="user_info_tab">
                    <div className="row">
                      <div className="col-md-12">
                        <div className="col-md-6">
                          <p>
                            <strong>Sales Commission Percentage: </strong> 0%
                          </p>
                        </div>
                        <div className="col-md-6">
                          <p>
                            <strong>Allowed contacts: </strong> All
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ marginTop: 12 }}>
                      <div className="col-md-6">
                        <p>
                          <strong>Role: </strong>
                          {user ? formatRole(user.role) : "—"}
                        </p>
                        <p>
                          <strong>Email: </strong>
                          {user?.email}
                        </p>
                      </div>
                      <div className="col-md-6">
                        <p>
                          <strong>Username: </strong>
                          {username}
                        </p>
                        <p>
                          <strong>Status: </strong>
                          {user?.status === "active" ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
                {activeTab === "docs" ? (
                  <div className="tab-pane active" id="documents_and_notes_tab">
                    <p className="text-muted">No documents or notes.</p>
                  </div>
                ) : null}
                {activeTab === "activities" ? (
                  <div className="tab-pane active" id="activities_tab">
                    <p className="text-muted">No activity logged yet.</p>
                  </div>
                ) : null}
              </div>
            </div>
            <p style={{ marginTop: 16 }}>
              <button
                type="button"
                className="tw-dw-btn"
                onClick={() => router.push(listPath)}
              >
                Back to users
              </button>
            </p>
          </div>
        </div>
      </section>

      <Hq6ConfirmModal
        open={deleteOpen}
        danger
        onClose={() => {
          setDeleteOpen(false);
          router.replace(detailPath(recordId));
        }}
        onConfirm={() => {
          toast.info(
            `Soft-delete for “${displayName}” will use the users API when available.`,
          );
          setDeleteOpen(false);
          router.push(listPath);
        }}
        title="Are you sure?"
        message="This user will be deactivated when the API is wired."
        confirmLabel="Yes, delete"
      />
    </div>
  );
}
