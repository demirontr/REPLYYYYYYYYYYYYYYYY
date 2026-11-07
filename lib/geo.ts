// Location helpers for proximity duels (owner: Claude 2).
// Pure functions are safe on server and client; watch/permission helpers are browser-only.

export type LatLng = { lat: number; lng: number };

export type LocatedUser = LatLng & {
  userId: number;
  updatedAt: string | Date;
};

/** Users within this distance can see and challenge each other. */
export const NEARBY_RADIUS_M = 50;
/** How often the browser pushes its position while the duel page is open. */
export const LOCATION_PUSH_INTERVAL_MS = 15_000;
/** Positions older than this are ignored (user closed the page or walked away). */
export const LOCATION_STALE_MS = 2 * 60_000;
/** Demo mode places the user this far from the chosen target. */
export const SIMULATED_DISTANCE_M = 10;

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in metres (Haversine). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isFresh(updatedAt: string | Date, now: number = Date.now()): boolean {
  return now - new Date(updatedAt).getTime() <= LOCATION_STALE_MS;
}

/**
 * Other users within `radiusM` of `me`, closest first, ignoring stale positions.
 * The server also offers `nearby_users()` in SQL; this is the client-side equivalent.
 */
export function filterNearby<T extends LocatedUser>(
  me: LatLng & { userId: number },
  others: T[],
  radiusM: number = NEARBY_RADIUS_M,
  now: number = Date.now(),
): Array<T & { distanceM: number }> {
  return others
    .filter((o) => o.userId !== me.userId && isFresh(o.updatedAt, now))
    .map((o) => ({ ...o, distanceM: haversineMeters(me, o) }))
    .filter((o) => o.distanceM <= radiusM)
    .sort((x, y) => x.distanceM - y.distanceM);
}

/** Move a point by metres north/east (small distances only — fine for demo offsets). */
export function offsetMeters(p: LatLng, northM: number, eastM: number): LatLng {
  const dLat = northM / EARTH_RADIUS_M;
  const dLng = eastM / (EARTH_RADIUS_M * Math.cos(toRad(p.lat)));
  return { lat: p.lat + toDeg(dLat), lng: p.lng + toDeg(dLng) };
}

/** Demo mode: a position `SIMULATED_DISTANCE_M` away from `target` in a random direction. */
export function simulateNear(target: LatLng, distanceM: number = SIMULATED_DISTANCE_M): LatLng {
  const angle = Math.random() * 2 * Math.PI;
  return offsetMeters(target, distanceM * Math.cos(angle), distanceM * Math.sin(angle));
}

// ---------- Browser-only ----------

export type LocationError = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

function mapError(err: GeolocationPositionError): LocationError {
  if (err.code === err.PERMISSION_DENIED) return 'denied';
  if (err.code === err.TIMEOUT) return 'timeout';
  return 'unavailable';
}

/**
 * Watch the device position and call `onPush` at most once per `intervalMs`.
 * Only call this after the user has explicitly turned on location sharing.
 * Returns a stop function.
 */
export function startLocationWatch(
  onPush: (pos: LatLng & { accuracyM: number }) => void,
  onError: (e: LocationError) => void,
  intervalMs: number = LOCATION_PUSH_INTERVAL_MS,
): () => void {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    onError('unsupported');
    return () => {};
  }
  let lastPush = 0;
  let latest: (LatLng & { accuracyM: number }) | null = null;

  const push = () => {
    if (!latest) return;
    lastPush = Date.now();
    onPush(latest);
  };

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      latest = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy,
      };
      if (Date.now() - lastPush >= intervalMs) push();
    },
    (err) => onError(mapError(err)),
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
  );
  // Keep the server copy fresh even when the device is not moving.
  const timer = setInterval(push, intervalMs);

  return () => {
    navigator.geolocation.clearWatch(watchId);
    clearInterval(timer);
  };
}
