import { useMemo } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Float, ContactShadows, Grid } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { EdgesGeometry, Vector3 } from "three";

// Raspberry Pi 4 case shown in the hero: base + lid with GPIO cutout, from
// the google-coral/mechanicals repository (see public/models/README.md).
// Served locally so the hero does not depend on a runtime CDN fetch.
// Rendered like the viewport previews parts, but with feature edges picked
// out in the page colours so it reads as a wireframe on the dark background.
const BASE_URL = "/models/rpi-case-base.stl";
const TOP_URL = "/models/rpi-case-top.stl";

function CasePart({ url, position, edgeColor }) {
  const geometry = useLoader(STLLoader, url);
  const { solid, edges, scale } = useMemo(() => {
    const solidGeo = geometry.clone();
    solidGeo.computeVertexNormals();
    solidGeo.center();
    solidGeo.computeBoundingBox();
    const size = solidGeo.boundingBox.getSize(new Vector3());
    // Width in the STL's XY plane becomes the case footprint once laid flat.
    const width = Math.max(size.x || 0, 1);
    return {
      solid: solidGeo,
      edges: new EdgesGeometry(solidGeo, 28),
      scale: 4.6 / width,
    };
  }, [geometry]);

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
      <mesh geometry={solid}>
        <meshStandardMaterial
          color="#252A2E"
          roughness={0.55}
          metalness={0.25}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={edgeColor} transparent opacity={0.85} />
      </lineSegments>
    </group>
  );
}

export default function HeroScene() {
  const reduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const parts = (
    <>
      <CasePart url={BASE_URL} position={[0, -0.55, 0]} edgeColor="#E6E8E5" />
      <CasePart url={TOP_URL} position={[0, 0.95, 0]} edgeColor="#A6A78F" />
    </>
  );

  return (
    <Canvas
      camera={{ position: [5.2, 3.0, 6.0], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
      aria-label="Interactive 3D Raspberry Pi case. Drag to rotate."
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 5]} intensity={1.3} />
      <directionalLight position={[-4, 3, -5]} intensity={0.4} />
      {reduced ? parts : (
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4} floatingRange={[-0.05, 0.05]}>
          {parts}
        </Float>
      )}
      <ContactShadows position={[0, -1.75, 0]} opacity={0.5} scale={13} blur={2.4} far={3} color="#000000" />
      <Grid
        position={[0, -1.76, 0]}
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2A3138"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#3A4147"
        fadeDistance={22}
        infiniteGrid
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        autoRotate={!reduced}
        autoRotateSpeed={0.8}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0.7}
        maxPolarAngle={2.1}
      />
    </Canvas>
  );
}
