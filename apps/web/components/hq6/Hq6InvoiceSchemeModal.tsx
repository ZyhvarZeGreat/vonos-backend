"use client";

import { useEffect, useState } from "react";
import type { InvoiceScheme } from "@vonos/types";
import { cn } from "@/lib/utils/cn";
import { Hq6Modal, Hq6Field, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";

export type SchemeFormat = "blank" | "year";

export interface InvoiceSchemeFormValues {
  name: string;
  format: SchemeFormat;
  numberType: "sequential" | "random";
  prefix: string;
  startNumber: number;
  totalDigits: number;
}

export function Hq6InvoiceSchemeModal({
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
  initial?: InvoiceScheme | null;
  onSave: (values: InvoiceSchemeFormValues) => void | Promise<void>;
  saving?: boolean;
}) {
  const year = new Date().getFullYear();
  const [format, setFormat] = useState<SchemeFormat | null>(null);
  const [name, setName] = useState("");
  const [numberType, setNumberType] = useState<"sequential" | "random">(
    "sequential",
  );
  const [prefix, setPrefix] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [totalDigits, setTotalDigits] = useState(4);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const isYear = Boolean(initial.prefix && /^\d{4}-?$/.test(initial.prefix));
      setFormat(isYear ? "year" : "blank");
      setName(initial.name);
      setPrefix(initial.prefix ?? "");
      setStartNumber(initial.startNumber);
      setTotalDigits(initial.totalDigits);
      setNumberType("sequential");
    } else {
      setFormat(null);
      setName("");
      setPrefix("");
      setStartNumber(1);
      setTotalDigits(4);
      setNumberType("sequential");
    }
  }, [open, initial]);

  const preview =
    format === "blank"
      ? "X".repeat(totalDigits)
      : format === "year"
        ? `${year}-${"X".repeat(totalDigits)}`
        : "Not selected";

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add new invoice scheme" : "Edit invoice scheme"}
      size="md"
      footer={
        <Hq6ModalSaveClose
          onClose={onClose}
          saving={saving}
          saveDisabled={!format || !name.trim()}
          onSave={() => {
            if (!format || !name.trim()) return;
            void onSave({
              name: name.trim(),
              format,
              numberType,
              prefix:
                format === "year"
                  ? prefix.trim() || `${year}-`
                  : prefix.trim(),
              startNumber,
              totalDigits,
            });
          }}
        />
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <FormatCard
            selected={format === "blank"}
            label={"FORMAT:\nXXXX"}
            onClick={() => {
              setFormat("blank");
              setPrefix("");
            }}
          />
          <FormatCard
            selected={format === "year"}
            label={`FORMAT:\n${year}-XXXX`}
            onClick={() => {
              setFormat("year");
              setPrefix(`${year}-`);
            }}
          />
          <div className="flex flex-col justify-center text-sm">
            <span className="font-semibold text-[#374151]">Preview:</span>
            <span className="mt-1 text-[#111827]">{preview}</span>
          </div>
        </div>

        <Hq6Field label="Name" required>
          <input
            className="hq6-modal-input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Hq6Field>

        <Hq6Field label="Numbering Type" required>
          <select
            className="hq6-modal-input"
            value={numberType}
            onChange={(e) =>
              setNumberType(e.target.value as "sequential" | "random")
            }
          >
            <option value="sequential">Sequential</option>
            <option value="random">Aleatory/Random</option>
          </select>
        </Hq6Field>

        {format ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Hq6Field label="Prefix">
              <input
                className="hq6-modal-input"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Start from">
              <input
                type="number"
                min={0}
                className="hq6-modal-input"
                value={startNumber}
                onChange={(e) => setStartNumber(Number(e.target.value) || 0)}
              />
            </Hq6Field>
            <Hq6Field label="Number of digits">
              <select
                className="hq6-modal-input"
                value={totalDigits}
                onChange={(e) => setTotalDigits(Number(e.target.value))}
              >
                {[4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Hq6Field>
          </div>
        ) : null}
      </div>
    </Hq6Modal>
  );
}

function FormatCard({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border-2 px-3 py-4 text-left text-sm font-bold leading-snug whitespace-pre-line transition-colors",
        selected
          ? "border-[var(--hq6-purple)] bg-[#eeedf7]"
          : "border-[#c7d2fe] bg-[#eef2ff] hover:border-[var(--hq6-purple)]",
      )}
    >
      {label}
    </button>
  );
}
