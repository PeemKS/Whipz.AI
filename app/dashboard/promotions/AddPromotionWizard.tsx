"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { createPromotionAction } from "@/app/dashboard/promotions/actions";

interface ProductOption {
  id: string;
  name: string;
}

interface WizardLabels {
  addPromotion: string;
  type: string;
  typePlaceholder: string;
  starts: string;
  ends: string;
  product: string;
  allProducts: string;
  priority: string;
  priorityHelp: string;
  stackable: string;
  stackableHelp: string;
  create: string;
}

export function AddPromotionWizard({
  tenantId,
  products,
  t,
  cancelLabel,
}: {
  tenantId: string;
  products: ProductOption[];
  t: WizardLabels;
  cancelLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [stackable, setStackable] = useState(false);

  function close() {
    setOpen(false);
    setStackable(false);
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {t.addPromotion}
      </Button>

      <Modal open={open} onClose={close}>
        <div className="p-6">
          <h2 className="font-medium mb-5">{t.addPromotion}</h2>

          <form
            action={async (formData) => {
              await createPromotionAction(formData);
              close();
            }}
            className="space-y-4"
          >
            <input type="hidden" name="tenant_id" value={tenantId} />
            <input type="hidden" name="stackable" value={stackable ? "on" : ""} />

            <div>
              <label className="text-xs text-zinc-500">{t.type}</label>
              <Input name="type" required placeholder={t.typePlaceholder} autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500">{t.starts}</label>
                <Input name="start_at" type="datetime-local" required />
              </div>
              <div>
                <label className="text-xs text-zinc-500">{t.ends}</label>
                <Input name="end_at" type="datetime-local" required />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500">{t.product}</label>
              <Select name="product_id" defaultValue="">
                <option value="">{t.allProducts}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs text-zinc-500">{t.priority}</label>
              <Input name="priority" type="number" defaultValue="0" />
              <p className="text-xs text-zinc-400 mt-1">{t.priorityHelp}</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">{t.stackable}</div>
                <p className="text-xs text-zinc-400">{t.stackableHelp}</p>
              </div>
              <Toggle
                name="stackable_ui"
                autoSubmit={false}
                checked={stackable}
                onChange={(e) => setStackable(e.target.checked)}
                aria-label={t.stackable}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={close} className="text-sm text-zinc-500 hover:text-zinc-700 px-3 py-2">
                {cancelLabel}
              </button>
              <Button type="submit">{t.create}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
