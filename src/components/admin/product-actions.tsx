"use client";

import { Archive, Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteProductAction, setProductStatusAction } from "@/server/actions/catalog";
import type { ProductStatus } from "@/lib/types";
import { Panel } from "./ui";

/** Status shortcuts + permanent delete (with confirmation) for the edit page. */
export function ProductDangerZone({ id, name, status }: { id: string; name: string; status: ProductStatus }) {
  return (
    <Panel title="Visibility & removal" className="mx-auto mt-5 max-w-5xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {status !== "active" && (
          <StatusButton id={id} status="active" icon={<Eye className="size-4" />} label="Publish now" />
        )}
        {status === "active" && <StatusButton id={id} status="draft" icon={<EyeOff className="size-4" />} label="Unpublish (draft)" />}
        {status !== "archived" && <StatusButton id={id} status="archived" icon={<Archive className="size-4" />} label="Archive" />}
        <form
          action={deleteProductAction}
          onSubmit={(e) => {
            if (!confirm(`Permanently delete “${name}” and its images? This cannot be undone.\n\nTip: Archive keeps it for your records.`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button className="flex w-full items-center justify-center gap-2 rounded-md border border-danger/40 px-4 py-2.5 text-sm text-danger hover:bg-danger/10">
            <Trash2 className="size-4" /> Delete permanently
          </button>
        </form>
      </div>
    </Panel>
  );
}

function StatusButton({ id, status, icon, label }: { id: string; status: ProductStatus; icon: React.ReactNode; label: string }) {
  return (
    <form action={setProductStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-fg hover:border-border-strong">
        {icon} {label}
      </button>
    </form>
  );
}
