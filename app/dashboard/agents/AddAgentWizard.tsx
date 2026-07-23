"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { createAgentAction } from "@/app/dashboard/agents/actions";

interface WizardLabels {
  addAgent: string;
  nameLabel: string;
  namePlaceholder: string;
  specializationLabel: string;
  specializationPlaceholder: string;
  systemPromptLabel: string;
  systemPromptPlaceholder: string;
  createAgent: string;
}

export function AddAgentWizard({
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
        {t.addAgent}
      </Button>

      <Modal open={open} onClose={close}>
        <div className="p-6">
          <h2 className="font-medium mb-5">{t.addAgent}</h2>

          <form
            action={async (formData) => {
              await createAgentAction(formData);
              close();
            }}
            className="space-y-4"
          >
            <input type="hidden" name="tenant_id" value={tenantId} />

            <div>
              <label className="text-xs text-zinc-500">{t.nameLabel}</label>
              <Input name="name" required placeholder={t.namePlaceholder} autoFocus />
            </div>

            <div>
              <label className="text-xs text-zinc-500">{t.specializationLabel}</label>
              <Textarea name="specialization" required rows={2} placeholder={t.specializationPlaceholder} />
            </div>

            <div>
              <label className="text-xs text-zinc-500">{t.systemPromptLabel}</label>
              <Textarea name="system_prompt" required rows={4} placeholder={t.systemPromptPlaceholder} />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={close} className="text-sm text-zinc-500 hover:text-zinc-700 px-3 py-2">
                {cancelLabel}
              </button>
              <Button type="submit">{t.createAgent}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
