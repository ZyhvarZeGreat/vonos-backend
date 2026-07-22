"use client";

import { Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";

export function Hq6PrintModal({
  open,
  onClose,
  onPrint,
  title = "Print",
  description = "Print the current table view using your browser print dialog.",
}: {
  open: boolean;
  onClose: () => void;
  onPrint?: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <Hq6ModalSaveClose
          onClose={onClose}
          onSave={() => {
            onPrint?.();
            window.print();
            onClose();
          }}
          saveLabel="Print"
        />
      }
    >
      <p className="text-sm text-[#4b5563]">{description}</p>
    </Hq6Modal>
  );
}
