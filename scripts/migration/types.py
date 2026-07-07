"""Shared migration types."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class TableData:
    name: str
    columns: list[str] = field(default_factory=list)
    rows: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class TransformResult:
    items: list[dict[str, Any]] = field(default_factory=list)
    customers: list[dict[str, Any]] = field(default_factory=list)
    suppliers: list[dict[str, Any]] = field(default_factory=list)
    sales: list[dict[str, Any]] = field(default_factory=list)
    sale_lines: list[dict[str, Any]] = field(default_factory=list)
    stock_movements: list[dict[str, Any]] = field(default_factory=list)
    jobs: list[dict[str, Any]] = field(default_factory=list)
    job_materials: list[dict[str, Any]] = field(default_factory=list)
    job_labours: list[dict[str, Any]] = field(default_factory=list)
    ledger_entries: list[dict[str, Any]] = field(default_factory=list)
    payment_accounts: list[dict[str, Any]] = field(default_factory=list)
    account_transactions: list[dict[str, Any]] = field(default_factory=list)
    payments: list[dict[str, Any]] = field(default_factory=list)
    product_categories: list[dict[str, Any]] = field(default_factory=list)
    brands: list[dict[str, Any]] = field(default_factory=list)
    product_units: list[dict[str, Any]] = field(default_factory=list)
    warranties: list[dict[str, Any]] = field(default_factory=list)
    selling_price_groups: list[dict[str, Any]] = field(default_factory=list)
    invoice_layouts: list[dict[str, Any]] = field(default_factory=list)
    invoice_schemes: list[dict[str, Any]] = field(default_factory=list)
    expense_categories: list[dict[str, Any]] = field(default_factory=list)
    expenses: list[dict[str, Any]] = field(default_factory=list)
    payroll_groups: list[dict[str, Any]] = field(default_factory=list)
    pay_components: list[dict[str, Any]] = field(default_factory=list)
    payrolls: list[dict[str, Any]] = field(default_factory=list)
    legacy_ids: list[dict[str, Any]] = field(default_factory=list)
    audit_logs: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def merge(self, other: TransformResult) -> None:
        self.items.extend(other.items)
        self.customers.extend(other.customers)
        self.suppliers.extend(other.suppliers)
        self.sales.extend(other.sales)
        self.sale_lines.extend(other.sale_lines)
        self.stock_movements.extend(other.stock_movements)
        self.jobs.extend(other.jobs)
        self.job_materials.extend(other.job_materials)
        self.job_labours.extend(other.job_labours)
        self.ledger_entries.extend(other.ledger_entries)
        self.payment_accounts.extend(other.payment_accounts)
        self.account_transactions.extend(other.account_transactions)
        self.payments.extend(other.payments)
        self.product_categories.extend(other.product_categories)
        self.brands.extend(other.brands)
        self.product_units.extend(other.product_units)
        self.warranties.extend(other.warranties)
        self.selling_price_groups.extend(other.selling_price_groups)
        self.invoice_layouts.extend(other.invoice_layouts)
        self.invoice_schemes.extend(other.invoice_schemes)
        self.expense_categories.extend(other.expense_categories)
        self.expenses.extend(other.expenses)
        self.payroll_groups.extend(other.payroll_groups)
        self.pay_components.extend(other.pay_components)
        self.payrolls.extend(other.payrolls)
        self.legacy_ids.extend(other.legacy_ids)
        self.audit_logs.extend(other.audit_logs)
        self.warnings.extend(other.warnings)

    def counts(self) -> dict[str, int]:
        return {
            "items": len(self.items),
            "customers": len(self.customers),
            "suppliers": len(self.suppliers),
            "sales": len(self.sales),
            "saleLines": len(self.sale_lines),
            "stockMovements": len(self.stock_movements),
            "jobs": len(self.jobs),
            "jobMaterials": len(self.job_materials),
            "jobLabours": len(self.job_labours),
            "ledgerEntries": len(self.ledger_entries),
            "paymentAccounts": len(self.payment_accounts),
            "accountTransactions": len(self.account_transactions),
            "payments": len(self.payments),
            "productCategories": len(self.product_categories),
            "brands": len(self.brands),
            "productUnits": len(self.product_units),
            "warranties": len(self.warranties),
            "sellingPriceGroups": len(self.selling_price_groups),
            "invoiceLayouts": len(self.invoice_layouts),
            "invoiceSchemes": len(self.invoice_schemes),
            "expenseCategories": len(self.expense_categories),
            "expenses": len(self.expenses),
            "payrollGroups": len(self.payroll_groups),
            "payComponents": len(self.pay_components),
            "payrolls": len(self.payrolls),
            "legacyIdRows": len(self.legacy_ids),
            "auditLogs": len(self.audit_logs),
        }
