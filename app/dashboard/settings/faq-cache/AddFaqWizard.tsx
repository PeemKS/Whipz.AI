"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { createFaqCacheAction } from "@/app/dashboard/settings/faq-cache/actions";

interface WizardLabels {
  addFaq: string;
  questionLabel: string;
  questionPlaceholder: string;
  answerLabel: string;
  answerPlaceholder: string;
  createFaq: string;
}

export function AddFaqWizard({ tenantId, t, cancelLabel }: { tenantId: string; t: WizardLabels; cancelLabel: string }) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {t.addFaq}
      </Button>

      <Modal open={open} onClose={close}>
        <div className="p-6">
          <h2 className="font-medium mb-5">{t.addFaq}</h2>

          <form
            action={async (formData) => {
              await createFaqCacheAction(formData);
              close();
            }}
            className="space-y-4"
          >
            <input type="hidden" name="tenant_id" value={tenantId} />

            <div>
              <label className="text-xs text-zinc-500">{t.questionLabel}</label>
              <Input name="question" required placeholder={t.questionPlaceholder} autoFocus />
            </div>

            <div>
              <label className="text-xs text-zinc-500">{t.answerLabel}</label>
              <Textarea name="answer" required rows={4} placeholder={t.answerPlaceholder} />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={close} className="text-sm text-zinc-500 hover:text-zinc-700 px-3 py-2">
                {cancelLabel}
              </button>
              <Button type="submit">{t.createFaq}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
