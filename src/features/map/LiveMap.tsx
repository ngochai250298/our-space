"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LiveLocation, Role, Session } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import {
  FRESH_MS,
  loadStoredLocations,
  pushOwnLocation,
  storeLocation,
  subscribeLocations,
} from "@/lib/location";
import { getSupabaseConfig } from "@/lib/supabase";
import { avatarOf, canSee, displayNameOf, genderOf, isAdmin } from "@/lib/auth";
import { distanceKm, formatKm } from "@/lib/geo";
import { placeLabel } from "@/lib/geocode";
import { useFriendLinks } from "@/hooks/useFriendLinks";
import { linkFor, partnerInLink } from "@/lib/friends";

const UPDATE_INTERVAL_MS = 10_000;
const COUPLE: Role[] = ["anh", "em"];

function emojiOf(role: Role): string {
  return genderOf(role) === "male" ? "👨🏻" : "👩🏻";
}

function timeAgo(ts: number): string {
  const minutes = Math.round((Date.now() - ts) / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(ts).toLocaleDateString("vi-VN");
}

function markerHtml(role: Role, approx: boolean): string {
  const name = displayNameOf(role);
  const pill = approx
    ? `<span style="background:#b0a4a5;color:#fff;font-size:10px;font-weight:600;
        padding:2px 8px;border-radius:999px;white-space:nowrap;">${name} · gần đúng</span>`
    : `<span style="background:#e76f6f;color:#fff;font-size:11px;font-weight:600;
        padding:2px 8px;border-radius:999px;white-space:nowrap;">${name}</span>`;
  const border = approx ? "#b0a4a5" : "#e76f6f";
  const opacity = approx ? "0.75" : "1";
  const url = avatarOf(role);
  const inner = url
    ? `<img src="${url}" style="width:44px;height:44px;border-radius:999px;object-fit:cover;
        border:3px solid ${border};box-shadow:0 4px 12px rgba(0,0,0,.2);" />`
    : `<span style="display:grid;place-items:center;width:44px;height:44px;font-size:22px;
        background:#fff;border:3px solid ${border};border-radius:999px;
        box-shadow:0 4px 12px rgba(0,0,0,.2);">${emojiOf(role)}</span>`;
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;opacity:${opacity};">
      ${pill}
      ${inner}
    </div>`;
}

function mapsLink(loc: LiveLocation): string {
  const query = `${loc.lat},${loc.lng}`;
  return `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}"
      target="_blank" rel="noopener noreferrer"
      style="color:#e76f6f;font-weight:600;text-decoration:underline;">🗺️ Click vào đây để xem</a>`;
}

function popupHtml(loc: LiveLocation, place: string, showExact: boolean): string {
  const lines = [
    `<b>${emojiOf(loc.role)} ${displayNameOf(loc.role)}</b>`,
    `📍 ${place}`,
    loc.approx
      ? `⚠️ Vị trí gần đúng — chưa có định vị thật`
      : `🕐 Cập nhật ${timeAgo(loc.updatedAt)} · 🎯 ~${Math.round(loc.accuracy)} m`,
  ];
  // The exact-coordinates link is meaningless on an "approx" fix — that is
  // just the person's home city, not a GPS reading.
  if (showExact && !loc.approx) lines.push(mapsLink(loc));
  return `<div style="font-size:12px;line-height:1.6;min-width:150px;">${lines.join("<br/>")}</div>`;
}

export function LiveMap({ session }: { session: Session }) {
  const { settings, ready } = useSettings();
  const { links, ready: linksReady } = useFriendLinks();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Partial<Record<Role, Marker>>>({});
  const lineRef = useRef<Polyline | null>(null);
  const locationsRef = useRef<Partial<Record<Role, LiveLocation>>>({});
  // Resolved place names ("TP.HCM, Phường Thạnh Mỹ Tây, Việt Nam") per person.
  const labelsRef = useRef<Partial<Record<Role, string>>>({});
  const [km, setKm] = useState<number | null>(null);
  const [targetInfo, setTargetInfo] = useState<{ approx: boolean; updatedAt: number } | null>(null);
  const [geoError, setGeoError] = useState("");
  const synced = getSupabaseConfig() !== null;
  // The dashed line points to Bình — except Bình herself, whose line points to
  // Hải, and friends the admin wired to someone, whose line points at them.
  const myLink = linkFor(links, session.role);
  const target: Role = myLink
    ? partnerInLink(myLink, session.role)
    : session.role === "em"
      ? "anh"
      : "em";

  useEffect(() => {
    if (!ready || !linksReady || !containerRef.current || mapRef.current) return;

    const me = session.role;
    let disposed = false;
    let intervalId = 0;
    let unsubscribe: (() => void) | undefined;
    let onAccounts: (() => void) | undefined;

    // Seed: the couple always appears (home cities as explicit "gần đúng"
    // fallbacks); everyone else appears once they have a stored/live fix.
    // Anyone outside my circle is dropped here and never reaches the map.
    const stored = loadStoredLocations();
    (Object.keys(stored) as Role[]).forEach((role) => {
      const fix = stored[role];
      if (!fix || !canSee(me, role)) return;
      const fresh = Date.now() - fix.updatedAt < FRESH_MS;
      locationsRef.current[role] = {
        ...fix,
        approx: role === me ? fix.approx : !fresh || fix.approx,
      };
    });
    COUPLE.forEach((role) => {
      if (locationsRef.current[role]) return;
      const place = settings.places[role as "anh" | "em"];
      locationsRef.current[role] = {
        role,
        lat: place.lat,
        lng: place.lng,
        accuracy: 5000,
        updatedAt: Date.now(),
        approx: true,
      };
    });

    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !containerRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: false });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;

      const icon = (role: Role, approx: boolean) =>
        L.divIcon({
          className: "ourspace-marker",
          html: markerHtml(role, approx),
          iconSize: [60, 68],
          iconAnchor: [30, 60],
        });

      const placeFor = (role: Role, loc: LiveLocation): string => {
        if (!loc.approx && labelsRef.current[role]) return labelsRef.current[role]!;
        if (role === "anh" || role === "em") {
          const fallback = settings.places[role];
          return `${fallback.city}, ${fallback.country}`;
        }
        return labelsRef.current[role] ?? "Đang xác định vị trí…";
      };

      // Only Hải gets the "open in Google Maps" link, and only on other
      // people's markers — his own position is already his own device.
      const showExactFor = (role: Role) => isAdmin(me) && role !== me;

      // Drop a marker for someone outside my circle. Needed as well as the
      // filters below because the account list (and so everyone's group) may
      // land after the first markers are drawn.
      const hide = (role: Role) => {
        const marker = markersRef.current[role];
        if (marker) {
          marker.remove();
          delete markersRef.current[role];
        }
        delete locationsRef.current[role];
      };

      const redraw = () => {
        const locs = locationsRef.current;
        (Object.keys(locs) as Role[]).forEach((role) => {
          const loc = locs[role];
          if (!loc) return;
          if (!canSee(me, role)) {
            hide(role);
            return;
          }
          const place = placeFor(role, loc);
          const html = popupHtml(loc, place, showExactFor(role));
          const existing = markersRef.current[role];
          if (existing) {
            existing.setLatLng([loc.lat, loc.lng]);
            existing.setIcon(icon(role, loc.approx === true));
            existing.setPopupContent(html);
          } else {
            markersRef.current[role] = L.marker([loc.lat, loc.lng], {
              icon: icon(role, loc.approx === true),
            })
              .addTo(map)
              .bindPopup(html);
          }
        });

        // The dashed line + distance run from the viewer to their target
        // (everyone → Bình; Bình → Hải).
        const a = locs[me];
        const b = locs[target];
        if (a && b) {
          const points: [number, number][] = [
            [a.lat, a.lng],
            [b.lat, b.lng],
          ];
          if (lineRef.current) lineRef.current.setLatLngs(points);
          else
            lineRef.current = L.polyline(points, {
              color: "#e76f6f",
              weight: 2.5,
              dashArray: "2 8",
            }).addTo(map);
          setKm(distanceKm(a.lat, a.lng, b.lat, b.lng));
          setTargetInfo({
            approx: b.approx === true,
            updatedAt: b.updatedAt,
          });
        }
      };

      const fitAll = () => {
        const points = Object.values(locationsRef.current)
          .filter((loc) => loc !== undefined)
          .map((loc) => [loc.lat, loc.lng] as [number, number]);
        if (points.length >= 2) map.fitBounds(points, { padding: [60, 60] });
        else if (points.length === 1) map.setView(points[0], 12);
      };

      const refreshLabel = (role: Role) => {
        const loc = locationsRef.current[role];
        if (!loc || loc.approx) return;
        void placeLabel(loc.lat, loc.lng).then((label) => {
          if (disposed || !label || labelsRef.current[role] === label) return;
          labelsRef.current[role] = label;
          redraw();
        });
      };

      redraw();
      fitAll();
      (Object.keys(locationsRef.current) as Role[]).forEach(refreshLabel);

      const applyLocation = (loc: LiveLocation) => {
        // Never store, draw or cache a position I'm not allowed to see — the
        // couple's circle and the friends' circle stay apart on-device too.
        if (!canSee(me, loc.role)) return;
        const isNew = !locationsRef.current[loc.role];
        locationsRef.current[loc.role] = loc;
        storeLocation(loc);
        redraw();
        if (isNew) fitAll();
        refreshLabel(loc.role);
      };

      // Own position: real GPS, prompting for permission here on the map.
      const readPosition = () => {
        pushOwnLocation(me, { prompt: true })
          .then((loc) => {
            if (disposed || !loc) return;
            setGeoError("");
            applyLocation(loc);
          })
          .catch(() =>
            setGeoError("Chưa bật quyền vị trí — vị trí của bạn đang hiển thị gần đúng.")
          );
      };
      readPosition();
      intervalId = window.setInterval(readPosition, UPDATE_INTERVAL_MS);

      // Everyone else's positions: only real, synced data moves markers.
      unsubscribe = subscribeLocations((loc) => {
        if (!disposed && loc.role !== me) applyLocation(loc);
      });

      // Refresh markers when someone changes their avatar/name.
      onAccounts = () => redraw();
      window.addEventListener("ourspace:accounts", onAccounts);
    })();

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      unsubscribe?.();
      if (onAccounts) window.removeEventListener("ourspace:accounts", onAccounts);
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
      lineRef.current = null;
    };
    // The map is created once per mount; settings are read at creation time.
    // `target` is in the deps so the dashed line re-anchors once the admin's
    // friend links load (or change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, linksReady, session.role, target]);

  return (
    <div className="relative -mx-4 h-[calc(100dvh-11.5rem)] overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />

      {geoError && (
        <p className="absolute left-1/2 top-3 z-[1000] w-[85%] -translate-x-1/2 rounded-2xl bg-surface/95 px-4 py-2 text-center text-xs text-muted shadow">
          {geoError}
        </p>
      )}

      {/* Distance card — from the viewer to their target */}
      <div className="card absolute inset-x-4 bottom-4 z-[1000] px-4 py-3.5 text-center">
        <p className="text-xs text-muted">
          Khoảng cách chúng ta
          {targetInfo?.approx && (
            <span className="text-muted/80"> (gần đúng)</span>
          )}
        </p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink">
          {km === null ? "…" : `${formatKm(km)} km`} <span aria-hidden>❤️</span>
        </p>
        {targetInfo && !targetInfo.approx && (
          <p className="mt-0.5 text-[11px] text-muted">
            Vị trí {displayNameOf(target)} cập nhật {timeAgo(targetInfo.updatedAt)}
          </p>
        )}
        {targetInfo?.approx && (
          <p className="mt-0.5 text-[11px] text-muted">
            {synced ? (
              <>Chờ {displayNameOf(target)} mở web để có vị trí thật 💗</>
            ) : (
              <>
                Bật đồng bộ trong{" "}
                <Link href="/settings" className="font-semibold text-primary-strong underline">
                  Settings
                </Link>{" "}
                để thấy vị trí thật của nhau
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
