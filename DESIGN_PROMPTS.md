# DESIGN_PROMPTS.md — Page-by-Page Design Briefs

Detailed creative/design prompts for each distinct page across the Vonos
platform. Use these as briefs for a designer, or as prompts for AI design
tools. Each prompt assumes the shared design system (Sidebar, Top Bar, Panel
style, Status Pill, accent color per tenant) as the base — and calls out
where a page should deviate visually.

Shared baseline (applies unless a prompt says otherwise): left sidebar with
collapsible nav grouped under "Analytics"/"Config" headers, top bar with
page title, search (⌘K), notification bell, and a primary action button on
the right. All cards/panels use a consistent rounded-corner, bordered,
padded container style. Accent color and icon set vary per tenant (see
Section "Accent & Icon Reference" at the end).

---

## WAREHOUSE (VW) — Accent: Blue

### VW — Overview
Design a warehouse operations dashboard with a calm, data-dense but
uncluttered feel — think "mission control for inventory." At the top, four
KPI cards in a horizontal row: Total SKU (large number with a small upward
trend arrow and "+12 this week" in green), Today Inbound (downward arrow
icon, blue accent), Today Outbound (upward arrow icon), and Stock Value
(large currency figure with a percentage change). Each card has a small
colored icon badge in its top-left corner inside a soft rounded square.

Below the KPI row, a two-column layout: left side shows a "Stock Level
Trend" panel — a stacked/grouped bar chart spanning 10-11 days, with 4-5
product series in varying shades of blue, a "Last 30 days" dropdown filter
in the panel's top-right corner, and a legend with colored dots beneath the
chart. Right side mirrors this with an "Inbound vs Outbound" panel — a
smooth dual-line chart (red for inbound, blue for outbound) with crossing
wave patterns suggesting daily fluctuation.

Below that, another two-column row: left is a "Pending Orders" panel with
tab navigation (Outbound / Inbound / Transfers) and a table of order
references, descriptions, dates, carrier, and a green "Ready" status pill on
each row. Right is an "Activity Feed" panel — a vertical list of recent
events, each with a small icon in a blue rounded square, a bold title (e.g.
"Received PO#2041 — 120 units"), a subtitle with the actor's name and
context, and a timestamp aligned to the right.

### VW — Inventory (List)
A clean data table view filling most of the page width. Top bar includes a
search input, a filter bar beneath it with dropdowns for Category and Stock
Status (rendered as colored pills: green "In Stock," amber "Low Stock," red
"Out of Stock"), and a "New Item" button in blue on the top right. The table
has columns: a small product thumbnail/icon, SKU code in monospace font,
Item Name, Category tag, Quantity (right-aligned number), Bin Location
(small badge-style text), Reorder Point, Status pill, and Value. Alternate
row shading is subtle. Pagination controls sit at the bottom center —
previous/next arrows with page numbers.

### VW — Item Detail
A two-column detail layout. Left column (roughly 60% width) starts with a
header block: item name as a large heading, SKU and category as smaller
metadata beneath it, and a small product image/icon in a rounded square to
the left of the text. Below the header, stacked panel sections: "Stock
Info" (quantity on hand, bin location, reorder point displayed as labeled
stat blocks in a 3-column grid), "Pricing" (cost price, retail price if
applicable, currency), and "Movement History" — a compact table of
date/type/quantity-change/reference, with small up/down arrow icons colored
green/red for inbound/outbound movements.

Right column (40% width) contains a "Supplier Info" panel (supplier name,
contact, last order date, with a small avatar/logo placeholder) and an
"Activity" panel — a vertical timeline of changes to this specific item
(stock adjustments, who made them, when), using the same activity feed style
as the Overview page but scoped to this item.

### VW — Inbound / Outbound / Transfers (List)
Same structural layout as Inventory's list, but the table columns shift to:
Date, Reference Number (monospace), Supplier/Destination/Zone (depending on
which page), Item count + total quantity, and a Status pill using the
"movementStatus" vocabulary (Pending = grey, Approved = blue, Received/
Shipped/Delivered = green). Add a small icon column on the left of each row
— a downward arrow for Inbound, upward for Outbound, and a bidirectional
arrow for Transfers — giving each list a distinct "directionality" feel
even though the layout is identical.

### VW — Inbound / Outbound / Transfer Detail
A single-column, narrower detail layout (max-width centered, like an
invoice). Header shows the reference number large and bold, with the status
pill beside it and the date below. A line-item table follows — item name,
SKU, quantity, and (for outbound) destination — styled like a packing
slip/invoice table with a subtle bottom border on each row and a bold total
row at the bottom. Below the table, a small "Logged by" block with an avatar
and timestamp, and an action button area (e.g. "Mark as Received" /
"Mark as Shipped") styled as a prominent button matching the page's
applicable next-status action.

### VW — Suppliers (List + Detail)
List: same table layout as Inventory but columns are Supplier Name (with
small logo/avatar circle), Contact info (email/phone stacked in one cell),
Items Supplied (count badge), and Last Order Date.
Detail: a profile-style header — large supplier name, logo/avatar, contact
details in a horizontal row of icon+text pairs (phone, email, address).
Below, an "Order History" table (same style as Movement History) showing
past inbound shipments from this supplier.

### VW — Reports
A page dominated by Chart Panels, no KPI row. Top bar has a date-range
picker (styled as a pill-shaped dropdown showing "Jun 1 - Jun 14, 2026")
and an "Export" button (icon + label) in the top-right. Below, a tab strip:
"Stock Valuation," "Movement Summary," "Low Stock Report." Each tab shows a
full-width chart panel (valuation = area chart over time; movement summary =
grouped bar chart of in/out volumes; low stock = a table of items below
reorder point with their status pills, sorted by urgency). Charts use the
tenant's accent color as the primary series color.

### VW — Finance
KPI row at top: Revenue, Costs, Net, Outstanding — each card same style as
Overview's KPI cards but with currency values and the Net card showing
green/red text depending on sign. Below, a horizontal tab strip: "Overview,"
"Ledger," "P&L Analysis," "Expenses" — styled as underlined tabs, active tab
in the accent color.
- Overview tab: a single large area chart showing revenue vs cost over the
  selected period, with a small summary stat block to its right.
- Ledger tab: full-width data table — Date, Type (small colored dot:
  green=revenue, red=cost, grey=expense), Description, Linked Record
  (clickable blue link text), Category tag, Amount (right-aligned,
  color-coded by type).
- P&L Analysis tab: two side-by-side panels — a line chart (revenue vs cost
  trend) and a horizontal bar chart (category breakdown, sorted largest to
  smallest).
- Expenses tab: a data table of manual entries plus an "Add Expense" button
  (top right) that opens a small modal with amount, category dropdown, date
  picker, description field, and an optional file-attach drop zone.
Export button persists in the top bar across all tabs.

### VW — Users
A data table (Name with avatar, Email, Role as a colored tag, Status pill
"Active"/"Invited"/"Suspended") with an "Invite User" button top-right that
opens a modal: email input, role dropdown, optional name field, send
button.

### VW — Settings
A tabbed form layout: "General" (entity name, logo upload, accent color
swatch picker), "Terminology" (a list of label-override fields — e.g.
"Items label" with current value "Inventory" editable), "Notifications"
(toggle switches for various alert types). Each tab is a vertically stacked
form with labeled input groups, save button fixed at the bottom right.

---

## KIDS WEAR (VKW) — Accent: Amber/Yellow

### VKW — Overview
Same dashboard skeleton as Warehouse, but the hero chart panel (left side)
shows a **stock heatmap** instead of a bar chart — a grid where rows are
product categories and columns are size ranges (XS-XL), each cell shaded
amber-to-dark-amber based on stock quantity, giving an immediate "what's
running low across the size range" visual. The right chart panel remains an
Inbound vs Outbound line chart, in amber/warm tones. KPI cards: Total SKU,
Sales Today, Returns Today, Stock Value.

### VKW — Inventory (List)
Same table structure as Warehouse Inventory, but add a "Collections" filter
pill row above the table (e.g. "Summer 2026," "Back to School" as toggleable
tag chips in amber outline style). Thumbnails are more prominent (slightly
larger product images) since apparel is visual.

### VKW — Item Detail (with Variant Matrix)
Same two-column layout as Warehouse Item Detail, but insert a new section
between "Stock Info" and "Pricing" called **"Size & Color Matrix"** — a grid
table where rows are colors (with a small color-swatch circle) and columns
are sizes (XS, S, M, L, XL), each cell containing a stock quantity number.
Cells with low stock (below a threshold) get a subtle amber background tint;
out-of-stock cells get a light red tint with the number greyed out. This
matrix section visually anchors the page and is the most distinct element
from Warehouse's Item Detail.

---

## SPARE SHOP (VSS) — Accent: Teal

### VSS — Overview
Dashboard skeleton, but the left hero panel is a large single "Revenue
Today" area chart (teal gradient fill) spanning the full left column, with a
big revenue number overlaid at the top of the chart. The right panel is a
"Top Selling Items" ranked list — horizontal bar-style rows where bar length
represents units sold, item name and unit count to the right of each bar.
KPI row: Sales Today, Returns Today, Low Stock Items, Revenue Today.

### VSS — Sales/Transactions (List)
Table columns: Date/Time, Transaction ID (monospace), Customer name (or
"Walk-in"), Item count + summary, Total amount (bold, right-aligned), and a
`saleReturnStatus` pill (green "Completed," amber "Refunded," teal
"Restocked," red "Written Off"). A small payment-method icon (cash/card)
appears as a column too.

### VSS — Sale Detail
Receipt-style centered narrow layout — header shows transaction ID and
date/time, customer name if available. Below, a line-item table (item, qty,
unit price, line total) with a bold total row, tax/discount lines if
applicable. Bottom section shows payment method and a "Process Return"
button (only visible if status is "Completed") that would lead into the
Returns flow.

### VSS — Catalog (List)
Same table as Inventory but with a visual note: a small badge on each row
reading "Synced from Warehouse" in muted grey text, and the table is
slightly more read-only in feel — no "New Item" button, instead a "Pricing
Rules" link/button top-right that opens the markup-percentage settings.

### VSS — Returns & Warranty (List + Detail)
List: table with Original Sale ID (link), Item(s), Reason (truncated text),
Refund Amount, and status pill (saleReturnStatus vocabulary).
Detail: shows the original sale info at top (linked/summarized), the
returned item(s) in a table, a reason text block, and two prominent action
buttons side by side: "Restock Item" (teal, returns item to Warehouse stock)
and "Write Off" (red outline, item doesn't return to stock) — these are
mutually exclusive actions, visually presented as a choice.

### VSS — Customers (Profile)
Same Profile layout pattern as other entities — header with customer name,
contact info, and a "Customer Since" date. Below, a `historyFeed` section:
chronological list of past purchases (date, items, amount), each entry
clickable to that Sale Detail.

---

## CAFE (VC) — Accent: Terracotta/Orange

### VC — Overview
Dashboard skeleton with a "live operations" feel — the hero left panel shows
a real-time "Orders Today" bar chart broken down by hour (e.g. 8am-10pm on
the x-axis, order count per hour as orange bars), giving a sense of daily
rhythm/rush hours. Right panel: a small horizontal "Table Status" summary —
a row of colored dots/counts (e.g. "12 Available, 5 Occupied, 2 Reserved")
with a "View Tables" link. KPI row: Orders Today, Tables Occupied, Low Stock
Items, Revenue Today.

### VC — Orders (List)
Table columns: Order #, Table/Takeaway badge, Items (truncated list, e.g.
"2x Jollof, 1x Chicken +2 more"), Total, and `orderStatus` pill (grey "New,"
blue "Preparing," amber "Ready," green "Served"). Orders that have been
"Ready" for over a threshold time get a subtle pulsing/highlighted left
border in orange to draw attention.

### VC — Order Detail (with Modifier Editor)
Header: Order # and table number, large `orderStatus` pill, and a
prominent "Advance Status" button (context-labeled: "Start Preparing" /
"Mark Ready" / "Mark Served"). Below, the line items each shown as a card
(not a plain table row) — item name, base price, and beneath it a nested
list of selected modifiers (e.g. "Size: Large (+₦500)", "Extra Cheese
(+₦300)") in smaller indented text with their price deltas. This nested
modifier display is the visually distinct element — each order item "card"
expands to show its modifier breakdown like a small receipt-within-a-card.

### VC — Menu Items (List + Detail with Modifier Editor)
List: grid of menu item cards (not a table) — each card shows a food photo
placeholder, item name, category tag, and price, in a 3-4 column responsive
grid (more visual/Pinterest-like than other inventory lists, fitting a menu
browsing feel).
Detail: top section is standard item info (name, category, price, photo).
Below, a **Modifier Groups editor** — each modifier group is its own
collapsible panel (e.g. "Size," "Add-ons," "Spice Level") containing a list
of options, each with a name field and a price-delta field (+₦X), plus an
"Add Option" button per group and an "Add Modifier Group" button at the
bottom. This editor has a distinctly more "form builder" visual feel than
any other page in the system.

### VC — Kitchen Display (Kanban)
Full-width kanban board, no sidebar-style table at all. Four columns: "New,"
"Preparing," "Ready," "Served" — each column header shows the status name
and a count badge. Cards within columns are large and bold — order number,
table number in a big badge, and a simple list of items (item name + qty,
no prices, since this is operational not financial). Cards in "New" have a
subtle orange left-edge accent; cards that have been in a column too long
get a red pulsing border. This page should feel like a different
application entirely — large touch-friendly cards, minimal text, designed
to be glanced at from across a kitchen.

### VC — Table Management
A grid of table cards (not a literal floor plan) — each card represents one
table, showing the table number large in the center, and the card's
background color indicates status: green = Available, orange = Occupied
(with a small "Order #1234" label and elapsed time), grey/blue = Reserved
(with reservation time). Cards are arranged in a responsive grid, roughly
square aspect ratio, larger than typical list items — meant to be scanned
at a glance like a seating chart.

### VC — Reports (with Daily Closeout tab)
Standard Reports layout (tabs + chart panels) with an added "Daily Closeout"
tab — this tab shows a summary card: expected sales total (from orders) vs
actual cash counted (an input field for end-of-day reconciliation), with the
difference highlighted in green (matches) or red (discrepancy). Below, a
history table of past closeouts by date.

---

## MECH SHOP (VMS) — Accent: Slate/Steel Blue

### VMS — Overview
Dashboard skeleton where the left hero panel is a **job status distribution**
chart — a horizontal stacked bar or donut chart showing the proportion of
jobs in each stage (Received, Quoted, Approved, In Progress, QC, Delivered),
each segment colored per the jobStatus vocabulary. Right panel: "Jobs Due
Soon" — a table of job reference, customer, due date (with overdue dates
shown in red text), and status pill. KPI row: Active Jobs, Completed Today,
Pending QC, Revenue (This Week).

### VMS — Jobs (List)
Table columns: Job Reference (monospace, e.g. "VMS-0042"), Customer,
Description (truncated), Assigned Staff (small avatar stack — overlapping
circles for multiple staff), Due Date, and `jobStatus` pill. Jobs with
`hasQuote: false` show a small "—" in a "Quote" column; jobs with a quote
show the amount.

### VMS — Job Detail (centerpiece page)
This is the most structurally unique page in the system:

Header row: Job reference as a large heading, customer name beneath it,
due date and a large context-aware primary action button on the right
(e.g. "Mark Approved" in the accent color).

Below the header, the **adaptive Status Stepper** — a horizontal row of
circles connected by lines, each circle representing a stage the *applicable
stages for this specific job* (5 circles if no quote, 6 if quoted). Completed
stages show a filled circle with a checkmark, the current stage is a larger
highlighted circle in the accent color, future stages are empty outlined
circles. Stage labels sit below each circle.

Below the stepper, a two-column section layout:
- Left column: "Job Description" panel (free text + any attached
  reference images shown as small thumbnails in a row), and "Materials Used"
  panel — a table of material name, quantity, unit cost, total cost, with a
  running subtotal at the bottom and an "Add Material" button (which would
  open the requisition flow, deferred).
- Right column: "Labour Log" panel — a table of staff member (avatar+name),
  hours, rate, total cost, with subtotal; and below it a "Cost Summary"
  panel — a simple two-line breakdown (Materials subtotal, Labour subtotal)
  leading to a bold "Total Cost" line, and if `hasQuote`, a comparison row
  showing "Quoted: ₦X" vs "Actual: ₦Y" with the variance highlighted
  green (under budget) or red (over budget).

If the job has reached the QC stage, an additional full-width "Quality
Control" panel appears below the two columns — a checklist UI (checkbox
items with labels like "Welds inspected," "Finish quality checked") plus a
notes textarea and a QC staff sign-off field (name + timestamp once
completed).

At the very bottom, an "Activity/Timeline" feed — same visual pattern as
Overview's activity feed, but scoped to this job's status changes and
material/labour additions.

A "Generate Quote PDF" button appears in the top bar's action area when
`hasQuote` is true, styled as a secondary (outline) button beside the
primary status-advance button.

### VMS — Material Requisition (List + Detail)
List: table of Item requested, Quantity, Linked Job (clickable reference),
Requesting status (`movementStatus`-style pill: Pending/Approved/Fulfilled/
Rejected). Detail: shows the request details, the linked job summary at top
(small card with job reference + customer), and action buttons for
Approve/Reject/Fulfill (visible based on role — this page is deferred for
full connective logic but the visual shell can exist).

---

## MECHANICS (VM) — Accent: Amber/Orange (automotive feel)

### VM — Overview
Same job-status-distribution hero as Mech Shop, but the right panel is
"Vehicles In Shop" — a table of vehicle plate/VIN, make/model, current job
status pill, and technician assigned. KPI row: Open Job Cards, Vehicles
In-Shop, Parts Pending, Today's Revenue.

### VM — Jobs (List + Detail)
Same as Mech Shop's Job List/Detail structure, with one addition: the Job
Detail header includes a small "Vehicle" card/chip showing plate number and
make/model, clickable to navigate to that Vehicle's Profile page.

### VM — Vehicle Registry (Profile)
Header: vehicle plate number as the large heading, make/model/year as
subtitle, owner name and contact below that, and a small "Warranty Status"
badge (green "Active," grey "Expired," amber "Expiring Soon — 2 weeks") in
the top-right of the header block.

Below, a `historyFeed` section — a vertical timeline of all past jobs for
this vehicle, each entry showing date, job reference (clickable), brief
description, and the final cost — visually similar to Activity Feed but each
entry is more substantial (card-like with a left border colored by job
outcome).

A small "Service Reminders" panel sits alongside the header (or just below
it) — a short list of upcoming/overdue maintenance items with due
dates/mileage, each with a status indicator (overdue = red, upcoming =
amber).

---

## SALOON (VS) — Accent: Pink/Magenta

### VS — Overview
This Overview deviates most from the standard skeleton. KPI row: Today's
Appointments, Available Slots, No-shows (this week), Revenue. Below, instead
of two chart panels, a **full-width "Today's Schedule" timeline** — a
horizontal timeline with hour markers (9am-6pm) across the top, and one row
per stylist down the left side; appointment blocks are colored rectangles
placed within this grid according to their time slot, colored by
`appointmentStatus` (blue=confirmed, green=in progress/completed, red=
no-show/cancelled, grey=booked). This is the dashboard's visual centerpiece
and should feel like a calendar/scheduling tool, not a chart dashboard.

Below the timeline, a standard two-column row: "Upcoming Appointments" table
(left) and "Activity Feed" (right).

### VS — Appointments (Calendar mode)
A full week or day calendar view — columns are stylists (with their
avatar+name as column headers), rows are time slots (e.g. 30-min
increments), and appointment blocks span their duration within a column,
colored by status and showing customer name + service name inside the
block. A toggle in the top bar switches between Day/Week view. Clicking a
block opens Appointment Detail; clicking an empty slot opens a "New
Appointment" creation flow (Detail Template in create mode).

### VS — Appointment Detail
A focused single-column card: customer name + avatar at top, service(s)
booked listed below with individual durations/prices and a total, stylist
assigned (avatar+name), date/time, and `appointmentStatus` pill. Action
buttons at the bottom: "Confirm," "Mark Completed," "Mark No-show," "Cancel"
— styled as a button group where only the contextually-relevant actions are
enabled/visible based on current status.

### VS — Customers (Profile)
Header: customer name, contact info, "Customer Since" date, and a **Loyalty
Points** badge showing current point balance prominently (e.g. a circular
badge with the number, in the pink accent color). Below, a "Preferences"
panel — short text tags/notes (e.g. "Prefers Stylist: Ada," "Allergic to:
Sulfates") shown as small pill-style tags. Then a `historyFeed` of past
appointments, each entry showing date, service, stylist, and amount paid —
clickable to that Appointment Detail.

### VS — Services (List + Detail)
List: table of Service Name, Category, Duration (e.g. "45 min"), Price, and
a small color-swatch indicating how this service's appointment blocks will
appear on the calendar.
Detail: simple form-style page — name, category, duration, price, and the
color picker for calendar representation.

### VS — Stylist Schedule
A form/settings-style page — one row per stylist (avatar+name), with a
weekly grid of toggleable availability blocks (days × time ranges) styled
as a simplified version of the Appointments calendar but for setting
availability rather than viewing bookings. Toggled "available" cells are
filled in pink; unavailable cells are empty/grey.

---

## VAG (Admin) — Accent: Neutral Dark (Charcoal)

### VAG — Group Overview
The page opens with a full-width row of **8 condensed entity cards** in a
responsive grid (4 columns × 2 rows, or similar) — each card uses that
entity's own accent color as a left-edge stripe or icon background, shows
the entity name + code, 2-3 condensed stat values (e.g. "Revenue: ₦X,
Active Jobs: Y"), and an "Enter →" button/link in the bottom-right of the
card. This grid is the visual signature of the VAG Overview — a
"mission control for all businesses" feel, each card hinting at its
entity's accent color so VAG visually recognizes "this is the Cafe card,
this is the Saloon card" at a glance.

Below the grid, group-level charts: a "Group Revenue Trend" line chart with
one line per entity (each in that entity's accent color, creating a
multi-colored comparison chart) and a "Entity Comparison" horizontal bar
chart ranking entities by a selected metric (revenue, job count, etc., via a
dropdown).

### VAG — Entity Switcher + "Viewing as Admin" banner
When VAG enters an entity, a full-width banner appears immediately below the
Top Bar — charcoal background, white text reading "Viewing: [Entity Name]
(as Admin)" with a small icon, and a "← Back to Group Overview" link on the
right. The rest of the page below this banner renders exactly as that
entity's own staff would see it (using that entity's accent color), creating
a visual "frame within a frame" — charcoal admin chrome wrapping the
entity's own colored interface.

### VAG — Cross-entity Finance
Same 4-tab Finance structure as entity-level Finance pages, but: the Ledger
tab's table includes an additional "Entity" column (with small colored
badges per entity), and the P&L Analysis tab's charts group/stack by entity
(stacked bar chart where each entity is a different colored segment).

---

## Accent & Icon Reference

| Entity | Accent Color | Primary Icons |
|---|---|---|
| VW Warehouse | Blue `#3B82F6` | box, package, warehouse, barcode |
| VKW Kids Wear | Amber `#F59E0B` | shirt, tag, palette, package |
| VSS Spare Shop | Teal `#14B8A6` | shopping-cart, receipt, tag, package |
| VC Cafe | Terracotta `#EA580C` | coffee, utensils, chef-hat, clipboard-list |
| VMS Mech Shop | Slate `#475569` | wrench, settings, clipboard-check, hammer |
| VM Mechanics | Amber/Orange `#D97706` | car, gauge, wrench, file-text |
| VS Saloon | Pink/Magenta `#DB2777` | scissors, calendar, sparkles, heart |
| VAG Admin | Charcoal `#1E293B` | layout-grid, shield, users, bar-chart |

---

## Notes on Implementation

- These prompts describe **target visual states** — every page still maps to
  the 3 templates (Dashboard, List/Detail, Form) per AGENTS.md/FRONTEND.md.
  Visual variance comes from: accent color tokens, icon choices, Chart Panel
  `type`/series configuration, Data Table `displayMode`, and which
  registered section types appear in a given Detail Template instance.
- Pages flagged as "most visually distinct" (Kitchen Display, Table
  Management, Saloon Calendar/Timeline, Job Detail with Stepper, Variant
  Matrix, Modifier Editor) are the ones worth prioritizing for actual design
  mockups first — they're where the "different app" feeling is created for
  the client.
- All other pages (Inventory-type lists, Suppliers, Reports, Finance, Users,
  Settings) can be designed once per template variant and then re-skinned
  per tenant via accent color + config — they do not need individual mockups
  per entity.
