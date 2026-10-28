import { Suspense, useMemo, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Center, Environment } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";
import { files as filesApi } from "../api/client";
import "./Viewport.css";

function StlModel({ url }) {
  const [geometry, setGeometry] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setGeometry(null);
    setError(null);
    const loader = new STLLoader();
    loader.load(
      url,
      (geo) => {
        geo.computeVertexNormals();
        geo.center();
        setGeometry(geo);
      },
      undefined,
      () => setError("Failed to load STL"),
    );
    return () => setGeometry(null);
  }, [url]);

  if (error) return null;
  if (!geometry) return null;

  return (
    <Center>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#4ec9b0"
          metalness={0.3}
          roughness={0.6}
          flatShading={false}
        />
      </mesh>
    </Center>
  );
}

function SceneContent({ fileUrl }) {
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
      {fileUrl && (
        <Suspense fallback={null}>
          <StlModel url={fileUrl} />
        </Suspense>
      )}
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
    </>
  );
}

export default function Viewport({ file }) {
  const fileUrl = useMemo(() => {
    if (!file) return null;
    const ext = file.filename?.split(".").pop()?.toLowerCase();
    if (ext !== "stl") return null;
    return filesApi.contentUrl(file.id);
  }, [file]);

  return (
    <>
      <div className="panel-header">
        <span className="label">Viewport</span>
        {file && <span className="viewport-file">{file.filename}</span>}
      </div>
      <div className="viewport-canvas">
        {!fileUrl && (
          <div className="viewport-empty">
            {file && !fileUrl
              ? `Cannot preview ${file.filename}`
              : "No model to display"}
          </div>
        )}
        <Canvas
          camera={{ position: [4, 3, 4], fov: 50 }}
          style={{ display: fileUrl ? "block" : "none" }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => {
            gl.setClearColor("#1e1e1e");
          }}
        >
          <SceneContent fileUrl={fileUrl} />
        </Canvas>
      </div>
    </>
  );
}
