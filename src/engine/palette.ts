/** One shared, limited palette keeps every episode visually coherent. */
export const C = {
  ink: "#171226", plum: "#2a2045", violet: "#473a7a", lav: "#8f86c9", mist: "#c9c4ea",
  white: "#fbf6ea", cream: "#f1e2c4",
  skin: "#f4b98f", skinD: "#d98b69",
  red: "#e8453c", redD: "#a82a3b", orange: "#f5902f", yellow: "#ffd23f", yellowD: "#e0a020",
  lime: "#9be04f", green: "#3aa655", greenD: "#1f6e4a", teal: "#2fb8b0",
  sky: "#7cc6f5", skyL: "#bde8ff", blue: "#3b6fe0", blueD: "#2a47a8", cyan: "#bff4ff",
  pink: "#ff8fb1", brown: "#8a5a3b", brownD: "#5a3a2a",
  gray: "#9aa0b8", grayD: "#5d637f", grayL: "#d6d9e6",
} as const;
export type Color = string;
