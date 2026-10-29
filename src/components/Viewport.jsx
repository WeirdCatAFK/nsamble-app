import { Suspense, useMemo, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Center, Html } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { marked } from "marked";
import { files as filesApi } from "../api/client";
import "./Viewport.css";

const TEXT_EXTENSIONS = new Set(["scad", "json", "md", "txt", "kicad_sch", "kicad_pcb"]);
const IMAGE_EXTENSIONS = new Set(["svg", "png"]);

const PART_COLORS = ["#4ec9b0", "#569cd6", "#dcdcaa", "#c586c0", "#ce9178", "#6a9955"];

function StlModel({ projectId, fileId, color, offset, scanned, name, material, method, selected, onSelect }) {
  const [geometry, setGeometry] = useState(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setGeometry(null);
    let revoked = false;
    filesApi.contentBlob(projectId, fileId).then((blobUrl) => {
      const loader = new STLLoader();
      loader.load(blobUrl, (geo) => {
        geo.computeVertexNormals();
        geo.center();
        if (!revoked) setGeometry(geo);
        URL.revokeObjectURL(blobUrl);
      });
    }).catch(() => {});
    return () => { revoked = true; };
  }, [projectId, fileId]);

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      position={offset}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
      onClick={(e) => { e.stopPropagation(); onSelect?.(selected ? null : fileId); }}
    >
      <meshStandardMaterial
        color={scanned ? "#888888" : color}
        metalness={scanned ? 0.1 : 0.3}
        roughness={scanned ? 0.8 : 0.6}
        transparent={scanned || hovered}
        opacity={scanned ? 0.5 : 1}
        emissive={hovered ? "#ffffff" : "#000000"}
        emissiveIntensity={hovered ? 0.15 : 0}
      />
      {selected && name && (
        <Html distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="viewport-tooltip">
            <strong>{name}</strong>
            {material && <span>{material}</span>}
            {method && <span>{method}</span>}
          </div>
        </Html>
      )}
    </mesh>
  );
}

function SceneContent({ stlEntries, projectId, selectedId, onSelect }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />
      <directionalLight position={[-3, 4, -5]} intensity={0.3} />
      <Grid
        position={[0, -0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#3e3e42"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#4a4a4f"
        fadeDistance={50}
        infiniteGrid
      />
      <Center>
        <Suspense fallback={null}>
          {stlEntries.map((entry, i) => (
            <StlModel
              key={entry.id}
              projectId={projectId}
              fileId={entry.id}
              color={PART_COLORS[i % PART_COLORS.length]}
              offset={entry.manifestPos ? [entry.manifestPos.x || 0, entry.manifestPos.y || 0, entry.manifestPos.z || 0] : stlEntries.length > 1 ? [i * 3, 0, 0] : [0, 0, 0]}
              scanned={entry.scanned}
              name={entry.name}
              material={entry.material}
              method={entry.method}
              selected={selectedId === entry.id}
              onSelect={onSelect}
            />
          ))}
        </Suspense>
      </Center>
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
    </>
  );
}

export default function Viewport({ file, allFiles, projectId, scannedNames, parts, assemblyManifest }) {
  const [showAll, setShowAll] = useState(false);
  const [textContent, setTextContent] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  const fileExt = file?.name?.split(".").pop()?.toLowerCase();
  const isTextFile = fileExt && TEXT_EXTENSIONS.has(fileExt);
  const isImageFile = fileExt && IMAGE_EXTENSIONS.has(fileExt);

  useEffect(() => {
    setTextContent(null);
    if (!isTextFile || !file || !projectId) return;
    let cancelled = false;
    filesApi.contentText(projectId, file.id).then((text) => {
      if (!cancelled) setTextContent(text);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [file?.id, isTextFile, projectId]);

  useEffect(() => {
    setImageSrc(null);
    if (!isImageFile || !file || !projectId) return;
    let cancelled = false;
    filesApi.contentBlob(projectId, file.id).then((blobUrl) => {
      if (!cancelled) setImageSrc(blobUrl);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [file?.id, isImageFile, projectId]);

  const stlFiles = useMemo(
    () => (allFiles || []).filter((f) => f.name?.toLowerCase().endsWith(".stl")),
    [allFiles],
  );

  const isScanned = (name) => scannedNames?.has(name?.replace(/\.stl$/i, ""));

  const partsByName = useMemo(() => {
    const map = {};
    (parts || []).forEach((p) => { map[p.name] = p; });
    return map;
  }, [parts]);

  const manifestByPartId = useMemo(() => {
    const map = {};
    (assemblyManifest?.parts || []).forEach((p) => { map[p.partId] = p; });
    return map;
  }, [assemblyManifest]);

  const totalSteps = assemblyManifest?.totalSteps || 0;

  const enrichEntry = (f) => {
    const baseName = f.name?.replace(/\.stl$/i, "");
    const part = partsByName[baseName];
    const mp = manifestByPartId[baseName];
    return {
      id: f.id, scanned: isScanned(f.name), name: baseName,
      material: part?.material, method: part?.manufacturingMethod,
      manifestPos: mp?.position, manifestRot: mp?.rotation, step: mp?.step,
    };
  };

  const stlEntries = useMemo(() => {
    let entries;
    if (showAll && stlFiles.length > 0) {
      entries = stlFiles.map(enrichEntry);
    } else if (!file) {
      entries = [];
    } else {
      const ext = file.name?.split(".").pop()?.toLowerCase();
      entries = ext === "stl" ? [enrichEntry(file)] : [];
    }
    if (totalSteps > 0) return entries.filter((e) => !e.step || e.step <= currentStep);
    return entries;
  }, [file, showAll, stlFiles, scannedNames, parts, assemblyManifest, currentStep]);

  const label = showAll && stlFiles.length > 0
    ? `${stlFiles.length} models`
    : file?.name || null;

  return (
    <>
      <div className="panel-header">
        <span className="label">Viewport</span>
        <div className="viewport-controls">
          {label && <span className="viewport-file">{label}</span>}
          {totalSteps > 1 && (
            <div className="step-controls">
              <button className="step-btn" onClick={() => setCurrentStep((s) => Math.max(1, s - 1))} disabled={currentStep <= 1}>&larr;</button>
              <span className="step-counter">Step {currentStep} / {totalSteps}</span>
              <button className="step-btn" onClick={() => setCurrentStep((s) => Math.min(totalSteps, s + 1))} disabled={currentStep >= totalSteps}>&rarr;</button>
            </div>
          )}
          {stlFiles.length > 1 && (
            <button
              className="viewport-toggle"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Single" : "All"}
            </button>
          )}
        </div>
      </div>
      <div className="viewport-canvas">
        {isTextFile && textContent !== null ? (
          fileExt === "md" ? (
            <div className="md-preview" dangerouslySetInnerHTML={{ __html: marked.parse(textContent) }} />
          ) : (
            <pre className="text-preview">{textContent}</pre>
          )
        ) : isImageFile && imageSrc ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", padding: "1rem", background: "#1e1e1e" }}>
            <img src={imageSrc} alt={file?.name || ""} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </div>
        ) : stlEntries.length === 0 && !isImageFile ? (
          <div className="viewport-empty">
            {file ? `Cannot preview ${file.name}` : "No model to display"}
          </div>
        ) : null}
        <Canvas
          camera={{ position: [4, 3, 4], fov: 50 }}
          style={{ display: stlEntries.length > 0 && !isTextFile && !isImageFile ? "block" : "none" }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => {
            gl.setClearColor("#1e1e1e");
          }}
        >
          <SceneContent stlEntries={stlEntries} projectId={projectId} selectedId={selectedId} onSelect={setSelectedId} />
        </Canvas>
      </div>
    </>
  );
}
