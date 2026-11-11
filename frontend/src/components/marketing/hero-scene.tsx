"use client";

import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CheckCircle2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

interface HeroSceneProps {
  replayKey?: number;
}

// 6 Repository file definitions
const FILES = [
  { name: "src/queue/event-worker.ts", issue: null },
  { name: "src/middleware/cors.ts", issue: null },
  { name: "src/api/routes/preview.ts", issue: "SSRF preview", color: "#FFAC00" },
  { name: "src/services/webhook-client.ts", issue: "Hardcoded token", color: "#C10007" },
  { name: "src/auth/jwt-verifier.ts", issue: "Missing auth check", color: "#FFAC00" },
  { name: "src/db/query-builder.ts", issue: "SQL injection", color: "#C10007" },
];

function SceneContent({ replayKey }: { replayKey?: number }) {
  const { camera } = useThree();
  const groupRef = React.useRef<THREE.Group>(null);
  const scanPlaneRef = React.useRef<THREE.Mesh>(null);
  const cardsRef = React.useRef<(THREE.Group | null)[]>([]);
  const codeLinesRef = React.useRef<(THREE.Mesh | null)[][]>([]);
  const [activeIssues, setActiveIssues] = React.useState<boolean[]>([false, false, false]);
  const [showDiff, setShowDiff] = React.useState(false);
  const [showPR, setShowPR] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const cardColor = isDark ? "#121316" : "#FFFFFF";
  const borderColor = isDark ? "#222328" : "#E4E4E7";
  const neutralLineColor = isDark ? "#222328" : "#E4E4E7";

  // Mouse tilt tracking
  const pointer = React.useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  React.useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (isTouch || prefersReducedMotion) return;

    const handlePointerMove = (e: MouseEvent) => {
      // Normalize pointer [-1, 1]
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      // Max 4 degrees (~0.07 rad)
      pointer.current.targetX = nx * 0.05;
      pointer.current.targetY = ny * 0.05;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("mousemove", handlePointerMove);
  }, []);

  // Frame update for pointer tilt and ScrollTrigger camera scrub
  useFrame(() => {
    if (!groupRef.current) return;
    // Smooth lerp for tilt
    pointer.current.x += (pointer.current.targetX - pointer.current.x) * 0.08;
    pointer.current.y += (pointer.current.targetY - pointer.current.y) * 0.08;

    groupRef.current.rotation.y = -0.55 + pointer.current.x;
    groupRef.current.rotation.x = 0.45 + pointer.current.y;
  });

  // Master GSAP Timeline
  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setActiveIssues([true, true, true]);
      setShowDiff(true);
      setShowPR(true);
      return;
    }

    setActiveIssues([false, false, false]);
    setShowDiff(false);
    setShowPR(false);

    // Initial camera position
    camera.position.set(2.8, 3.2, 4.2);
    camera.lookAt(0, 0, 0);

    const tl = gsap.timeline();

    // 0.0s: Cards assemble from below, stagger 70ms
    cardsRef.current.forEach((card, i) => {
      if (card) {
        card.position.y = -1.2 + i * 0.22;
        card.scale.set(0.85, 0.85, 0.85);
        tl.to(
          card.position,
          {
            y: i * 0.24,
            duration: 0.5,
            ease: "power3.out",
          },
          i * 0.07
        );
        tl.to(
          card.scale,
          {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.5,
            ease: "power3.out",
          },
          i * 0.07
        );
      }
    });

    // 1.0s: Orange scan plane sweeps through stack, 1.2s, linear
    if (scanPlaneRef.current) {
      scanPlaneRef.current.position.y = 1.6;
      tl.to(
        scanPlaneRef.current.position,
        {
          y: -0.2,
          duration: 1.2,
          ease: "none",
        },
        1.0
      );
    }

    // Flagged lines trigger as plane sweeps
    tl.call(() => setActiveIssues([true, false, false]), [], 1.4);
    tl.call(() => setActiveIssues([true, true, false]), [], 1.8);
    tl.call(() => setActiveIssues([true, true, true]), [], 2.1);

    // 3.0s: Diff card slides out in front
    tl.call(() => setShowDiff(true), [], 3.0);

    // 4.2s: Pull Request card lands
    tl.call(() => setShowPR(true), [], 4.2);

    // Camera drift: 6% forward on scroll over first viewport
    const st = ScrollTrigger.create({
      trigger: "#hero-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        const drift = 1 - self.progress * 0.06;
        camera.position.set(2.8 * drift, 3.2 * drift, 4.2 * drift);
      },
    });

    return () => {
      tl.kill();
      st.kill();
    };
  }, [camera, replayKey]);

  return (
    <group ref={groupRef} position={[0.2, -0.1, 0]}>
      {/* 6 Isometric File Cards */}
      {FILES.map((file, i) => {
        const yPos = i * 0.24;
        return (
          <group
            key={file.name}
            ref={(el) => {
              cardsRef.current[i] = el;
            }}
            position={[0, yPos, 0]}
          >
            {/* Base Card Surface */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[3.2, 2.0]} />
              <meshBasicMaterial color={cardColor} />
            </mesh>

            {/* Hairline Border Outline */}
            <lineSegments position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <edgesGeometry args={[new THREE.PlaneGeometry(3.2, 2.0)]} />
              <lineBasicMaterial color={borderColor} linewidth={1} />
            </lineSegments>

            {/* Header file path label in DOM */}
            <Html
              position={[-1.45, 0.01, -0.75]}
              rotation={[-Math.PI / 2, 0, 0]}
              transform
              occlude="blending"
              scale={0.12}
            >
              <div className="font-mono text-[9px] text-muted-foreground font-medium tracking-tight whitespace-nowrap pointer-events-none select-none">
                {file.name}
              </div>
            </Html>

            {/* Code Line Bars (Neutral and Flagged) */}
            {[0, 1, 2, 3].map((lineIndex) => {
              const lineZ = -0.4 + lineIndex * 0.28;
              const isFlagged = file.issue !== null && lineIndex === 1;
              const issueIndex =
                file.name.includes("preview") ? 0 : file.name.includes("webhook") ? 1 : 2;
              const isFlagActive = isFlagged && activeIssues[issueIndex];
              const lineColor = isFlagActive ? file.color || "#C10007" : neutralLineColor;

              return (
                <mesh
                  key={lineIndex}
                  position={[-0.2, 0.004, lineZ]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  ref={(el) => {
                    if (!codeLinesRef.current[i]) codeLinesRef.current[i] = [];
                    codeLinesRef.current[i][lineIndex] = el;
                  }}
                >
                  <planeGeometry args={[lineIndex === 3 ? 1.6 : 2.5, 0.06]} />
                  <meshBasicMaterial color={lineColor} />
                </mesh>
              );
            })}

            {/* Real DOM annotation label appearing when flagged */}
            {file.issue && (
              <Html
                position={[1.75, 0.01, -0.12]}
                transform
                distanceFactor={5.5}
                className={cn(
                  "transition-all duration-300 pointer-events-none select-none",
                  activeIssues[
                    file.name.includes("preview") ? 0 : file.name.includes("webhook") ? 1 : 2
                  ]
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-2"
                )}
              >
                <div className="flex items-center gap-1.5 rounded border border-border bg-card px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-xs whitespace-nowrap">
                  <span
                    className="size-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: file.color || "#C10007" }}
                  />
                  <span>{file.issue}</span>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Solid Orange Scan Sweep Plane (0.14 opacity) */}
      <mesh
        ref={scanPlaneRef}
        position={[0, 1.6, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[3.6, 2.4]} />
        <meshBasicMaterial
          color="#F6821F"
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Foreground Element 1: Diff & Sandbox Card */}
      {showDiff && (
        <Html
          position={[-1.2, 0.2, 1.2]}
          transform
          distanceFactor={4.8}
          className="transition-all duration-400 ease-out will-change-transform pointer-events-none select-none"
        >
          <div className="w-[300px] rounded-lg border border-border bg-card p-3 font-mono text-xs shadow-xs text-foreground flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-border pb-1.5 text-[10px] text-muted-foreground">
              <span>src/db/query-builder.ts</span>
              <span className="text-muted-foreground/70">patch applied</span>
            </div>
            <div className="flex flex-col gap-1 text-[10px] leading-tight">
              <div className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive font-mono truncate">
                {'- query = `SELECT * FROM users WHERE id = ${id}`'}
              </div>
              <div className="rounded bg-success/10 px-1.5 py-0.5 text-success font-mono truncate">
                {'+ query = sql`SELECT * FROM users WHERE id = ${id}`'}
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-success font-medium">
              <CheckCircle2Icon className="size-3 shrink-0" />
              <span>Sandbox tests passed (14/14)</span>
            </div>
          </div>
        </Html>
      )}

      {/* Foreground Element 2: Pull Request Landed Card */}
      {showPR && (
        <Html
          position={[0.8, 0.5, 1.4]}
          transform
          distanceFactor={4.8}
          className="transition-all duration-350 ease-out will-change-transform pointer-events-none select-none"
        >
          <div className="w-[280px] rounded-lg border border-border bg-card p-3 text-xs shadow-xs text-foreground flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-success/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-success">
                OPEN
              </span>
              <span className="font-semibold text-xs text-foreground truncate">
                PR #128 opened
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Fix SQL injection in dynamic filter builder
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <span className="rounded bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                Approve &amp; merge
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                1 file • +1 -1
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function HeroScene({ replayKey }: HeroSceneProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(true);

  // Pause render loop when offscreen
  React.useEffect(() => {
    if (!containerRef.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[460px] lg:h-[540px] select-none"
    >
      <Canvas
        camera={{ position: [2.8, 3.2, 4.2], fov: 42 }}
        dpr={[1, 1.75]}
        frameloop={isVisible ? "always" : "never"}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={1.0} />
        <SceneContent replayKey={replayKey} />
      </Canvas>
    </div>
  );
}
