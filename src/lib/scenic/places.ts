import type { Place } from "./types";

/** Searchable start / destination places. MOCK geocoder — swap for a real one. */
export const PLACES: Place[] = [
  { id: "opera", name: "Opéra Garnier", kind: "Landmark", area: "9th · Opéra", lat: 48.8719, lng: 2.3316 },
  { id: "place-des-vosges", name: "Place des Vosges", kind: "Square", area: "4th · Le Marais", lat: 48.8555, lng: 2.3655 },
  { id: "le-marais", name: "Le Marais", kind: "Neighborhood", area: "3rd / 4th", lat: 48.859, lng: 2.36 },
  { id: "louvre", name: "Musée du Louvre", kind: "Museum", area: "1st · Louvre", lat: 48.8606, lng: 2.3376 },
  { id: "notre-dame", name: "Notre-Dame de Paris", kind: "Cathedral", area: "4th · Île de la Cité", lat: 48.853, lng: 2.3499 },
  { id: "saint-germain", name: "Saint-Germain-des-Prés", kind: "Neighborhood", area: "6th", lat: 48.854, lng: 2.3335 },
  { id: "pompidou", name: "Centre Pompidou", kind: "Museum", area: "4th · Beaubourg", lat: 48.8607, lng: 2.3522 },
  { id: "hotel-de-ville", name: "Hôtel de Ville", kind: "Landmark", area: "4th", lat: 48.8565, lng: 2.3524 },
  { id: "bastille", name: "Place de la Bastille", kind: "Square", area: "11th", lat: 48.8532, lng: 2.3692 },
  { id: "republique", name: "Place de la République", kind: "Square", area: "3rd / 10th / 11th", lat: 48.8675, lng: 2.3636 },
  { id: "orsay", name: "Musée d'Orsay", kind: "Museum", area: "7th", lat: 48.86, lng: 2.3266 },
  { id: "pantheon", name: "Panthéon", kind: "Landmark", area: "5th · Latin Quarter", lat: 48.8462, lng: 2.3464 },
  { id: "luxembourg", name: "Jardin du Luxembourg", kind: "Garden", area: "6th", lat: 48.8462, lng: 2.3372 },
  { id: "chatelet", name: "Châtelet", kind: "Metro Station", area: "1st", lat: 48.8583, lng: 2.3471 },
  { id: "saint-sulpice", name: "Église Saint-Sulpice", kind: "Church", area: "6th", lat: 48.8511, lng: 2.3348 },
  { id: "concorde", name: "Place de la Concorde", kind: "Square", area: "8th", lat: 48.8656, lng: 2.3212 },
  { id: "gare-de-lyon", name: "Gare de Lyon", kind: "Station", area: "12th", lat: 48.8443, lng: 2.3743 },
  { id: "invalides", name: "Les Invalides", kind: "Landmark", area: "7th", lat: 48.8566, lng: 2.3126 },
  { id: "odeon", name: "Odéon", kind: "Metro Station", area: "6th", lat: 48.8521, lng: 2.3389 },
  { id: "montorgueil", name: "Rue Montorgueil", kind: "Market Street", area: "2nd", lat: 48.865, lng: 2.3468 },
  { id: "canal", name: "Canal Saint-Martin", kind: "Neighborhood", area: "10th", lat: 48.871, lng: 2.3665 },
  { id: "bourse", name: "Palais Brongniart", kind: "Landmark", area: "2nd · Bourse", lat: 48.8687, lng: 2.3413 },
  { id: "saint-paul", name: "Saint-Paul", kind: "Metro Station", area: "4th · Le Marais", lat: 48.8552, lng: 2.3609 },
  { id: "tuileries", name: "Jardin des Tuileries", kind: "Garden", area: "1st", lat: 48.8635, lng: 2.3272 },
  { id: "mouffetard", name: "Rue Mouffetard", kind: "Market Street", area: "5th", lat: 48.8425, lng: 2.3495 },
  { id: "ile-saint-louis", name: "Île Saint-Louis", kind: "Island", area: "4th", lat: 48.852, lng: 2.357 },
  { id: "sentier", name: "Sentier", kind: "Neighborhood", area: "2nd", lat: 48.8676, lng: 2.3477 },
  { id: "grands-boulevards", name: "Grands Boulevards", kind: "Metro Station", area: "9th", lat: 48.8715, lng: 2.3427 },
];

export const CURRENT_LOCATION_ID = "opera";

export const placeById = (id: string) => PLACES.find((p) => p.id === id);

export function searchPlaces(query: string): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return PLACES.slice(0, 8);
  return PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.area.toLowerCase().includes(q) ||
      p.kind.toLowerCase().includes(q),
  ).slice(0, 10);
}
