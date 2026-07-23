"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import {
  updateProductAction,
  removeProductDocumentAction,
  addProductImageAction,
  removeProductImageAction,
} from "@/app/dashboard/products/actions";
import type { Product } from "@/lib/supabase/types";

const FILE_INPUT_CLASSES =
  "w-full text-xs text-zinc-500 cursor-pointer file:cursor-pointer file:mr-2 file:rounded-full file:border file:border-zinc-200 file:bg-white file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-50";

interface WizardLabels {
  editProduct: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  saveChanges: string;
  documentLabel: string;
  documentHelp: string;
  documentCurrent: string;
  price: string;
  image: string;
  noImage: string;
  upload: string;
}

export function EditProductWizard({
  product,
  tenantId,
  t,
  editLabel,
  cancelLabel,
  deleteLabel,
}: {
  product: Product;
  tenantId: string;
  t: WizardLabels;
  editLabel: string;
  cancelLabel: string;
  deleteLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const images = (product.images ?? []) as string[];

  function close() {
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {editLabel}
      </Button>

      <Modal open={open} onClose={close}>
        <div className="p-6 space-y-5">
          <h2 className="font-medium">{t.editProduct}</h2>

          <div>
            <label className="text-xs text-zinc-500">{t.image}</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {images.length === 0 && (
                <div className="w-14 h-14 rounded-xl bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-400">
                  {t.noImage}
                </div>
              )}
              {images.map((url) => (
                <div key={url} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={product.name} className="w-14 h-14 rounded-xl object-cover border border-zinc-200" />
                  <form action={removeProductImageAction} className="absolute -top-1.5 -right-1.5">
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="url" value={url} />
                    <button
                      title="Remove image"
                      className="w-5 h-5 rounded-full bg-red-600 text-white text-xs leading-none flex items-center justify-center"
                    >
                      ×
                    </button>
                  </form>
                </div>
              ))}
            </div>
            <form action={addProductImageAction} className="flex items-center gap-1.5 mt-2">
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="tenant_id" value={tenantId} />
              <label
                aria-label={t.image}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 cursor-pointer"
              >
                <ImagePlus size={14} strokeWidth={2} />
                <input type="file" name="image" accept="image/*" className="sr-only" />
              </label>
              <button className="shrink-0 text-xs px-2.5 py-1 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 font-medium text-zinc-700">
                {t.upload}
              </button>
            </form>
          </div>

          <form
            action={async (formData) => {
              await updateProductAction(formData);
              close();
            }}
            className="space-y-3"
          >
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="tenant_id" value={tenantId} />
            {/* Stock is edited inline in the table for quick restocking — carry
                the current value through so this save doesn't reset it. */}
            <input type="hidden" name="stock" value={product.stock} />

            <div>
              <label className="text-xs text-zinc-500">{t.sku}</label>
              <Input name="sku" required defaultValue={product.sku} />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.name}</label>
              <Input name="name" required defaultValue={product.name} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500">{t.category}</label>
                <Input name="category" defaultValue={product.category ?? ""} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">{t.price}</label>
                <Input name="price" type="number" step="0.01" required defaultValue={product.price} />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.description}</label>
              <Textarea name="description" rows={2} defaultValue={product.description ?? ""} />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.documentLabel}</label>
              {product.document_name && (
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs text-zinc-600 truncate">
                    {t.documentCurrent}: {product.document_name}
                  </p>
                  <button
                    type="submit"
                    formAction={removeProductDocumentAction}
                    className="shrink-0 text-xs text-red-600 hover:text-red-700"
                  >
                    {deleteLabel}
                  </button>
                </div>
              )}
              <input type="file" name="document" accept=".pdf,.txt,.md" className={FILE_INPUT_CLASSES} />
              <p className="text-xs text-zinc-400 mt-1">{t.documentHelp}</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={close} className="text-sm text-zinc-500 hover:text-zinc-700 px-3 py-2">
                {cancelLabel}
              </button>
              <Button type="submit">{t.saveChanges}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
