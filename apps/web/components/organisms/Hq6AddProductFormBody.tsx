"use client";

import { Info } from "lucide-react";
import type { TenantConfig } from "@vonos/types";
import { cn } from "@/lib/utils/cn";

type FormState = {
  name: string;
  sku: string;
  barcodeType: string;
  unit: string;
  relatedSubUnit: string;
  brand: string;
  category: string;
  subCategory: string;
  manageStock: boolean;
  alertQuantity: string;
  description: string;
  enableImei: boolean;
  notForSelling: boolean;
  weight: string;
  carModel: string;
  preparationMinutes: string;
  applicableTax: string;
  sellingPriceTaxType: string;
  productType: string;
  purchaseExcTax: string;
  purchaseIncTax: string;
  marginPercent: string;
  sellingExcTax: string;
};

type LocationDetail = {
  locationCode: string;
  locationName: string;
  rack: string;
  row: string;
  position: string;
  quantity: string;
};

type Opt = { value: string; label: string };

export type ProductSaveMode = "save" | "saveAnother" | "saveOpeningStock";

export interface Hq6AddProductFormBodyProps {
  form: FormState;
  setField: (key: keyof FormState, value: string | boolean) => void;
  locationDetails: LocationDetail[];
  selectedLocationCodes: string[];
  toggleLocation: (code: string) => void;
  updateLocationDetail: (code: string, patch: Partial<LocationDetail>) => void;
  applyMarginToSelling: (purchase: string, margin: string) => void;
  unitOptions: Opt[];
  brandOptions: Opt[];
  categoryOptions: Opt[];
  locations: NonNullable<TenantConfig["businessLocations"]>;
  error: string | null;
  isPending: boolean;
  saveMode: ProductSaveMode;
  isEdit: boolean;
  onCancel?: () => void;
  onSubmit: (mode: ProductSaveMode) => void;
  imageName: string;
  brochureName: string;
  onImageChange: (name: string) => void;
  onBrochureChange: (name: string) => void;
}

function Tip({ title }: { title: string }) {
  return (
    <Info
      className="hq6-product-info-icon"
      aria-hidden
      title={title}
      style={{ display: "inline", width: 14, height: 14, marginLeft: 4 }}
    />
  );
}

function PlusBtn({ title }: { title: string }) {
  return (
    <span className="input-group-btn">
      <button
        type="button"
        className="btn btn-default bg-white btn-flat"
        title={title}
        tabIndex={-1}
      >
        <i className="fa fa-plus-circle text-primary fa-lg" aria-hidden />
      </button>
    </span>
  );
}

/** Blade-faithful fields for product/create.blade.php (HQ6 VA). */
export function Hq6AddProductFormBody({
  form,
  setField,
  locationDetails,
  selectedLocationCodes,
  toggleLocation,
  updateLocationDetail,
  applyMarginToSelling,
  unitOptions,
  brandOptions,
  categoryOptions,
  locations,
  error,
  isPending,
  saveMode,
  isEdit,
  onCancel,
  onSubmit,
  imageName,
  brochureName,
  onImageChange,
  onBrochureChange,
}: Hq6AddProductFormBodyProps) {
  return (
    <div
      className="hq6-add-product-form product_form"
      aria-busy={isPending || undefined}
    >
      {isPending ? (
        <p className="help-block" style={{ marginBottom: 12 }}>
          Saving product…
        </p>
      ) : null}

      <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
        <div className="tw-p-2 sm:tw-p-3 md:p-6">
          <div className="row">
            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="name">
                  Product Name:<span className="req">*</span>
                </label>
                <input
                  id="name"
                  className="form-control"
                  required
                  placeholder="Product Name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="sku">
                  SKU: <Tip title="Unique product code / SKU" />
                </label>
                <input
                  id="sku"
                  className="form-control"
                  placeholder="SKU"
                  value={form.sku}
                  onChange={(e) => setField("sku", e.target.value)}
                />
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="barcode_type">
                  Barcode Type:<span className="req">*</span>
                </label>
                <select
                  id="barcode_type"
                  className="form-control"
                  value={form.barcodeType}
                  onChange={(e) => setField("barcodeType", e.target.value)}
                >
                  <option value="C128">Code 128 (C128)</option>
                  <option value="C39">Code 39 (C39)</option>
                  <option value="EAN13">EAN-13</option>
                </select>
              </div>
            </div>

            <div className="clearfix" />

            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="unit_id">
                  Unit:<span className="req">*</span>
                </label>
                <div className="input-group">
                  <select
                    id="unit_id"
                    className="form-control"
                    value={form.unit}
                    onChange={(e) => setField("unit", e.target.value)}
                  >
                    {unitOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <PlusBtn title="Add unit" />
                </div>
              </div>
            </div>

            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="sub_unit_ids">
                  Related Sub Units:{" "}
                  <Tip title="Sub units related to the selected unit" />
                </label>
                <select
                  id="sub_unit_ids"
                  className="form-control"
                  value={form.relatedSubUnit}
                  onChange={(e) => setField("relatedSubUnit", e.target.value)}
                >
                  <option value="">Please Select</option>
                  {unitOptions
                    .filter((o) => o.value !== form.unit)
                    .map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="brand_id">Brand:</label>
                <div className="input-group">
                  <select
                    id="brand_id"
                    className="form-control"
                    value={form.brand}
                    onChange={(e) => setField("brand", e.target.value)}
                  >
                    {brandOptions.map((o) => (
                      <option key={o.value || "none"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <PlusBtn title="Add brand" />
                </div>
              </div>
            </div>

            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="category_id">Category:</label>
                <select
                  id="category_id"
                  className="form-control"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                >
                  {categoryOptions.map((o) => (
                    <option key={o.value || "none"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="sub_category_id">Sub category:</label>
                <input
                  id="sub_category_id"
                  className="form-control"
                  placeholder="Please Select"
                  value={form.subCategory}
                  onChange={(e) => setField("subCategory", e.target.value)}
                />
              </div>
            </div>

            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="product_locations">
                  Business Locations:{" "}
                  <Tip title="Locations where this product is available" />
                </label>
                <select
                  id="product_locations"
                  className="form-control"
                  multiple
                  value={selectedLocationCodes}
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      (o) => o.value,
                    );
                    for (const loc of locations) {
                      const on = selected.includes(loc.code);
                      const was = selectedLocationCodes.includes(loc.code);
                      if (on !== was) toggleLocation(loc.code);
                    }
                  }}
                  size={Math.min(4, Math.max(2, locations.length || 2))}
                >
                  {locations.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="clearfix" />

            <div className="col-sm-4">
              <div className="form-group">
                <br />
                <label>
                  <input
                    type="checkbox"
                    className="input-icheck"
                    checked={form.manageStock}
                    onChange={(e) => setField("manageStock", e.target.checked)}
                  />{" "}
                  <strong>Manage Stock?</strong>
                </label>
                <Tip title="Enable stock management at product level" />
                <p className="help-block">
                  <i>Enable stock management at product level</i>
                </p>
              </div>
            </div>

            {form.manageStock ? (
              <div className="col-sm-4" id="alert_quantity_div">
                <div className="form-group">
                  <label htmlFor="alert_quantity">
                    Alert quantity: <Tip title="Low stock alert quantity" />
                  </label>
                  <input
                    id="alert_quantity"
                    className="form-control input_number"
                    placeholder="Alert quantity"
                    min={0}
                    value={form.alertQuantity}
                    onChange={(e) => setField("alertQuantity", e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <div className="clearfix" />

            <div className="col-sm-8 mb-5">
              <div className="form-group">
                <label htmlFor="product_description">Product Description:</label>
                <div className="hq6-tinymce">
                  <div className="hq6-tinymce-menubar" aria-hidden>
                    <span>File</span>
                    <span>Edit</span>
                    <span>View</span>
                    <span>Insert</span>
                    <span>Format</span>
                    <span>Tools</span>
                    <span>Table</span>
                    <span>Help</span>
                  </div>
                  <div className="hq6-tinymce-toolbar" aria-hidden>
                    <span className="hq6-tinymce-btn">¶</span>
                    <span className="hq6-tinymce-btn">B</span>
                    <span className="hq6-tinymce-btn">I</span>
                    <span className="hq6-tinymce-btn">U</span>
                    <span className="hq6-tinymce-btn">A</span>
                    <span className="hq6-tinymce-btn">≡</span>
                    <span className="hq6-tinymce-btn">•</span>
                    <span className="hq6-tinymce-btn">1.</span>
                    <span className="hq6-tinymce-btn">🔗</span>
                  </div>
                  <textarea
                    id="product_description"
                    className="form-control hq6-tinymce-body"
                    rows={8}
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                  />
                  <div className="hq6-tinymce-status">
                    <span>p</span>
                    <span className="hq6-tinymce-powered">POWERED BY TINY</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="upload_image">Product image:</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    readOnly
                    value={imageName || ""}
                    placeholder=""
                  />
                  <span className="input-group-btn">
                    <label className="btn btn-primary btn-flat hq6-browse-btn">
                      Browse…
                      <input
                        id="upload_image"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) =>
                          onImageChange(e.target.files?.[0]?.name ?? "")
                        }
                      />
                    </label>
                  </span>
                </div>
                <small>
                  <p className="help-block">
                    Max File size: 5MB
                    <br />
                    Aspect ratio should be 1:1
                  </p>
                </small>
              </div>
            </div>

            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="product_brochure">Product Brochure:</label>
                <input
                  id="product_brochure"
                  type="file"
                  accept=".pdf,.csv,.zip,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    onBrochureChange(e.target.files?.[0]?.name ?? "")
                  }
                />
                {brochureName ? (
                  <small className="help-block">{brochureName}</small>
                ) : null}
                <small>
                  <p className="help-block">
                    Max File size: 5MB
                    <br />
                    Allowed File: .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg,
                    .png
                  </p>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
        <div className="tw-p-2 sm:tw-p-3 md:p-6">
          <div className="row">
            <div className="col-sm-4">
              <div className="form-group">
                <br />
                <label>
                  <input
                    type="checkbox"
                    className="input-icheck"
                    checked={form.enableImei}
                    onChange={(e) => setField("enableImei", e.target.checked)}
                  />{" "}
                  <strong>
                    Enable Product description, IMEI or Serial Number
                  </strong>
                </label>
                <Tip title="Track IMEI / serial on sales" />
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-group">
                <br />
                <label>
                  <input
                    type="checkbox"
                    className="input-icheck"
                    checked={form.notForSelling}
                    onChange={(e) =>
                      setField("notForSelling", e.target.checked)
                    }
                  />{" "}
                  <strong>Not for selling</strong>
                </label>
                <Tip title="Exclude from sell screens" />
              </div>
            </div>

            <div className="clearfix" />

            <div className="col-md-12">
              <h4>
                Rack/Row/Position Details:{" "}
                <Tip title="Storage location details" />
              </h4>
            </div>

            {locationDetails
              .filter((row) => selectedLocationCodes.includes(row.locationCode))
              .map((row) => (
                <div key={row.locationCode} className="col-sm-3">
                  <div className="form-group">
                    <label>
                      {row.locationName} ({row.locationCode}):
                    </label>
                    <input
                      className="form-control"
                      placeholder="Rack"
                      value={row.rack}
                      onChange={(e) =>
                        updateLocationDetail(row.locationCode, {
                          rack: e.target.value,
                        })
                      }
                    />
                    <input
                      className="form-control"
                      placeholder="Row"
                      style={{ marginTop: 6 }}
                      value={row.row}
                      onChange={(e) =>
                        updateLocationDetail(row.locationCode, {
                          row: e.target.value,
                        })
                      }
                    />
                    <input
                      className="form-control"
                      placeholder="Position"
                      style={{ marginTop: 6 }}
                      value={row.position}
                      onChange={(e) =>
                        updateLocationDetail(row.locationCode, {
                          position: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              ))}

            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="weight">Weight:</label>
                <input
                  id="weight"
                  className="form-control"
                  placeholder="Weight"
                  value={form.weight}
                  onChange={(e) => setField("weight", e.target.value)}
                />
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="car_model">Car Model:</label>
                <input
                  id="car_model"
                  className="form-control"
                  placeholder="Car Model"
                  value={form.carModel}
                  onChange={(e) => setField("carModel", e.target.value)}
                />
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="prep_time">
                  Service staff timer/Preparation time (In minutes):
                </label>
                <input
                  id="prep_time"
                  type="number"
                  min={0}
                  className="form-control"
                  placeholder="Service staff timer/Preparation time"
                  value={form.preparationMinutes}
                  onChange={(e) =>
                    setField("preparationMinutes", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
        <div className="tw-p-2 sm:tw-p-3 md:p-6">
          <div className="row">
            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="tax">Applicable Tax:</label>
                <select
                  id="tax"
                  className="form-control"
                  value={form.applicableTax}
                  onChange={(e) => setField("applicableTax", e.target.value)}
                >
                  <option value="none">None</option>
                </select>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="tax_type">
                  Selling Price Tax Type:<span className="req">*</span>
                </label>
                <select
                  id="tax_type"
                  className="form-control"
                  value={form.sellingPriceTaxType}
                  onChange={(e) =>
                    setField("sellingPriceTaxType", e.target.value)
                  }
                >
                  <option value="exclusive">Exclusive</option>
                  <option value="inclusive">Inclusive</option>
                </select>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="product_type">Product Type:</label>
                <select
                  id="product_type"
                  className="form-control"
                  value={form.productType}
                  onChange={(e) => setField("productType", e.target.value)}
                >
                  <option value="single">Single</option>
                  <option value="variable">Variable</option>
                  <option value="combo">Combo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr className="bg-success">
                  <th colSpan={2}>Default Purchase Price</th>
                  <th>x Margin (%)</th>
                  <th>Default Selling Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <label className="control-label">Exc. tax *</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="form-control"
                      value={form.purchaseExcTax}
                      onChange={(e) => {
                        setField("purchaseExcTax", e.target.value);
                        applyMarginToSelling(
                          e.target.value,
                          form.marginPercent,
                        );
                      }}
                    />
                  </td>
                  <td>
                    <label className="control-label">Inc. tax *</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="form-control"
                      value={form.purchaseIncTax}
                      onChange={(e) =>
                        setField("purchaseIncTax", e.target.value)
                      }
                    />
                  </td>
                  <td style={{ verticalAlign: "bottom" }}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="form-control"
                      value={form.marginPercent}
                      onChange={(e) => {
                        setField("marginPercent", e.target.value);
                        applyMarginToSelling(
                          form.purchaseExcTax,
                          e.target.value,
                        );
                      }}
                    />
                  </td>
                  <td>
                    <label className="control-label">Exc. Tax</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="form-control"
                      value={form.sellingExcTax}
                      onChange={(e) =>
                        setField("sellingExcTax", e.target.value)
                      }
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {error ? <p className="text-danger">{error}</p> : null}

      <div className="text-center" style={{ marginBottom: 16 }}>
        {onCancel ? (
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-neutral tw-text-white"
            style={{ marginRight: 8 }}
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
        {!isEdit ? (
          <>
            <button
              type="button"
              className={cn(
                "tw-dw-btn tw-text-white",
                "hq6-btn-opening-stock",
              )}
              style={{ marginRight: 8, background: "#7c3aed" }}
              disabled={isPending}
              onClick={() => onSubmit("saveOpeningStock")}
            >
              {isPending && saveMode === "saveOpeningStock"
                ? "Saving…"
                : "Save & Add Opening Stock"}
            </button>
            <button
              type="button"
              className="tw-dw-btn tw-text-white"
              style={{ marginRight: 8, background: "#db2777" }}
              disabled={isPending}
              onClick={() => onSubmit("saveAnother")}
            >
              {isPending && saveMode === "saveAnother"
                ? "Saving…"
                : "Save And Add Another"}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="tw-dw-btn tw-dw-btn-primary tw-text-white"
          disabled={isPending}
          onClick={() => onSubmit("save")}
        >
          {isPending && saveMode === "save" ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
