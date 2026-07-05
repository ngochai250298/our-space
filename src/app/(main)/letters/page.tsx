"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Input, Textarea, PrimaryButton } from "@/components/Field";
import { useSession } from "@/hooks/useSession";
import { useLetters } from "@/features/letters/useLetters";
import { allAccounts, partnerOf } from "@/lib/auth";
import type { Letter, Role } from "@/types";
import { LetterCard } from "@/features/letters/LetterCard";

type Tab = "inbox" | "sent";

export default function LettersPage() {
  const session = useSession();
  const { items, ready, cloudError, add, update, remove } = useLetters(session);
  const [tab, setTab] = useState<Tab>("inbox");
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<Role[]>([]);

  // A letter is only visible to its sender and its chosen recipient.
  const visible = useMemo(() => {
    if (!session) return [];
    const mine =
      tab === "inbox"
        ? (l: Letter) => l.to === session.role
        : (l: Letter) => l.from === session.role;
    return items.filter(mine).sort((a, b) => b.createdAt - a.createdAt);
  }, [items, tab, session]);

  if (!session) return null;

  const others = allAccounts().filter((a) => a.role !== session.role);

  const openCompose = () => {
    const partner = partnerOf(session.role);
    setRecipients(partner ? [partner] : []);
    setTitle("");
    setBody("");
    setComposing(true);
  };

  const toggleRecipient = (role: Role) => {
    setRecipients((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const send = () => {
    if (!title.trim() || !body.trim() || recipients.length === 0) return;
    // One private copy per recipient — each person gets their own
    // envelope and their own "đã đọc" status; nobody else sees it.
    for (const to of recipients) {
      void add({
        from: session.role,
        to,
        title: title.trim(),
        body: body.trim(),
        createdAt: Date.now(),
      });
    }
    setComposing(false);
  };

  return (
    <div>
      <PageHeader
        title="Thư gửi nhau"
        action={
          <button
            type="button"
            aria-label="Viết thư"
            onClick={openCompose}
            className="grid size-9 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/25"
          >
            <Plus size={18} />
          </button>
        }
      />

      {/* Tabs */}
      <div className="card mb-4 flex p-1">
        {(
          [
            { key: "inbox", label: "Hộp thư đến" },
            { key: "sent", label: "Đã gửi" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-2xl py-2 text-xs font-semibold transition-all duration-300 ${
              tab === key ? "bg-primary text-white shadow" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {cloudError && (
        <p className="card mb-3 px-4 py-3 text-center text-xs leading-relaxed text-muted">
          ⚠️ {cloudError}
        </p>
      )}

      <div className="space-y-3">
        {ready && visible.length === 0 && (
          <EmptyState
            emoji="💌"
            title={tab === "inbox" ? "Chưa có thư nào gửi đến" : "Bạn chưa gửi lá thư nào"}
            hint="Viết một lá thư yêu thương nhé"
          />
        )}
        {visible.map((letter) => (
          <LetterCard
            key={letter.id}
            letter={letter}
            viewer={session.role}
            onRead={() => {
              if (letter.to === session.role && !letter.readAt)
                void update(letter.id, { readAt: Date.now() });
            }}
            onDelete={() => void remove(letter.id)}
          />
        ))}
      </div>

      <Modal open={composing} title="Viết thư 💌" onClose={() => setComposing(false)}>
        <div className="space-y-4">
          {/* Recipients */}
          <div>
            <span className="text-xs font-medium text-muted">
              Gửi đến ai (chọn một hoặc nhiều người)
            </span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {others.map((account) => {
                const selected = recipients.includes(account.role);
                return (
                  <button
                    key={account.role}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleRecipient(account.role)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
                      selected
                        ? "bg-primary text-white shadow"
                        : "card text-muted"
                    }`}
                  >
                    <span aria-hidden>
                      {account.gender === "male" ? "👨🏻" : "👩🏻"}
                    </span>
                    {account.displayName}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              Chỉ những người được chọn mới đọc được lá thư này.
            </p>
          </div>

          <Input
            label="Tiêu đề"
            placeholder="Gửi người thương..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label="Nội dung"
            placeholder="Viết những điều muốn nói..."
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <PrimaryButton
            type="button"
            onClick={send}
            disabled={!title.trim() || !body.trim() || recipients.length === 0}
          >
            Gửi thư 💗
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
