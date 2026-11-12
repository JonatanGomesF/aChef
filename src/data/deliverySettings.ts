export type DeliveryRule = {
  id: number;
  minKm: number;
  maxKm: number | null;
  fee: number;
  label: string;
};

export type DeliverySettings = {
  baseFee: number;
  freeDistanceKm: number;
  storeAddress: string;
  storeCep?: string;
  rules: DeliveryRule[];
};

const DEFAULT_SETTINGS: DeliverySettings = {
  baseFee: 0,
  freeDistanceKm: 1,
  storeAddress: "",
  storeCep: "11730-006",
  rules: [
    { id: 1, minKm: 1, maxKm: 1, fee: 3, label: "Acima de 1km" },
    { id: 2, minKm: 2, maxKm: 3, fee: 4, label: "Acima de 3km" },
    { id: 3, minKm: 4, maxKm: 4, fee: 6, label: "Acima de 4km" },
    { id: 4, minKm: 5, maxKm: 6, fee: 9, label: "Acima de 5km" },
    { id: 5, minKm: 7, maxKm: null, fee: 12, label: "Acima de 7km" },
  ],
};

export function getDefaultDeliverySettings(): DeliverySettings {
  return structuredClone(DEFAULT_SETTINGS);
}

function getRoundedDistanceKm(distanceKm: number): number {
  return Math.max(0, Math.ceil(distanceKm));
}

export function calculateDeliveryFee(distanceKm: number, settings: DeliverySettings) {
  if (distanceKm <= settings.freeDistanceKm) return settings.baseFee;

  const roundedDistance = getRoundedDistanceKm(distanceKm);
  const matchingRule = settings.rules.find((rule) => {
    if (rule.maxKm === null) return roundedDistance >= rule.minKm;
    return roundedDistance >= rule.minKm && roundedDistance <= rule.maxKm;
  });

  return matchingRule?.fee ?? settings.rules.at(-1)?.fee ?? settings.baseFee;
}
