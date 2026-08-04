"use client";

/**
 * HQ6 / Ultimate POS Modules → Orders (service staff screen).
 * Matches ui-audit/61_modules__orders: centered title, Refresh, staff select,
 * Line Orders + All your orders boxes.
 */
import { useCallback, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, RefreshCw } from "lucide-react";
import { getOrdersPage } from "@/lib/api/orders";
import { getServiceStaff } from "@/lib/api/hrm";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import type { TenantCode } from "@/lib/registries/tenants";
import { tenantOverviewPath } from "@/lib/utils/tenantRoutes";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import type { Order } from "@/lib/types/entityRows";

export function Hq6OrdersModuleView() {
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState("");
  const homeHref = tenantCode
    ? tenantOverviewPath(tenantCode as TenantCode)
    : "/";

  const staffQuery = useQuery({
    queryKey: ["service-staff", tenantId],
    queryFn: () => getServiceStaff(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: Infinity,
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", "hq6-module", tenantId, staffId],
    queryFn: () =>
      getOrdersPage(tenantId!, { includeSummary: false }, undefined, 50),
    enabled: Boolean(tenantId),
    placeholderData: { items: [], hasMore: false, pageSize: 50 },
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  }, [queryClient]);

  // Service-staff module is for table/line orders — not retail sales list.
  // VA has no table service orders yet; keep HQ6 empty state.
  const orders = (ordersQuery.data?.items ?? []).filter(
    (o) => o.tableNumber != null && o.tableNumber !== "",
  );
  const showLoading = false;

  return (
    <div className="hq6-page hq6-orders-module">
      <section className="content min-height-90hv no-print">
        <div className="row">
          <div className="col-md-12 text-center">
            <h3 className="hq6-orders-title">
              All orders{" "}
              <Info
                className="hq6-orders-info-icon"
                aria-label="This is the service Staff screen. Service Staff can use this screen to view all orders for them and mark order as served."
              />
            </h3>
          </div>
          <div className="col-sm-12">
            <Link
              href={homeHref}
              title="Go Back"
              className="btn btn-info btn-flat m-6 hidden-xs btn-sm m-5 pull-right hq6-orders-go-back"
            >
              Go Back
            </Link>
            <button
              type="button"
              className="hq6-orders-refresh pull-right"
              id="refresh_orders"
              onClick={refresh}
              disabled={ordersQuery.isFetching}
            >
              <RefreshCw className="hq6-orders-refresh-icon" aria-hidden />
              Refresh
            </button>
          </div>
        </div>
        <br />

        <div className="row">
          <div className="hq6-orders-staff-card tw-mb-4">
            <div className="tw-p-2 sm:tw-p-3">
              <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div className="input-group hq6-orders-staff-group">
                    <span className="input-group-addon">
                      <i className="fa fa-user" aria-hidden />
                    </span>
                    <select
                      className="form-control"
                      id="service_staff_id"
                      name="service_staff"
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      aria-label="Select service staff"
                    >
                      <option value="">Select service staff</option>
                      {(staffQuery.data ?? []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <OrdersBox
          title="Line Orders"
          orders={orders}
          loading={showLoading}
          empty="No orders found"
        />

        <OrdersBox
          title="All your orders"
          orders={orders}
          loading={showLoading}
          empty="No orders found"
        />

        <p className="hq6-footer">
          Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()}{" "}
          All rights reserved.
        </p>
      </section>
    </div>
  );
}

function OrdersBox({
  title,
  orders,
  loading,
  empty,
}: {
  title: string;
  orders: Order[];
  loading: boolean;
  empty: string;
}) {
  return (
    <div className="box box-solid hq6-orders-box tw-mb-4">
      <div className="box-header with-border">
        <h3 className="box-title">{title}</h3>
      </div>
      <div className="box-body tw-py-2 sm:tw-px-5">
        {loading ? (
          <h4 className="text-center tw-text-gray-500">Loading…</h4>
        ) : orders.length === 0 ? (
          <h4 className="text-center hq6-orders-empty">{empty}</h4>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Table</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.reference}</td>
                    <td>{o.tableNumber ?? "Takeaway"}</td>
                    <td>{o.itemCount}</td>
                    <td>{formatCurrency(o.total, o.currency)}</td>
                    <td>
                      <span className="label label-info">{o.status}</span>
                    </td>
                    <td>{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
