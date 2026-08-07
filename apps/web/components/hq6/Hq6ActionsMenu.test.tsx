import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Hq6ActionsMenu } from "./Hq6ActionsMenu";
import { saleRowActions } from "@/lib/hq6/rowActionCatalog";

describe("Hq6ActionsMenu", () => {
  it("opens the Actions dropdown and fires every catalog item", async () => {
    const user = userEvent.setup();
    const specs = saleRowActions("finalized", { canAddPayment: true });
    const clicks = Object.fromEntries(
      specs.map((spec) => [spec.id, vi.fn()]),
    );

    render(
      <Hq6ActionsMenu
        items={specs.map((spec) => ({
          ...spec,
          onClick: clicks[spec.id]!,
        }))}
      />,
    );

    await user.click(screen.getByRole("button", { name: /actions/i }));
    for (const spec of specs) {
      const item = await screen.findByRole("menuitem", { name: spec.label });
      expect(item).toBeInTheDocument();
    }

    await user.click(screen.getByRole("menuitem", { name: "Add Payment" }));
    expect(clicks.add_payment).toHaveBeenCalledTimes(1);
  });

  it("marks delete as a danger item", async () => {
    const user = userEvent.setup();
    render(
      <Hq6ActionsMenu
        items={[
          { id: "view", label: "View", onClick: () => undefined },
          {
            id: "delete",
            label: "Delete",
            danger: true,
            onClick: () => undefined,
          },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /actions/i }));
    const del = await screen.findByRole("menuitem", { name: "Delete" });
    expect(del.className).toContain("hq6-actions-menu-item-danger");
  });
});
