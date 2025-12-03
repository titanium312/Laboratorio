// labItems.ts

export interface LabItem {
  idItem: number;
  nombre: string;
}

export const LAB_ITEMS: LabItem[] = [
  // 🟡 Glucosa
  { idItem: 7611, nombre: "GLUCOSA EN SUERO" },

  // 🔵 Perfil lipídico
  { idItem: 7474, nombre: "COLESTEROL TOTAL" },
  { idItem: 7475, nombre: "TRIGLICÉRIDOS" },
  { idItem: 7498, nombre: "COLESTEROL HDL" },
  { idItem: 7499, nombre: "COLESTEROL LDL" },

  // 🟣 Función renal
  { idItem: 7541, nombre: "UREA" },
  { idItem: 7504, nombre: "CREATININA" },

  // 🔴 Bilirrubinas
  { idItem: 7594, nombre: "BILIRRUBINA TOTAL" },
  { idItem: 7595, nombre: "BILIRRUBINA DIRECTA" },
  { idItem: 7596, nombre: "BILIRRUBINA INDIRECTA" },
];
