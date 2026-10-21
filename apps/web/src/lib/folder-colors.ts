import type { CSSProperties } from "react";
import type { FolderColor } from "./api-types";

export interface FolderTheme {
  bg: string;
  ink: string;
  solid: string;
  wash: string;
}

export const folderTheme: Record<FolderColor, FolderTheme> = {
  lilac: { bg: "#E6E0FF", ink: "#3D2C99", solid: "#8676F0", wash: "#F4F1FF" },
  mint: { bg: "#CFF0E0", ink: "#11593A", solid: "#2E9E68", wash: "#EEF9F3" },
  peach: { bg: "#FFE2CF", ink: "#8A3A0B", solid: "#EE8640", wash: "#FFF4EC" },
  lemon: { bg: "#FFF0B3", ink: "#614A00", solid: "#E2B408", wash: "#FFF9DE" },
  sky: { bg: "#D7EAFE", ink: "#0E4A7E", solid: "#3D8EDB", wash: "#EEF6FF" },
  rose: { bg: "#FFDCE8", ink: "#891B47", solid: "#E2588C", wash: "#FFF1F6" },
  sand: { bg: "#F1E6D2", ink: "#5A4220", solid: "#C29A5B", wash: "#F8F3EA" },
  sage: { bg: "#DCE9D5", ink: "#2F5126", solid: "#79A062", wash: "#F0F6EC" },
};

export const folderColorLabel: Record<FolderColor, string> = {
  lilac: "Lilás",
  mint: "Menta",
  peach: "Pêssego",
  lemon: "Limão",
  sky: "Céu",
  rose: "Rosa",
  sand: "Areia",
  sage: "Sálvia",
};

/** Variáveis locais `--f-*` para aplicar a cor da pasta sem montar classes por string. */
export function folderVars(color: FolderColor | null | undefined): CSSProperties {
  if (!color) return {};
  const t = folderTheme[color];
  return { "--f-bg": t.bg, "--f-ink": t.ink, "--f-solid": t.solid, "--f-wash": t.wash } as CSSProperties;
}
