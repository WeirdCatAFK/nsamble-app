export const MACHINE_TYPES = [
  { id: "3d-printer", label: "3D printer" },
  { id: "laser-cutter", label: "Laser cutter" },
  { id: "cnc-mill", label: "CNC mill" },
  { id: "vinyl-cutter", label: "Vinyl cutter" },
  { id: "other", label: "Other" },
];

const ICON_KEYS = {
  "3dprinter": "3d-printer",
  "fdmprinter": "3d-printer",
  "resinprinter": "3d-printer",
  "slaprinter": "3d-printer",
  "lasercutter": "laser-cutter",
  "laserengraver": "laser-cutter",
  "cncmill": "cnc-mill",
  "cncrouter": "cnc-mill",
  "cnc": "cnc-mill",
  "vinylcutter": "vinyl-cutter",
  "plotter": "vinyl-cutter",
};

export function machineIconKey(type) {
  if (typeof type !== "string") return "other";
  const normalized = type.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ICON_KEYS[normalized] ?? "other";
}
