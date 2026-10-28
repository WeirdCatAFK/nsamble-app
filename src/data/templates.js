export const templates = [
  {
    id: "server-casing",
    name: "Server Casing",
    description: "Rack-mountable MicroATX enclosure with side ventilation and cable management.",
    files: ["casing-body.stl", "side-panel.stl", "front-io.stl", "casing.scad"],
    category: "enclosures",
  },
  {
    id: "sensor-housing",
    name: "Sensor Housing",
    description: "Weatherproof enclosure for outdoor sensor arrays with mounting brackets.",
    files: ["housing-top.stl", "housing-base.stl", "bracket.stl", "housing.scad"],
    category: "enclosures",
  },
  {
    id: "rpi-case",
    name: "Raspberry Pi Case",
    description: "Snap-fit case for Raspberry Pi 4/5 with GPIO access and fan mount.",
    files: ["case-top.stl", "case-bottom.stl", "fan-mount.stl", "rpi-case.scad"],
    category: "enclosures",
  },
  {
    id: "battery-enclosure",
    name: "Battery Enclosure",
    description: "Protective enclosure for USB battery packs with integrated cable routing.",
    files: ["enclosure-shell.stl", "lid.stl", "enclosure.scad"],
    category: "enclosures",
  },
  {
    id: "custom-bracket",
    name: "Mounting Bracket",
    description: "Parametric L-bracket with configurable hole patterns and wall thickness.",
    files: ["bracket.stl", "bracket.scad"],
    category: "structural",
  },
];
