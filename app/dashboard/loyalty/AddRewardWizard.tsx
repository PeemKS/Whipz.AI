"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { createRewardAction } from "@/app/dashboard/loyalty/actions";

interface WizardLabels {
  addReward: string;
  rewardNamePlaceholder: string;
  descriptionPlaceholder: string;
  pointsCostLabel: string;
  createReward: string;
}

export function AddRewardWizard({
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
        {t.addReward}
      </Button>

      <Modal open={open} onClose={close}>
        <div className="p-6">
          <h2 className="font-medium mb-5">{t.addReward}</h2>

          <form
            action={async (formData) => {
              await createRewardAction(formData);
              close();
            }}
            className="space-y-4"
          >
            <input type="hidden" name="tenant_id" value={tenantId} />

            <div>
              <label className="text-xs text-zinc-500">{t.rewardNamePlaceholder}</label>
              <Input name="name" required placeholder={t.rewardNamePlaceholder} autoFocus />
            </div>

            <Textarea name="description" rows={2} placeholder={t.descriptionPlaceholder} />

            <div>
              <label className="text-xs text-zinc-500">{t.pointsCostLabel}</label>
              <Input name="points_cost" type="number" required />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={close} className="text-sm text-zinc-500 hover:text-zinc-700 px-3 py-2">
                {cancelLabel}
              </button>
              <Button type="submit">{t.createReward}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
