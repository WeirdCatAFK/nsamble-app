const TEXT_EXTENSIONS = new Set(["scad", "json", "md", "txt", "kicad_sch", "kicad_pcb", "ino", "ini", "cpp"]);
const IMAGE_EXTENSIONS = new Set(["svg", "png"]);

export function isPreviewable(name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  return ext === "stl" || TEXT_EXTENSIONS.has(ext) || IMAGE_EXTENSIONS.has(ext);
}

export function baseName(name) {
  if (!name) return "";
  const slash = name.lastIndexOf("/");
  return slash > -1 ? name.slice(slash + 1) : name;
}

export function isTextFile(name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

export function isImageFile(name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}
