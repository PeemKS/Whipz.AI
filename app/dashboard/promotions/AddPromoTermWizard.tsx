"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { createPromoTermAction } from "@/app/dashboard/promotions/actions";

interface WizardLabels {
  addPromoCode: string;
  code: string;
  codePlaceholder: string;
  discountType: string;
  discountTypePercent: string;
  discountTypeFixed: string;
  discountValue: string;
  discountValuePlaceholderPercent: string;
  discountValuePlaceholderFixed: string;
  maxUsesPerCustomer: string;
  maxUsesPerCustomerPlaceholder: string;
  minOrderAmount: string;
  minOrderAmountPlaceholder: string;
  createPromoCode: string;
}

export function AddPromoTermWizard({ tenantId, t, cancelLabel }: { tenantId: string; t: WizardLabels; cancelLabel: string }) {
  const [open, setOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");

  function close() {
    setOpen(false);
    setDiscountType("percent");
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {t.addPromoCode}
      </Button>

      <Modal open={open} onClose={close}>
        <div className="p-6">
          <h2 className="font-medium mb-5">{t.addPromoCode}</h2>

          <form
            action={async (formData) => {
              await createPromoTermAction(formData);
              close();
            }}
            className="space-y-4"
          >
            <input type="hidden" name="tenant_id" value={tenantId} />

            <div>
              <label className="text-xs text-zinc-500">{t.code}</label>
              <Input name="code" required placeholder={t.codePlaceholder} autoFocus className="uppercase" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500">{t.discountType}</label>
                <Select name="discount_type" value={discountType} onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}>
                  <option value="percent">{t.discountTypePercent}</option>
                  <option value="fixed">{t.discountTypeFixed}</option>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">{t.discountValue}</label>
                <Input
                  name="discount_value"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder={discountType === "percent" ? t.discountValuePlaceholderPercent : t.discountValuePlaceholderFixed}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500">{t.maxUsesPerCustomer}</label>
                <Input name="max_uses_per_customer" type="number" min="1" placeholder={t.maxUsesPerCustomerPlaceholder} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">{t.minOrderAmount}</label>
                <Input name="min_order_amount" type="number" step="0.01" min="0" placeholder={t.minOrderAmountPlaceholder} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={close} className="text-sm text-zinc-500 hover:text-zinc-700 px-3 py-2">
                {cancelLabel}
              </button>
              <Button type="submit">{t.createPromoCode}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
