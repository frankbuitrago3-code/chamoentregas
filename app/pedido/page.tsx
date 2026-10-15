import { Suspense } from "react";
import { CustomerOrderForm } from "@/components/customer-order-form";

export default function CustomerOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#fffdfb] px-4">
          <p className="text-sm font-semibold text-slate-600">Preparando tu solicitud…</p>
        </main>
      }
    >
      <CustomerOrderForm initialRequestType="comida" />
    </Suspense>
  );
}
