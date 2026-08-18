import type { LatLng } from "@/lib/scenic/types";

/** Hand-simplified geometry of central Paris, drawn rather than tiled. */

export const SEINE: LatLng[] = [
  { lng: 2.295, lat: 48.8645 },
  { lng: 2.308, lat: 48.8625 },
  { lng: 2.32, lat: 48.8608 },
  { lng: 2.331, lat: 48.8598 },
  { lng: 2.3395, lat: 48.858 },
  { lng: 2.347, lat: 48.8562 },
  { lng: 2.3545, lat: 48.8532 },
  { lng: 2.3625, lat: 48.8505 },
  { lng: 2.3695, lat: 48.8465 },
  { lng: 2.377, lat: 48.8435 },
  { lng: 2.39, lat: 48.8385 },
];

export const ILE_CITE: LatLng[] = [
  { lng: 2.3378, lat: 48.8572 },
  { lng: 2.3452, lat: 48.8566 },
  { lng: 2.3527, lat: 48.8537 },
  { lng: 2.3548, lat: 48.8524 },
  { lng: 2.3468, lat: 48.8522 },
  { lng: 2.3398, lat: 48.8552 },
];

export const ILE_SAINT_LOUIS: LatLng[] = [
  { lng: 2.3552, lat: 48.8531 },
  { lng: 2.3612, lat: 48.8512 },
  { lng: 2.3635, lat: 48.8498 },
  { lng: 2.3572, lat: 48.8508 },
];

export const PARKS: { name: string; ring: LatLng[] }[] = [
  {
    name: "Tuileries",
    ring: [
      { lng: 2.3222, lat: 48.8652 },
      { lng: 2.3342, lat: 48.8632 },
      { lng: 2.3338, lat: 48.8612 },
      { lng: 2.3218, lat: 48.8632 },
    ],
  },
  {
    name: "Luxembourg",
    ring: [
      { lng: 2.3322, lat: 48.8492 },
      { lng: 2.3418, lat: 48.8486 },
      { lng: 2.3412, lat: 48.8435 },
      { lng: 2.3326, lat: 48.844 },
    ],
  },
  {
    name: "Palais Royal",
    ring: [
      { lng: 2.3362, lat: 48.8662 },
      { lng: 2.3392, lat: 48.8661 },
      { lng: 2.3392, lat: 48.8638 },
      { lng: 2.3362, lat: 48.8639 },
    ],
  },
  {
    name: "Place des Vosges",
    ring: [
      { lng: 2.3644, lat: 48.8562 },
      { lng: 2.3668, lat: 48.856 },
      { lng: 2.3666, lat: 48.8548 },
      { lng: 2.3642, lat: 48.855 },
    ],
  },
  {
    name: "Jardin des Plantes",
    ring: [
      { lng: 2.3552, lat: 48.8455 },
      { lng: 2.3665, lat: 48.8442 },
      { lng: 2.3648, lat: 48.8398 },
      { lng: 2.3548, lat: 48.8415 },
    ],
  },
  {
    name: "Square du Temple",
    ring: [
      { lng: 2.3602, lat: 48.8668 },
      { lng: 2.3628, lat: 48.8666 },
      { lng: 2.3626, lat: 48.8652 },
      { lng: 2.36, lat: 48.8654 },
    ],
  },
];

export const STREETS: { w: number; pts: LatLng[] }[] = [
  // Rue de Rivoli / Saint-Antoine
  {
    w: 1.6,
    pts: [
      { lng: 2.3222, lat: 48.8655 },
      { lng: 2.3356, lat: 48.8628 },
      { lng: 2.3472, lat: 48.8595 },
      { lng: 2.3556, lat: 48.8562 },
      { lng: 2.3652, lat: 48.8542 },
      { lng: 2.3692, lat: 48.8532 },
    ],
  },
  // Grands Boulevards
  {
    w: 1.5,
    pts: [
      { lng: 2.3272, lat: 48.8712 },
      { lng: 2.3418, lat: 48.8715 },
      { lng: 2.3512, lat: 48.8702 },
      { lng: 2.3628, lat: 48.8676 },
    ],
  },
  // Boulevard de Sébastopol / Strasbourg
  {
    w: 1.4,
    pts: [
      { lng: 2.3488, lat: 48.8582 },
      { lng: 2.3512, lat: 48.868 },
      { lng: 2.3552, lat: 48.8742 },
    ],
  },
  // Boulevard Saint-Michel
  {
    w: 1.3,
    pts: [
      { lng: 2.3442, lat: 48.8536 },
      { lng: 2.3402, lat: 48.8478 },
      { lng: 2.3382, lat: 48.8425 },
    ],
  },
  // Boulevard Saint-Germain
  {
    w: 1.4,
    pts: [
      { lng: 2.3242, lat: 48.8598 },
      { lng: 2.3322, lat: 48.8552 },
      { lng: 2.3428, lat: 48.8522 },
      { lng: 2.3562, lat: 48.8498 },
      { lng: 2.3652, lat: 48.8462 },
    ],
  },
  // Avenue de l'Opéra
  {
    w: 1.3,
    pts: [
      { lng: 2.3316, lat: 48.8712 },
      { lng: 2.3348, lat: 48.8648 },
      { lng: 2.3362, lat: 48.8622 },
    ],
  },
  // Rue du Louvre / Montmartre axis
  {
    w: 1,
    pts: [
      { lng: 2.3402, lat: 48.8602 },
      { lng: 2.3428, lat: 48.8672 },
      { lng: 2.3438, lat: 48.8712 },
    ],
  },
  // Rue du Temple
  {
    w: 1,
    pts: [
      { lng: 2.3538, lat: 48.8582 },
      { lng: 2.3592, lat: 48.8642 },
      { lng: 2.3622, lat: 48.8688 },
    ],
  },
  // Rue de Turbigo
  {
    w: 1,
    pts: [
      { lng: 2.3462, lat: 48.8618 },
      { lng: 2.3552, lat: 48.8662 },
      { lng: 2.3632, lat: 48.8672 },
    ],
  },
  // Boulevard Beaumarchais
  {
    w: 1.2,
    pts: [
      { lng: 2.3688, lat: 48.8534 },
      { lng: 2.3668, lat: 48.8606 },
      { lng: 2.3642, lat: 48.8672 },
    ],
  },
  // Quais rive gauche
  {
    w: 0.9,
    pts: [
      { lng: 2.3222, lat: 48.8608 },
      { lng: 2.3348, lat: 48.8582 },
      { lng: 2.3468, lat: 48.8548 },
      { lng: 2.3572, lat: 48.8512 },
      { lng: 2.3662, lat: 48.8472 },
    ],
  },
  // Rue Saint-Jacques
  {
    w: 0.9,
    pts: [
      { lng: 2.3462, lat: 48.8532 },
      { lng: 2.3448, lat: 48.8462 },
      { lng: 2.3462, lat: 48.8412 },
    ],
  },
  // Rue de Rennes / Raspail
  {
    w: 1,
    pts: [
      { lng: 2.3322, lat: 48.8542 },
      { lng: 2.3268, lat: 48.8462 },
    ],
  },
  // Rue Réaumur
  {
    w: 1,
    pts: [
      { lng: 2.3372, lat: 48.8688 },
      { lng: 2.3512, lat: 48.8672 },
      { lng: 2.3612, lat: 48.8662 },
    ],
  },
  // Canal Saint-Martin
  {
    w: 1.1,
    pts: [
      { lng: 2.3648, lat: 48.8672 },
      { lng: 2.3672, lat: 48.8712 },
      { lng: 2.3688, lat: 48.8752 },
    ],
  },
];

/** Deterministic pseudo-random city blocks for texture. */
export function blocks(): { x: number; y: number; w: number; h: number; r: number }[] {
  let seed = 20261;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const out: { x: number; y: number; w: number; h: number; r: number }[] = [];
  for (let i = 0; i < 420; i++) {
    const lng = 2.3 + rnd() * 0.09;
    const lat = 48.838 + rnd() * 0.042;
    // skip the river corridor
    const riverLat = 48.8655 - (lng - 2.295) * 0.29;
    if (Math.abs(lat - riverLat) < 0.0016) continue;
    out.push({
      x: (lng - 2.28) * 1000,
      y: (48.885 - lat) * 1514,
      w: 1.2 + rnd() * 3.4,
      h: 1 + rnd() * 2.6,
      r: 0.3,
    });
  }
  return out;
}
