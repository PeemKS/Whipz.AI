"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { createTierAction } from "@/app/dashboard/loyalty/actions";

interface WizardLabels {
  addTier: string;
  tierNamePlaceholder: string;
  minSpendLabel: string;
  multiplierLabel: string;
  perksPlaceholder: string;
  createTier: string;
}

export function AddTierWizard({
  tenantId,
  t,
  cancelLabel,
}: {
  tenantId: string;
  t: WizardLabels;
  cancelLabel: string;
}) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {t.addTier}
      </Button>

      <Modal open={open} onClose={close}>
        <div className="p-6">
          <h2 className="font-medium mb-5">{t.addTier}</h2>

          <form
            action={async (formData) => {
              await createTierAction(formData);
              close();
            }}
            className="space-y-4"
          >
            <input type="hidden" name="tenant_id" value={tenantId} />

            <div>
              <label className="text-xs text-zinc-500">{t.tierNamePlaceholder}</label>
              <Input name="name" required placeholder={t.tierNamePlaceholder} autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500">{t.minSpendLabel}</label>
                <Input name="min_spend" type="number" step="0.01" required />
              </div>
              <div>
                <label className="text-xs text-zinc-500">{t.multiplierLabel}</label>
                <Input name="point_multiplier" type="number" step="0.1" defaultValue={1} required />
              </div>
            </div>

            <Textarea name="perks" rows={2} placeholder={t.perksPlaceholder} />

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={close} className="text-sm text-zinc-500 hover:text-zinc-700 px-3 py-2">
                {cancelLabel}
              </button>
              <Button type="submit">{t.createTier}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
