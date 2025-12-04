export interface ServiceTypeDefinition {
  key: string;
  icon: string;
  label: { eng: string; srb: string };
  description: { eng: string; srb: string };
  iconBg: string;
  iconColor: string;
  ringColor: string;
}

export const SERVICE_TYPE_DEFINITIONS: ServiceTypeDefinition[] = [
  {
    key: "breakfast",
    icon: "🍳",
    label: { eng: "Breakfast", srb: "Doručak" },
    description: { eng: "Morning bites & coffee", srb: "Jutarnji zalogaji i kafa" },
    iconBg: "#FEF3C7",
    iconColor: "#78350F",
    ringColor: "rgba(255, 174, 0, 0.72)",
  },
  {
    key: "lunch",
    icon: "🍽️",
    label: { eng: "Lunch", srb: "Ručak" },
    description: { eng: "Midday menu or quick meal", srb: "Ručni meni ili brzi obrok" },
    iconBg: "#FDE68A",
    iconColor: "#92400E",
    ringColor: "rgba(217,119,6,0.5)",
  },
  {
    key: "dinner",
    icon: "🥩",
    label: { eng: "Dinner", srb: "Večera" },
    description: { eng: "Evening tasting or fine dining", srb: "Večernji meni ili fine dining" },
    iconBg: "#FBCFE8",
    iconColor: "#831843",
    ringColor: "rgba(236,72,153,0.45)",
  },
  {
    key: "drinks",
    icon: "🥂",
    label: { eng: "Drinks", srb: "Piće" },
    description: { eng: "Cocktails, wine or afterwork", srb: "Kokteli, vino ili afterwork" },
    iconBg: "rgb(173, 144, 207)",
    iconColor: "#1E3A8A",
    ringColor: "rgba(190, 106, 255, 0.45)",
  },
  {
    key: "coffee",
    icon: "☕️",
    label: { eng: "Coffee & dessert", srb: "Kafa i desert" },
    description: { eng: "Sweet break or espresso chat", srb: "Slatka pauza ili espresso susret" },
    iconBg: "#FDEAD7",
    iconColor: "#7B341E",
    ringColor: "rgba(180,83,9,0.4)",
  },
  {
    key: "celebration",
    icon: "🎉",
    label: { eng: "Celebration", srb: "Proslava" },
    description: { eng: "Birthday, anniversary, surprise", srb: "Rođendan, godišnjica, iznenađenje" },
    iconBg: "#EDE9FE",
    iconColor: "#4C1D95",
    ringColor: "rgba(139,92,246,0.45)",
  },
  {
    key: "meeting",
    icon: "💼",
    label: { eng: "Business meeting", srb: "Poslovni sastanak" },
    description: { eng: "Corporate lunch or briefing", srb: "Poslovni ručak ili sastanak" },
    iconBg: "#D1FAE5",
    iconColor: "#065F46",
    ringColor: "rgba(16,185,129,0.45)",
  },
];

const normalizeValue = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const matchServiceTypeDefinition = (rawValue?: string): ServiceTypeDefinition | undefined => {
  if (!rawValue) return undefined;
  const normalized = normalizeValue(rawValue);
  return SERVICE_TYPE_DEFINITIONS.find((definition) => {
    const candidates = [
      definition.key,
      definition.label.eng,
      definition.label.srb,
    ].map(normalizeValue);
    return candidates.includes(normalized);
  });
};

export const parseServiceTypeTokens = (rawValue?: string): string[] => {
  if (!rawValue) return [];
  return rawValue
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
};

