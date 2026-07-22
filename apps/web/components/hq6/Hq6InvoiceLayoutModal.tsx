"use client";

import { useEffect, useState } from "react";
import type { InvoiceLayout, InvoiceLayoutDesign } from "@vonos/types";
import { cn } from "@/lib/utils/cn";
import { Hq6Modal, Hq6Field, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import { looksLikeHtml, stripHtmlToText } from "@/lib/utils/stripHtml";

export interface InvoiceLayoutFormValues {
  name: string;
  design: InvoiceLayoutDesign;
  headerText: string;
  footerText: string;
  termsText: string;
  isDefault: boolean;
}

const DESIGNS: { value: InvoiceLayoutDesign; label: string; hint: string }[] = [
  {
    value: "classic",
    label: "Classic",
    hint: "Full header, standard table",
  },
  {
    value: "elegant",
    label: "Elegant",
    hint: "HQ6 elegant print style",
  },
  {
    value: "slim",
    label: "Slim",
    hint: "Compact receipt-style",
  },
  {
    value: "detailed",
    label: "Detailed",
    hint: "Extra meta + terms block",
  },
];

export function Hq6InvoiceLayoutModal({
  open,
  onClose,
  mode,
  initial,
  onSave,
  saving = false,
}: {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initial?: InvoiceLayout | null;
  onSave: (values: InvoiceLayoutFormValues) => void | Promise<void>;
  saving?: boolean;
}) {
  const [name, setName] = useState("");
  const [design, setDesign] = useState<InvoiceLayoutDesign>("classic");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [termsText, setTermsText] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      const d = initial.design.toLowerCase();
      setDesign(
        d === "slim" || d === "detailed" || d === "classic" || d === "elegant"
          ? d
          : "classic",
      );
      // Migrated UPOS layouts store rich HTML — edit as plain text.
      setHeaderText(
        looksLikeHtml(initial.headerText)
          ? stripHtmlToText(initial.headerText)
          : (initial.headerText ?? ""),
      );
      setFooterText(
        looksLikeHtml(initial.footerText)
          ? stripHtmlToText(initial.footerText)
          : (initial.footerText ?? ""),
      );
      setTermsText(
        looksLikeHtml(initial.termsText)
          ? stripHtmlToText(initial.termsText)
          : (initial.termsText ?? ""),
      );
      setIsDefault(initial.isDefault);
    } else {
      setName("");
      setDesign("classic");
      setHeaderText("");
      setFooterText("");
      setTermsText("");
      setIsDefault(false);
    }
  }, [open, initial]);

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add invoice layout" : "Edit invoice layout"}
      size="lg"
      footer={
        <Hq6ModalSaveClose
          onClose={onClose}
          saving={saving}
          saveDisabled={!name.trim()}
          onSave={() => {
            if (!name.trim()) return;
            void onSave({
              name: name.trim(),
              design,
              headerText: headerText.trim(),
              footerText: footerText.trim(),
              termsText: termsText.trim(),
              isDefault,
            });
          }}
        />
      }
    >
      <div className="space-y-4">
        <Hq6Field label="Name" required>
          <input
            className="hq6-modal-input"
            placeholder="e.g. Classic, Slim, Workshop"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Hq6Field>

        <Hq6Field label="Design style" required>
          <div className="grid gap-2 sm:grid-cols-2">
            {DESIGNS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDesign(option.value)}
                className={cn(
                  "rounded-md border-2 px-3 py-3 text-left transition-colors",
                  design === option.value
                    ? "border-[var(--hq6-purple)] bg-[#eeedf7]"
                    : "border-[#e5e7eb] bg-white hover:border-[var(--hq6-purple)]",
                )}
              >
                <span className="block text-sm font-bold text-[#111827]">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs text-[#6b7280]">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        </Hq6Field>

        <Hq6Field label="Header text">
          <textarea
            className="hq6-modal-input min-h-[72px]"
            placeholder="Shown at the top of printed invoices"
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value)}
          />
        </Hq6Field>

        <Hq6Field label="Footer text">
          <textarea
            className="hq6-modal-input min-h-[72px]"
            placeholder="Shown at the bottom (e.g. thank you message)"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
          />
        </Hq6Field>

        <Hq6Field label="Terms & conditions">
          <textarea
            className="hq6-modal-input min-h-[96px]"
            placeholder="Payment terms, warranty notes, etc."
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
          />
        </Hq6Field>

        <label className="flex items-center gap-2 text-sm text-[#374151]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[#d1d5db]"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Set as default layout
        </label>
      </div>
    </Hq6Modal>
  );
}
