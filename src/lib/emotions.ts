export type EmotionTone = "supportive" | "warning" | "high-risk";

export type EmotionOption = {
  value: string;
  label: string;
  tone: EmotionTone;
};

export const emotionOptions: EmotionOption[] = [
  { value: "calm", label: "Calm", tone: "supportive" },
  { value: "focused", label: "Focused", tone: "supportive" },
  { value: "patient", label: "Patient", tone: "supportive" },
  { value: "confident", label: "Confident", tone: "supportive" },
  { value: "neutral", label: "Neutral", tone: "supportive" },
  { value: "anxious", label: "Anxious", tone: "warning" },
  { value: "tired", label: "Tired", tone: "warning" },
  { value: "overconfident", label: "Overconfident", tone: "warning" },
  { value: "impatient", label: "Impatient", tone: "high-risk" },
  { value: "fomo", label: "FOMO", tone: "high-risk" },
  { value: "frustrated", label: "Frustrated", tone: "high-risk" },
  { value: "angry", label: "Angry", tone: "high-risk" },
  { value: "revenge", label: "Revenge", tone: "high-risk" },
  { value: "chasing", label: "Chasing", tone: "high-risk" },
];

export function parseEmotionValues(value: string) {
  const knownValues = new Set(emotionOptions.map((emotion) => emotion.value));
  return value
    .split(",")
    .map((emotion) => emotion.trim().toLowerCase())
    .filter((emotion) => knownValues.has(emotion));
}

export function formatEmotions(value: string) {
  const labels = parseEmotionValues(value).map(
    (emotion) => emotionOptions.find((option) => option.value === emotion)?.label ?? emotion,
  );
  return labels.length ? labels.join(", ") : value;
}

export function getEmotionRisk(value: string): EmotionTone {
  const selected = new Set(parseEmotionValues(value));
  const selectedOptions = emotionOptions.filter((emotion) => selected.has(emotion.value));

  if (selectedOptions.some((emotion) => emotion.tone === "high-risk")) {
    return "high-risk";
  }

  if (selectedOptions.some((emotion) => emotion.tone === "warning")) {
    return "warning";
  }

  return "supportive";
}
