"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import ShopBusyButton from "@/components/marketing/shop/ShopBusyButton";
import ShopOrderReview from "@/components/marketing/shop/ShopOrderReview";
import { useShopCart } from "@/stores/shopCartStore";
import {
  cartTotal,
  saveOrderToStorage,
  type FulfillmentType,
  type ShopOrder,
} from "@/lib/marketing/shop-catalog";
import { createStoreCheckout } from "@/lib/marketing/store-api";

export default function CheckoutPanel() {
  const router = useRouter();
  const { lines, hydrated, clearCart, resolveLine } = useShopCart();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [city, setCity] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [sameAddress, setSameAddress] = useState(true);
  const [ageConfirmed, setAgeConfirmed] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fulfillment: FulfillmentType = "delivery";

  useEffect(() => {
    if (hydrated && lines.length === 0) {
      router.replace("/shop");
    }
  }, [hydrated, lines.length, router]);

  if (!hydrated || lines.length === 0) {
    return (
      <section className="ve-shop ve-shop-page">
        <div className="container-full">
          <p className="ve-thanks__note">Redirecting to shop…</p>
        </div>
      </section>
    );
  }

  const orderLines = lines
    .map((line) => {
      const resolved = resolveLine(line);
      if (!resolved) return null;
      return {
        productId: line.productId,
        name: resolved.product.name,
        qty: line.qty,
        unitPrice: resolved.product.price,
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);

  const total = cartTotal(lines);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!name || !email.trim() || !phone.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    if (!deliveryAddress.trim() || !city.trim()) {
      setError("Enter a delivery city and address.");
      return;
    }

    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (!ageConfirmed) {
      setError("Please confirm you are 13+ to continue.");
      return;
    }

    setSubmitting(true);

    try {
      const callbackUrl = `${window.location.origin}/shop/confirmation`;
      const addressBlock = [deliveryAddress.trim(), city.trim(), country.trim()]
        .filter(Boolean)
        .join(", ");
      const fulfillmentNotes = [
        `Delivery address: ${addressBlock}`,
        sameAddress ? "Billing and delivery address are the same" : null,
        notes.trim() || null,
      ]
        .filter(Boolean)
        .join("\n");

      const checkout = await createStoreCheckout({
        customerName: name,
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        fulfillment,
        notes: fulfillmentNotes,
        lines: lines.map((line) => ({ itemId: line.productId, qty: line.qty })),
        callbackUrl,
      });

      const order: ShopOrder = {
        reference: checkout.orderReference,
        createdAt: new Date().toISOString(),
        status: "pending_payment",
        customer: {
          name,
          email: email.trim(),
          phone: phone.trim(),
          registration: "",
        },
        fulfillment,
        notes: fulfillmentNotes,
        lines: orderLines,
        total: checkout.total ?? total,
        paid: false,
      };
      saveOrderToStorage(order);
      clearCart();

      if (!checkout.authorizationUrl) {
        throw new Error("Paystack did not return a payment link. Check API Paystack keys.");
      }

      window.location.assign(checkout.authorizationUrl);
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof Error
          ? err.message
          : "Checkout failed. Check that the API is running and Paystack keys are set.",
      );
    }
  }

  return (
    <section className="ve-shop ve-shop-page" data-qa-section="shop-checkout">
      <div className="container-full">
        <div className="breadcrumb-item" style={{ marginBottom: 16 }}>
          <Link href="/" className="breadcrumb-link text-black">
            Home
          </Link>
          <div className="breadcrumb-text text-black">/</div>
          <Link href="/shop" className="breadcrumb-link text-black">
            Shop
          </Link>
          <div className="breadcrumb-text text-black">/</div>
          <Link href="/shop/cart" className="breadcrumb-link text-black">
            Cart
          </Link>
          <div className="breadcrumb-text text-black">/</div>
          <div className="breadcrumb-text text-gray-3">Checkout</div>
        </div>

        <form className="ve-checkout-layout" onSubmit={(e) => void handleSubmit(e)} noValidate>
          <div className="ve-checkout-stack">
            <div className="ve-checkout-panel">
              <h2>Contact</h2>
              <div className="ve-checkout-grid">
                <div className="ve-checkout-field">
                  <label htmlFor="checkout-email">Email</label>
                  <input
                    id="checkout-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="ve-checkout-field">
                  <label htmlFor="checkout-phone">Phone</label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="ve-checkout-panel">
              <h2>Shipping details</h2>
              <div className="ve-checkout-grid">
                <div className="ve-checkout-field">
                  <label htmlFor="checkout-first">First name</label>
                  <input
                    id="checkout-first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="ve-checkout-field">
                  <label htmlFor="checkout-last">Last name</label>
                  <input
                    id="checkout-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div className="ve-checkout-field">
                  <label htmlFor="checkout-country">Country</label>
                  <input
                    id="checkout-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div className="ve-checkout-field">
                  <label htmlFor="checkout-city">City</label>
                  <input
                    id="checkout-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
                <div className="ve-checkout-field ve-checkout-field--full">
                  <label htmlFor="checkout-address">Address</label>
                  <textarea
                    id="checkout-address"
                    placeholder="Street, area…"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                  />
                </div>
                <div className="ve-checkout-field ve-checkout-field--full">
                  <label htmlFor="checkout-notes">Notes (optional)</label>
                  <textarea
                    id="checkout-notes"
                    placeholder="Delivery notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="ve-checkout-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={sameAddress}
                    onChange={(e) => setSameAddress(e.target.checked)}
                  />
                  Billing and delivery address are the same
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                  />
                  I&apos;m 13+ years old
                </label>
              </div>
            </div>

            {error ? <p className="ve-checkout-error">{error}</p> : null}

            <ShopBusyButton
              type="submit"
              className="ve-shop-btn--primary ve-shop-btn--lg"
              style={{ maxWidth: 220 }}
              busy={submitting}
              busyLabel="Redirecting…"
            >
              Next
            </ShopBusyButton>
          </div>

          <div className="ve-checkout-stack">
            <ShopOrderReview
              showPromo
              showLineItems
              primaryType="submit"
              primaryLabel={submitting ? "Redirecting…" : "Pay with Paystack"}
              primaryDisabled={submitting}
              primaryBusy={submitting}
              secondaryHref="/shop/cart"
              secondaryLabel="Back to cart"
            />
          </div>
        </form>
      </div>
    </section>
  );
}
