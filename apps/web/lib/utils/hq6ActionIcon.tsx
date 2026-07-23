import type { ReactNode } from "react";
import {
  Banknote,
  Barcode,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  FileEdit,
  FileText,
  History,
  Link2,
  ListOrdered,
  Mail,
  Package,
  PackageCheck,
  Pencil,
  PlusCircle,
  Power,
  Printer,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Star,
  Trash2,
  Truck,
  UserX,
  Wallet,
} from "lucide-react";

const ICON_CLASS = "h-3.5 w-3.5";

/** Default lucide icon for common HQ6 / row action ids. */
export function hq6ActionIcon(actionId: string): ReactNode | undefined {
  const id = actionId.toLowerCase().replace(/[\s-]+/g, "_");
  switch (id) {
    case "view":
    case "details":
    case "open":
    case "preview":
    case "view_record":
      return <Eye className={ICON_CLASS} strokeWidth={1.75} />;
    case "edit":
    case "edit_shipping":
    case "update_status":
    case "change_status":
    case "edit_expiry":
    case "fix_stock":
      return <Pencil className={ICON_CLASS} strokeWidth={1.75} />;
    case "delete":
      return <Trash2 className={ICON_CLASS} strokeWidth={1.75} />;
    case "print":
    case "print_invoice":
      return <Printer className={ICON_CLASS} strokeWidth={1.75} />;
    case "labels":
      return <Barcode className={ICON_CLASS} strokeWidth={1.75} />;
    case "duplicate":
    case "copy_quotation":
      return <Copy className={ICON_CLASS} strokeWidth={1.75} />;
    case "pay":
    case "add_payment":
      return <Banknote className={ICON_CLASS} strokeWidth={1.75} />;
    case "view_payments":
    case "edit_payment":
      return <Wallet className={ICON_CLASS} strokeWidth={1.75} />;
    case "ledger":
      return <BookOpen className={ICON_CLASS} strokeWidth={1.75} />;
    case "sales":
      return <ShoppingCart className={ICON_CLASS} strokeWidth={1.75} />;
    case "purchases":
      return <Package className={ICON_CLASS} strokeWidth={1.75} />;
    case "documents":
    case "documents_and_notes":
      return <FileText className={ICON_CLASS} strokeWidth={1.75} />;
    case "deactivate":
    case "activate":
      return <Power className={ICON_CLASS} strokeWidth={1.75} />;
    case "notify":
      return <Mail className={ICON_CLASS} strokeWidth={1.75} />;
    case "convert":
      return <RefreshCw className={ICON_CLASS} strokeWidth={1.75} />;
    case "sell_return":
    case "purchase_return":
      return <RotateCcw className={ICON_CLASS} strokeWidth={1.75} />;
    case "invoice_url":
    case "quote_url":
      return <Link2 className={ICON_CLASS} strokeWidth={1.75} />;
    case "packing_slip":
    case "delivery_note":
      return <Truck className={ICON_CLASS} strokeWidth={1.75} />;
    case "opening_stock":
      return <PlusCircle className={ICON_CLASS} strokeWidth={1.75} />;
    case "stock_history":
    case "stock_report":
      return <History className={ICON_CLASS} strokeWidth={1.75} />;
    case "items_received":
      return <PackageCheck className={ICON_CLASS} strokeWidth={1.75} />;
    case "file_edit":
      return <FileEdit className={ICON_CLASS} strokeWidth={1.75} />;
    case "checklist":
    case "todo":
      return <ClipboardList className={ICON_CLASS} strokeWidth={1.75} />;
    case "list":
      return <ListOrdered className={ICON_CLASS} strokeWidth={1.75} />;
    case "approve":
    case "complete":
      return <CheckCircle2 className={ICON_CLASS} strokeWidth={1.75} />;
    case "default":
      return <Star className={ICON_CLASS} strokeWidth={1.75} />;
    case "suspend":
      return <UserX className={ICON_CLASS} strokeWidth={1.75} />;
    case "book":
      return <BookOpen className={ICON_CLASS} strokeWidth={1.75} />;
    case "transfer":
      return <RefreshCw className={ICON_CLASS} strokeWidth={1.75} />;
    case "deposit":
      return <Banknote className={ICON_CLASS} strokeWidth={1.75} />;
    case "close":
      return <Power className={ICON_CLASS} strokeWidth={1.75} />;
    default:
      return undefined;
  }
}
