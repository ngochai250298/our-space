"use client";

import { useEffect, useRef, useState } from "react";
import type {
  LeafletMouseEvent,
  Map as LeafletMap,
  Marker,
} from "leaflet";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Role } from "@/types";
import { allAccounts, displayNameOf, genderOf } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// Ho Chi Minh City — a sensible default when a person has no fix yet.
const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009];

interface LocRow {
  role: Role;
  lat: number;
  lng: number;
}

function personIconHtml(role: Role): string {
  const emoji = genderOf(role) === "male" ? "👨🏻" : "👩🏻";
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
    <span style="background:#e76f6f;color:#fff;font-size:10px;font-weight:600;padding:1px 6px;border-radius:999px;white-space:nowrap;">${displayNameOf(role)}</span>
    <span style="display:grid;place-items:center;width:32px;height:32px;font-size:16px;background:#fff;border:2px solid #e76f6f;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.25);">${emoji}</span>
  </div>`;
}

/**
 * Admin "fake GPS": the map shows everyone's current position; the selected
 * person gets a draggable 📍 pin. Drag it (or tap the map), press Lưu, and it
 * upserts that person's row in `locations` with a fresh timestamp — so the real
 * map shows them there and "vừa cập nhật" via realtime.
 */
export function AdminFakeGps() {
  const accounts = allAccounts();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const pinRef = useRef<Marker | null>(null);
  const staticRef = useRef<Partial<Record<Role, Marker>>>({});
  const leafletRef = useRef<typeof LeafletNS | null>(null);
  const knownRef = useRef<Partial<Record<Role, [number, number]>>>({});

  const [role, setRole] = useState<Role>(accounts[0]?.role ?? "anh");
  const roleRef = useRef(role);
  const [pos, setPos] = useState<[number, number]>(DEFAULT_CENTER);
  const posRef = useRef(pos);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [mapError, setMapError] = useState("");

  roleRef.current = role;
  posRef.current = pos;

  // Redraw the static markers for everyone except the selected person.
  const redraw = () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    for (const r of Object.keys(staticRef.current) as Role[]) {
      if (r === roleRef.current || !knownRef.current[r]) {
        staticRef.current[r]?.remove();
        delete staticRef.current[r];
      }
    }
    for (const r of Object.keys(knownRef.current) as Role[]) {
      if (r === roleRef.current) continue;
      const p = knownRef.current[r]!;
      const existing = staticRef.current[r];
      if (existing) {
        existing.setLatLng(p);
      } else {
        staticRef.current[r] = L.marker(p, {
          icon: L.divIcon({
            className: "ourspace-admin-marker",
            html: personIconHtml(r),
            iconSize: [44, 50],
            iconAnchor: [22, 44],
          }),
        }).addTo(map);
      }
    }
  };

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (disposed || !containerRef.current || mapRef.current) return;
        leafletRef.current = L;

        const map = L.map(containerRef.current, { zoomControl: false }).setView(
          DEFAULT_CENTER,
          12
        );
        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        mapRef.current = map;
        window.setTimeout(() => !disposed && map.invalidateSize(), 80);
        window.setTimeout(() => !disposed && map.invalidateSize(), 400);

        const pin = L.marker(DEFAULT_CENTER, {
          draggable: true,
          icon: L.divIcon({
            className: "ourspace-fakegps-pin",
            html: `<div style="font-size:38px;line-height:1;transform:translateY(-6px);filter:drop-shadow(0 3px 5px rgba(0,0,0,.45));">📍</div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 36],
          }),
        }).addTo(map);
        pin.on("dragend", () => {
          const ll = pin.getLatLng();
          setPos([ll.lat, ll.lng]);
        });
        map.on("click", (e: LeafletMouseEvent) => {
          pin.setLatLng(e.latlng);
          setPos([e.latlng.lat, e.latlng.lng]);
        });
        pinRef.current = pin;

        // Everyone's current position seeds the markers + centres the view.
        const sb = getSupabase();
        if (sb) {
          const { data } = await sb.from("locations").select("role,lat,lng");
          if (!disposed) {
            (data as LocRow[] | null)?.forEach((r) => {
              knownRef.current[r.role] = [r.lat, r.lng];
            });
          }
        }
        if (disposed) return;

        const cur = knownRef.current[roleRef.current];
        if (cur) {
          pin.setLatLng(cur);
          setPos(cur);
        }
        redraw();

        const pts = Object.values(knownRef.current).filter(Boolean) as [
          number,
          number,
        ][];
        if (cur) pts.push(cur);
        if (pts.length >= 2) map.fitBounds(pts, { padding: [50, 50] });
        else if (pts.length === 1) map.setView(pts[0], 13);
      } catch {
        if (!disposed) setMapError("Không tải được bản đồ — thử tải lại trang.");
      }
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      pinRef.current = null;
      staticRef.current = {};
      leafletRef.current = null;
    };
  }, []);

  const selectRole = (r: Role) => {
    setRole(r);
    roleRef.current = r;
    const known = knownRef.current[r];
    const map = mapRef.current;
    const pin = pinRef.current;
    if (pin) {
      const target = known ?? posRef.current;
      pin.setLatLng(target);
      setPos(target);
      if (known) map?.panTo(known);
    }
    redraw();
  };

  const save = async () => {
    const sb = getSupabase();
    if (!sb) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    const [lat, lng] = posRef.current;
    const { error } = await sb.from("locations").upsert({
      role,
      lat,
      lng,
      accuracy: 20,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setStatus("error");
    } else {
      knownRef.current[role] = [lat, lng];
      setStatus("done");
    }
    window.setTimeout(() => setStatus("idle"), 1500);
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => (
          <button
            key={a.role}
            type="button"
            onClick={() => selectRole(a.role)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              role === a.role ? "bg-primary text-white shadow" : "card text-muted"
            }`}
          >
            <span aria-hidden>{genderOf(a.role) === "male" ? "👨🏻" : "👩🏻"}</span>
            {displayNameOf(a.role)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-primary-soft/30">
        <div ref={containerRef} className="w-full" style={{ height: 360 }} />
      </div>
      {mapError && <p className="text-xs text-primary-strong">{mapError}</p>}

      <div className="card flex items-center justify-between gap-3 p-3">
        <div className="text-[11px] tabular-nums text-muted">
          📍 {displayNameOf(role)}: {pos[0].toFixed(5)}, {pos[1].toFixed(5)}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={status === "saving"}
          className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {status === "saving"
            ? "Đang lưu..."
            : status === "done"
              ? "Đã lưu ✓"
              : status === "error"
                ? "Lỗi — thử lại"
                : "Lưu vị trí"}
        </button>
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-muted">
        Bản đồ hiện vị trí hiện tại của mọi người. Chọn một người → ghim 📍 nhảy
        tới chỗ họ; kéo ghim (hoặc chạm bản đồ) tới nơi muốn rồi bấm Lưu. Trên bản
        đồ thật của mọi người sẽ hiện {displayNameOf(role)} ở đó &amp; &ldquo;vừa
        cập nhật&rdquo;. Nếu người đó đang mở app + bật GPS, vị trí thật sẽ ghi đè
        sau khoảng 10 giây.
      </p>
    </section>
  );
}
