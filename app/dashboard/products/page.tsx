import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { listProducts } from "@/lib/db/products";
import { updateStockAction, deleteProductAction } from "@/app/dashboard/products/actions";
import { AddProductWizard } from "@/app/dashboard/products/AddProductWizard";
import { EditProductWizard } from "@/app/dashboard/products/EditProductWizard";
import { getT } from "@/lib/i18n/getT";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function ProductsPage() {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const db = await supabaseServerAuth();
  const products = await listProducts(db, tenant.id);
  const t = await getT();
  const p = t.products;

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <AddProductWizard tenantId={tenant.id} t={p} cancelLabel={t.common.cancel} />
      </div>

      <Card padding="none" className="overflow-hidden">
        <table className="w-full text-sm text-center">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">{p.image}</th>
              <th className="px-4 py-2 font-medium">{p.sku}</th>
              <th className="px-4 py-2 font-medium">{p.name}</th>
              <th className="px-4 py-2 font-medium">{p.price}</th>
              <th className="px-4 py-2 font-medium">{p.stock}</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  {p.noneYet}
                </td>
              </tr>
            )}
            {products.map((product) => {
              const images = (product.images ?? []) as string[];
              const previewImages = images.slice(0, 3);
              const extraImageCount = images.length - previewImages.length;
              return (
                <tr key={product.id} className="border-t border-zinc-100 align-middle">
                  <td className="px-4 py-2">
                    {images.length === 0 ? (
                      <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-400">
                        {p.noImage}
                      </div>
                    ) : (
                      <div className="flex justify-center -space-x-2">
                        {previewImages.map((url) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={url}
                            src={url}
                            alt={product.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white ring-1 ring-zinc-200"
                          />
                        ))}
                        {extraImageCount > 0 && (
                          <div className="w-10 h-10 rounded-full bg-zinc-100 border-2 border-white ring-1 ring-zinc-200 flex items-center justify-center text-[10px] font-medium text-zinc-500">
                            +{extraImageCount}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-2">{product.name}</td>
                  <td className="px-4 py-2">{product.price}</td>
                  <td className="px-4 py-2">
                    <form action={updateStockAction} className="flex items-center justify-center gap-2">
                      <input type="hidden" name="id" value={product.id} />
                      <input
                        name="stock"
                        type="number"
                        defaultValue={product.stock}
                        className="w-20 border border-zinc-200 bg-white rounded-xl px-2 py-1 text-sm text-center"
                      />
                      <Button type="submit" variant="secondary" size="sm">
                        {t.common.update}
                      </Button>
                    </form>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center gap-2">
                      <EditProductWizard
                        product={product}
                        tenantId={tenant.id}
                        t={p}
                        editLabel={t.common.edit}
                        cancelLabel={t.common.cancel}
                        deleteLabel={t.common.delete}
                      />
                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={product.id} />
                        <Button type="submit" variant="destructive" size="sm">
                          {t.common.delete}
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
