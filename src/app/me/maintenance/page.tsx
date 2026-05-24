"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, ImagePlus } from "lucide-react";
import { AxiosError } from "axios";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  EmptyState,
  formatDate,
} from "@/components/app/ui";
import { tenantApi, MaintenanceRequest } from "@/lib/tenant-api";

type Priority = "low" | "medium" | "high" | "urgent";

export default function MaintenancePage() {
  const [formOpen, setFormOpen] = useState(false);

  const q = useQuery({
    queryKey: ["me", "maintenance"],
    queryFn: () => tenantApi.listMaintenanceRequests({ limit: 50 }),
  });

  return (
    <>
      <TenantTopbar
        title="Maintenance"
        subtitle="Report issues; track the landlord's response"
        actions={
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            <Plus className="h-4 w-4" /> New request
          </button>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-32 w-full" />
          </Card>
        ) : q.isError ? (
          <ErrorBox
            message={(q.error as Error)?.message}
            onRetry={() => q.refetch()}
          />
        ) : (q.data ?? []).length === 0 ? (
          <EmptyState
            title="No maintenance requests yet"
            body="Tap “New request” to report a repair, leak, fault, or other issue."
          />
        ) : (
          <ul className="space-y-3">
            {q.data!.map((r) => (
              <RequestRow key={r._id} req={r} />
            ))}
          </ul>
        )}
      </PageContainer>

      {formOpen && <NewRequestModal onClose={() => setFormOpen(false)} />}
    </>
  );
}

function RequestRow({ req }: { req: MaintenanceRequest }) {
  const statusTone: "good" | "warn" | "info" | "neutral" =
    req.status === "completed"
      ? "good"
      : req.status === "in_progress"
      ? "info"
      : req.status === "pending"
      ? "warn"
      : "neutral";

  const priorityTone: "bad" | "warn" | "info" | "neutral" =
    req.priority === "urgent"
      ? "bad"
      : req.priority === "high"
      ? "warn"
      : req.priority === "medium"
      ? "info"
      : "neutral";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foundation-700">
            {req.title}
          </p>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            {formatDate(req.createdAt)}
            {req.unit?.unitNumber ? ` · Unit ${req.unit.unitNumber}` : ""}
          </p>
          <p className="mt-2 text-[13px] text-foundation-700">
            {req.description}
          </p>
          {req.images && req.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {req.images.map((src) => (
                <a
                  key={src}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-16 w-16 overflow-hidden rounded-lg border border-foundation-700/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt="Maintenance attachment"
                    className="h-full w-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusPill label={req.status} tone={statusTone} />
          <StatusPill label={req.priority} tone={priorityTone} />
        </div>
      </div>
    </Card>
  );
}

function NewRequestModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [imageUrl, setImageUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function addImage() {
    const url = imageUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError("Image URL must start with http(s)://");
      return;
    }
    setImages((arr) => [...arr, url]);
    setImageUrl("");
    setError(null);
  }

  const submit = useMutation({
    mutationFn: () =>
      tenantApi.createMaintenanceRequest({
        title: title.trim(),
        description: description.trim(),
        priority,
        images: images.length > 0 ? images : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "maintenance"] });
      onClose();
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? (err as Error).message);
    },
  });

  const canSubmit =
    title.trim().length > 0 && description.trim().length > 0 && !submit.isPending;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foundation-700/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-paper p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <p className="font-display text-[18px] font-extrabold text-foundation-700">
            New maintenance request
          </p>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) {
              setError(null);
              submit.mutate();
            }
          }}
        >
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. Leaking tap in kitchen"
              className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
              required
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="What's wrong? When did it start? Any other context."
              className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[13.5px] text-foundation-700"
              required
            />
          </Field>
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
          <Field label="Image URLs (optional)">
            <div className="flex items-center gap-2">
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className="flex-1 rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
              />
              <button
                type="button"
                onClick={addImage}
                className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-3.5 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
              >
                <ImagePlus className="h-4 w-4" /> Add
              </button>
            </div>
            {images.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {images.map((u, i) => (
                  <li
                    key={u + i}
                    className="flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-foundation-700/5 px-3 py-1 text-[11.5px] text-foundation-700"
                  >
                    <span className="max-w-[160px] truncate">{u}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setImages((arr) => arr.filter((_, idx) => idx !== i))
                      }
                      className="text-ink-muted transition hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
          {error && (
            <p className="text-[12.5px] text-red-700">{error}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {submit.isPending ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
