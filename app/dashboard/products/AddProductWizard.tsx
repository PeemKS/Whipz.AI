"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { createProductAction } from "@/app/dashboard/products/actions";

interface WizardLabels {
  addProduct: string;
  skuPlaceholder: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  pricePlaceholder: string;
  stockPlaceholder: string;
  photoLabel: string;
  documentLabel: string;
  documentHelp: string;
}

export function AddProductWizard({
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
        {t.addProduct}
      </Button>

      <Modal open={open} onClose={close}>
        <div className="p-6">
          <h2 className="font-medium mb-5">{t.addProduct}</h2>

          <form
            action={async (formData) => {
              await createProductAction(formData);
              close();
            }}
            className="space-y-3"
          >
            <input type="hidden" name="tenant_id" value={tenantId} />

            <Input name="sku" required placeholder={t.skuPlaceholder} autoFocus />
            <Input name="name" required placeholder={t.namePlaceholder} />
            <Textarea name="description" rows={2} placeholder={t.descriptionPlaceholder} />
            <div className="grid grid-cols-2 gap-3">
              <Input name="price" type="number" step="0.01" required placeholder={t.pricePlaceholder} />
              <Input name="stock" type="number" required placeholder={t.stockPlaceholder} />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.photoLabel}</label>
              <Input name="image" type="file" accept="image/*" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.documentLabel}</label>
              <Input name="document" type="file" accept=".pdf,.txt,.md" />
              <p className="text-xs text-zinc-400 mt-1">{t.documentHelp}</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={close} className="text-sm text-zinc-500 hover:text-zinc-700 px-3 py-2">
                {cancelLabel}
              </button>
              <Button type="submit">{t.addProduct}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
