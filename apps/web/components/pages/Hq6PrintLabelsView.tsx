"use client";

import { useMemo, useState } from "react";
import type { Item } from "@vonos/types";
import { getItemsForPicker } from "@/lib/api/items";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { toast } from "@/stores/toastStore";
import { TYPEAHEAD_PAGE_SIZE } from "@/lib/api/fetchAllPages";

type LabelRow = {
  item: Item;
  quantity: number;
  packingDate: string;
  priceGroupId: string;
};

type PrintOpts = {
  name: boolean;
  nameSize: string;
  variations: boolean;
  variationsSize: string;
  price: boolean;
  priceSize: string;
  priceType: "inclusive" | "exclusive";
  sku: boolean;
  skuSize: string;
};

const DEFAULT_OPTS: PrintOpts = {
  name: true,
  nameSize: "15",
  variations: true,
  variationsSize: "17",
  price: true,
  priceSize: "17",
  priceType: "inclusive",
  sku: true,
  skuSize: "17",
};

/** Ultimate POS — labels/show.blade.php */
export function Hq6PrintLabelsView() {
  const tenantId = useTenantId();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);
  const [rows, setRows] = useState<LabelRow[]>([]);
  const [opts, setOpts] = useState<PrintOpts>(DEFAULT_OPTS);
  const [barcodeSetting, setBarcodeSetting] = useState("continuous");
  const [previewOpen, setPreviewOpen] = useState(false);

  const previewLabels = useMemo(() => {
    const out: LabelRow[] = [];
    for (const row of rows) {
      for (let i = 0; i < Math.max(1, row.quantity); i++) out.push(row);
    }
    return out;
  }, [rows]);

  const runSearch = async (q: string) => {
    setSearch(q);
    if (!tenantId || q.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const items = await getItemsForPicker(tenantId, q.trim(), {
        limit: TYPEAHEAD_PAGE_SIZE,
      });
      setSuggestions(items.slice(0, 12));
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const addProduct = (item: Item) => {
    setRows((prev) => {
      const existing = prev.find((r) => r.item.id === item.id);
      if (existing) {
        return prev.map((r) =>
          r.item.id === item.id ? { ...r, quantity: r.quantity + 1 } : r,
        );
      }
      return [
        ...prev,
        {
          item,
          quantity: 1,
          packingDate: "",
          priceGroupId: "",
        },
      ];
    });
    setSearch("");
    setSuggestions([]);
  };

  const updateRow = (id: string, patch: Partial<LabelRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.item.id === id ? { ...r, ...patch } : r)),
    );
  };

  const handlePreview = () => {
    if (rows.length === 0) {
      toast.error("Add products to print labels");
      return;
    }
    setPreviewOpen(true);
  };

  return (
    <div className="hq6-page hq6-print-labels-page">
      <section className="content-header">
        <br />
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          Print Labels{" "}
          <i
            className="fa fa-info-circle text-info hover-q"
            aria-hidden
            title="Add products then preview labels to print"
          />
        </h1>
      </section>

      <section className="content no-print">
        <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div className="box-header">
            <h3 className="box-title">Add products to generate Labels</h3>
          </div>
          <div className="tw-p-2 sm:tw-p-3 md:p-6">
            <div className="row">
              <div className="col-sm-8 col-sm-offset-2">
                <div className="form-group" style={{ position: "relative" }}>
                  <div className="input-group">
                    <span className="input-group-addon">
                      <i className="fa fa-search" aria-hidden />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      id="search_product_for_label"
                      placeholder="Enter product name to print labels"
                      autoFocus
                      value={search}
                      onChange={(e) => void runSearch(e.target.value)}
                    />
                  </div>
                  {searching ? (
                    <p className="help-block" style={{ marginTop: 6 }}>
                      Searching…
                    </p>
                  ) : null}
                  {suggestions.length > 0 ? (
                    <ul className="hq6-label-suggest">
                      {suggestions.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => addProduct(item)}
                          >
                            {item.name}{" "}
                            <small className="text-muted">({item.sku})</small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-sm-10 col-sm-offset-2">
                <table
                  className="table table-bordered table-striped table-condensed"
                  id="product_table"
                >
                  <thead>
                    <tr>
                      <th>Products</th>
                      <th>No. of Labels</th>
                      <th>Packing Date</th>
                      <th>Selling Price Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-muted">
                          No products added
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.item.id}>
                          <td>{row.item.name}</td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              min={1}
                              value={row.quantity}
                              onChange={(e) =>
                                updateRow(row.item.id, {
                                  quantity: Math.max(
                                    1,
                                    Number(e.target.value) || 1,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control label-date-picker"
                              placeholder="Packing date"
                              value={row.packingDate}
                              onChange={(e) =>
                                updateRow(row.item.id, {
                                  packingDate: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td>
                            <select
                              className="form-control"
                              value={row.priceGroupId}
                              onChange={(e) =>
                                updateRow(row.item.id, {
                                  priceGroupId: e.target.value,
                                })
                              }
                            >
                              <option value="">None</option>
                              <option value="default">Default</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div className="box-header">
            <h3 className="box-title">Information to show in Labels</h3>
          </div>
          <div className="tw-p-2 sm:tw-p-3 md:p-6">
            <div className="row">
              <div className="col-md-12">
                <table className="table table-bordered">
                  <tbody>
                    <tr>
                      <td>
                        <div className="checkbox">
                          <label>
                            <input
                              type="checkbox"
                              checked={opts.name}
                              onChange={(e) =>
                                setOpts((o) => ({
                                  ...o,
                                  name: e.target.checked,
                                }))
                              }
                            />{" "}
                            <b>Product Name</b>
                          </label>
                        </div>
                        <div className="input-group">
                          <div className="input-group-addon">
                            <b>Size</b>
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            value={opts.nameSize}
                            onChange={(e) =>
                              setOpts((o) => ({
                                ...o,
                                nameSize: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </td>
                      <td>
                        <div className="checkbox">
                          <label>
                            <input
                              type="checkbox"
                              checked={opts.variations}
                              onChange={(e) =>
                                setOpts((o) => ({
                                  ...o,
                                  variations: e.target.checked,
                                }))
                              }
                            />{" "}
                            <b>Product Variation</b>
                          </label>
                        </div>
                        <div className="input-group">
                          <div className="input-group-addon">
                            <b>Size</b>
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            value={opts.variationsSize}
                            onChange={(e) =>
                              setOpts((o) => ({
                                ...o,
                                variationsSize: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </td>
                      <td>
                        <div className="checkbox">
                          <label>
                            <input
                              type="checkbox"
                              checked={opts.price}
                              onChange={(e) =>
                                setOpts((o) => ({
                                  ...o,
                                  price: e.target.checked,
                                }))
                              }
                            />{" "}
                            <b>Product Price</b>
                          </label>
                        </div>
                        <div className="input-group">
                          <div className="input-group-addon">
                            <b>Size</b>
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            value={opts.priceSize}
                            onChange={(e) =>
                              setOpts((o) => ({
                                ...o,
                                priceSize: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </td>
                      <td>
                        <div className="form-group" id="price_type_div">
                          <label htmlFor="price_type">Show Price:</label>
                          <div className="input-group">
                            <span className="input-group-addon">
                              <i className="fa fa-info" aria-hidden />
                            </span>
                            <select
                              id="price_type"
                              className="form-control"
                              value={opts.priceType}
                              onChange={(e) =>
                                setOpts((o) => ({
                                  ...o,
                                  priceType: e.target.value as
                                    | "inclusive"
                                    | "exclusive",
                                }))
                              }
                            >
                              <option value="inclusive">Inc. of tax</option>
                              <option value="exclusive">Exc. of tax</option>
                            </select>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="checkbox">
                          <label>
                            <input
                              type="checkbox"
                              checked={opts.sku}
                              onChange={(e) =>
                                setOpts((o) => ({
                                  ...o,
                                  sku: e.target.checked,
                                }))
                              }
                            />{" "}
                            <b>SKU</b>
                          </label>
                        </div>
                        <div className="input-group">
                          <div className="input-group-addon">
                            <b>Size</b>
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            value={opts.skuSize}
                            onChange={(e) =>
                              setOpts((o) => ({
                                ...o,
                                skuSize: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-sm-12">
              <hr />
            </div>

            <div className="col-sm-4">
              <div className="form-group">
                <label htmlFor="barcode_setting">Barcode setting:</label>
                <div className="input-group">
                  <span className="input-group-addon">
                    <i className="fa fa-cog" aria-hidden />
                  </span>
                  <select
                    id="barcode_setting"
                    className="form-control"
                    value={barcodeSetting}
                    onChange={(e) => setBarcodeSetting(e.target.value)}
                  >
                    <option value="continuous">Continuous</option>
                    <option value="20_labels">20 Labels per Sheet</option>
                    <option value="30_labels">30 Labels per Sheet</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="clearfix" />

            <div className="col-sm-12 text-center">
              <button
                type="button"
                id="labels_preview"
                className="tw-dw-btn tw-dw-btn-primary tw-dw-btn-lg tw-text-white"
                onClick={handlePreview}
              >
                Preview
              </button>
            </div>
          </div>
        </div>

        {previewOpen ? (
          <div className="col-sm-8 display_label_div">
            <h3 className="box-title">Preview</h3>
            <button
              type="button"
              className="col-sm-offset-2 btn btn-success btn-block"
              id="print_label"
              onClick={() => window.print()}
            >
              Print
            </button>
          </div>
        ) : null}
        <div className="clearfix" />
      </section>

      {previewOpen ? (
        <div id="preview_box" className="hq6-label-preview">
          {previewLabels.map((row, idx) => (
            <div key={`${row.item.id}-${idx}`} className="hq6-label-card">
              {opts.name ? (
                <p style={{ fontSize: `${opts.nameSize}px`, margin: 0 }}>
                  <b>{row.item.name}</b>
                </p>
              ) : null}
              {opts.sku ? (
                <p
                  style={{
                    fontSize: `${opts.skuSize}px`,
                    margin: "4px 0",
                    fontFamily: "monospace",
                    letterSpacing: "0.12em",
                  }}
                >
                  {row.item.sku}
                </p>
              ) : null}
              {opts.price ? (
                <p style={{ fontSize: `${opts.priceSize}px`, margin: 0 }}>
                  {formatCurrency(
                    row.item.sellPrice ?? 0,
                    row.item.currency,
                  )}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <p className="hq6-footer no-print">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()}{" "}
        All rights reserved.
      </p>
    </div>
  );
}
