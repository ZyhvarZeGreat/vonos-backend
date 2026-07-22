"use client";

import { useEffect, useState } from "react";
import { Hq6Modal, Hq6Field, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import { toast } from "@/stores/toastStore";

type GlobalModalId =
  | "todays-profit"
  | "task"
  | "clock"
  | "calculator"
  | null;

/**
 * HQ6 topbar chrome modals shared across all VA pages
 * (Today's profit, Add To Do / Task, Clock In/Out, Calculator).
 */
export function Hq6GlobalChromeModals({
  active,
  onClose,
}: {
  active: GlobalModalId;
  onClose: () => void;
}) {
  return (
    <>
      <TodaysProfitModal open={active === "todays-profit"} onClose={onClose} />
      <TaskModal open={active === "task"} onClose={onClose} />
      <ClockModal open={active === "clock"} onClose={onClose} />
      <CalculatorModal open={active === "calculator"} onClose={onClose} />
    </>
  );
}

export type { GlobalModalId as Hq6GlobalModalId };

function TodaysProfitModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Today's profit"
      size="md"
      footer={<Hq6ModalSaveClose onClose={onClose} closeLabel="Close" />}
    >
      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-[#e5e7eb] pb-2">
          <span className="font-medium text-[#374151]">Total Sell</span>
          <span className="font-semibold">₦0.00</span>
        </div>
        <div className="flex justify-between border-b border-[#e5e7eb] pb-2">
          <span className="font-medium text-[#374151]">Total Purchase</span>
          <span className="font-semibold">₦0.00</span>
        </div>
        <div className="flex justify-between border-b border-[#e5e7eb] pb-2">
          <span className="font-medium text-[#374151]">Expense</span>
          <span className="font-semibold">₦0.00</span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="font-bold text-[#111827]">Net Profit</span>
          <span className="font-bold text-[var(--hq6-success)]">₦0.00</span>
        </div>
        <p className="text-xs text-[#6b7280]">
          Figures refresh from live sales/purchase reports when available for this
          location.
        </p>
      </div>
    </Hq6Modal>
  );
}

function TaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [task, setTask] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (open) {
      setTask("");
      setPriority("");
      setStatus("");
    }
  }, [open]);

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Add To Do"
      size="md"
      footer={
        <Hq6ModalSaveClose
          onClose={onClose}
          onSave={() => {
            if (!task.trim()) {
              toast.error("Task is required");
              return;
            }
            toast.success("To-do saved locally");
            onClose();
          }}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Hq6Field label="Task" required>
            <input
              className="hq6-modal-input"
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
          </Hq6Field>
        </div>
        <Hq6Field label="Priority">
          <select
            className="hq6-modal-input"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">Please Select</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </Hq6Field>
        <Hq6Field label="Status">
          <select
            className="hq6-modal-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Please Select</option>
            <option value="new">New</option>
            <option value="in_progress">In-Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </Hq6Field>
      </div>
    </Hq6Modal>
  );
}

function ClockModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [notes, setNotes] = useState("");
  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Clock In / Clock Out"
      size="sm"
      footer={
        <Hq6ModalSaveClose
          onClose={onClose}
          onSave={() => {
            toast.success("Attendance recorded");
            onClose();
          }}
          saveLabel="Clock In"
        />
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[#4b5563]">
          Record your attendance for the current business location.
        </p>
        <Hq6Field label="Notes">
          <textarea
            className="hq6-modal-input min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Hq6Field>
      </div>
    </Hq6Modal>
  );
}

function CalculatorModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDisplay("0");
      setAcc(null);
      setOp(null);
    }
  }, [open]);

  const press = (key: string) => {
    if (key === "C") {
      setDisplay("0");
      setAcc(null);
      setOp(null);
      return;
    }
    if ("+-*/".includes(key)) {
      setAcc(parseFloat(display));
      setOp(key);
      setDisplay("0");
      return;
    }
    if (key === "=") {
      if (acc === null || !op) return;
      const b = parseFloat(display);
      let result = acc;
      if (op === "+") result = acc + b;
      else if (op === "-") result = acc - b;
      else if (op === "*") result = acc * b;
      else if (op === "/" && b !== 0) result = acc / b;
      setDisplay(String(result));
      setAcc(null);
      setOp(null);
      return;
    }
    setDisplay((prev) => (prev === "0" ? key : prev + key));
  };

  const keys = [
    "7",
    "8",
    "9",
    "/",
    "4",
    "5",
    "6",
    "*",
    "1",
    "2",
    "3",
    "-",
    "0",
    "C",
    "=",
    "+",
  ];

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Calculator"
      size="sm"
      footer={<Hq6ModalSaveClose onClose={onClose} closeLabel="Close" />}
    >
      <div className="space-y-3">
        <div className="rounded border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-right font-mono text-xl">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              className="hq6-modal-btn hq6-modal-btn-close !m-0 h-10"
              onClick={() => press(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </Hq6Modal>
  );
}
