import { Suspense, useMemo, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Center } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { files as filesApi } from "../api/client";
import "./Viewport.css";

const PART_COLORS = ["#4ec9b0", "#569cd6", "#dcdcaa", "#c586c0", "#ce9178", "#6a9955"];

function StlModel({ projectId, fileId, color, offset }) {
  const [geometry, setGeometry] = useState(null);

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
    <mesh geometry={geometry} position={offset}>
      <meshStandardMaterial
        color={color}
        metalness={0.3}
        roughness={0.6}
      />
    </mesh>
  );
}

function SceneContent({ stlEntries, projectId }) {
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
              offset={stlEntries.length > 1 ? [i * 3, 0, 0] : [0, 0, 0]}
            />
          ))}
        </Suspense>
      </Center>
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
    </>
  );
}

export default function Viewport({ file, allFiles, projectId }) {
  const [showAll, setShowAll] = useState(false);

  const stlFiles = useMemo(
    () => (allFiles || []).filter((f) => f.name?.toLowerCase().endsWith(".stl")),
    [allFiles],
  );

  const stlEntries = useMemo(() => {
    if (showAll && stlFiles.length > 0) {
      return stlFiles.map((f) => ({ id: f.id }));
    }
    if (!file) return [];
    const ext = file.name?.split(".").pop()?.toLowerCase();
    if (ext !== "stl") return [];
    return [{ id: file.id }];
  }, [file, showAll, stlFiles]);

  const label = showAll && stlFiles.length > 0
    ? `${stlFiles.length} models`
    : file?.name || null;

  return (
    <>
      <div className="panel-header">
        <span className="label">Viewport</span>
        <div className="viewport-controls">
          {label && <span className="viewport-file">{label}</span>}
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
        {stlEntries.length === 0 && (
          <div className="viewport-empty">
            {file && !stlEntries.length
              ? `Cannot preview ${file.name}`
              : "No model to display"}
          </div>
        )}
        <Canvas
          camera={{ position: [4, 3, 4], fov: 50 }}
          style={{ display: stlEntries.length > 0 ? "block" : "none" }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => {
            gl.setClearColor("#1e1e1e");
          }}
        >
          <SceneContent stlEntries={stlEntries} projectId={projectId} />
        </Canvas>
      </div>
    </>
  );
}
