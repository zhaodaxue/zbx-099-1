import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useAppStore, getCurrentTree } from '@/store/useAppStore';
import {
  computeBallPosition,
  computeLiftHeight,
  computeCableTonnage,
  checkPathCollision,
  vecAdd,
} from '@/utils/liftingMath';
import type { Vec3, TreeData } from '@/types';

export default function Scene3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number>(0);
  const objectsRef = useRef<{
    soilBall?: THREE.Mesh;
    treeTrunk?: THREE.Mesh;
    obstacles: THREE.Mesh[];
    liftPoints: THREE.Group[];
    targetPit?: THREE.Mesh;
    pathLine?: THREE.Line;
    cables: THREE.Line[];
    pathHasCollision: boolean;
  }>({ obstacles: [], liftPoints: [], cables: [], pathHasCollision: false });
  const rafRef = useRef<number>(0);

  const selectedLiftPoints = useAppStore(s => s.selectedLiftPoints);
  const swingCm = useAppStore(s => s.swingCm);
  const animationProgress = useAppStore(s => s.animationProgress);
  const isAnimating = useAppStore(s => s.isAnimating);
  const setAnimationProgress = useAppStore(s => s.setAnimationProgress);
  const setIsAnimating = useAppStore(s => s.setIsAnimating);
  const setCanvasRef = useAppStore(s => s.setCanvasRef);
  const currentTreeId = useAppStore(s => s.currentTreeId);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1419);
    scene.fog = new THREE.Fog(0x0f1419, 30, 80);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );
    camera.position.set(18, 16, 22);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    setCanvasRef(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 3, 0);
    controls.minDistance = 5;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 2.1;
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x4a9eff, 0.3);
    fillLight.position.set(-10, 8, -10);
    scene.add(fillLight);

    const groundGeo = new THREE.PlaneGeometry(60, 60, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2332,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(60, 60, 0x2a3a4e, 0x1e2a3a);
    (gridHelper.material as THREE.Material).opacity = 0.5;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(4);
    scene.add(axesHelper);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [setCanvasRef]);

  useEffect(() => {
    const tree = getCurrentTree();
    if (!tree || !sceneRef.current) return;
    buildScene(tree);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTreeId]);

  useEffect(() => {
    updateDynamicElements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLiftPoints, swingCm, currentTreeId]);

  useEffect(() => {
    if (isAnimating) {
      const startTime = performance.now();
      const duration = 4000;
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setAnimationProgress(progress);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setIsAnimating(false);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isAnimating, setAnimationProgress, setIsAnimating]);

  useEffect(() => {
    animateSoilBall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationProgress, selectedLiftPoints, currentTreeId, swingCm]);

  function clearDynamicObjects() {
    const scene = sceneRef.current;
    if (!scene) return;
    const { soilBall, treeTrunk, obstacles, liftPoints, targetPit, pathLine, cables } = objectsRef.current;
    [soilBall, treeTrunk, targetPit, pathLine].forEach(obj => {
      if (obj) {
        scene.remove(obj);
        disposeObject(obj);
      }
    });
    obstacles.forEach(o => { scene.remove(o); disposeObject(o); });
    liftPoints.forEach(l => { scene.remove(l); disposeObject(l); });
    cables.forEach(c => { scene.remove(c); disposeObject(c); });
    objectsRef.current = { obstacles: [], liftPoints: [], cables: [], pathHasCollision: false };
  }

  function disposeObject(obj: THREE.Object3D) {
    obj.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => m.dispose());
      }
    });
  }

  function buildScene(tree: TreeData) {
    const scene = sceneRef.current;
    if (!scene) return;
    clearDynamicObjects();

    const ballRadius = tree.soilBall.diameter / 2;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 48, 48);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x8b6914,
      roughness: 0.9,
      metalness: 0.05,
    });
    const soilBall = new THREE.Mesh(ballGeo, ballMat);
    soilBall.position.set(
      tree.soilBall.centerOfMass.x,
      tree.soilBall.centerOfMass.y,
      tree.soilBall.centerOfMass.z
    );
    soilBall.castShadow = true;
    soilBall.receiveShadow = true;
    scene.add(soilBall);
    objectsRef.current.soilBall = soilBall;

    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 4, 12);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      roughness: 0.95,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(
      tree.soilBall.centerOfMass.x,
      tree.soilBall.centerOfMass.y + ballRadius + 2,
      tree.soilBall.centerOfMass.z
    );
    trunk.castShadow = true;
    scene.add(trunk);
    objectsRef.current.treeTrunk = trunk;

    tree.obstacles.forEach(obs => {
      const geo = new THREE.BoxGeometry(obs.size.x, obs.size.y, obs.size.z);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x4a5568,
        transparent: true,
        opacity: 0.55,
        roughness: 0.8,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });
      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 })
      );
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(obs.position.x, obs.position.y, obs.position.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.add(line);
      mesh.userData = { obstacleId: obs.id };
      scene.add(mesh);
      objectsRef.current.obstacles.push(mesh);
    });

    tree.liftPoints.forEach(lp => {
      const group = new THREE.Group();

      const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, lp.position.y, 8);
      const poleMat = new THREE.MeshStandardMaterial({
        color: 0x374151,
        metalness: 0.7,
        roughness: 0.3,
      });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(lp.position.x, lp.position.y / 2, lp.position.z);
      pole.castShadow = true;
      group.add(pole);

      const baseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.3, 16);
      const base = new THREE.Mesh(baseGeo, poleMat);
      base.position.set(lp.position.x, 0.15, lp.position.z);
      base.receiveShadow = true;
      group.add(base);

      const hookGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const hookMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.3,
        metalness: 0.9,
        roughness: 0.15,
      });
      const hook = new THREE.Mesh(hookGeo, hookMat);
      hook.position.set(lp.position.x, lp.position.y, lp.position.z);
      hook.castShadow = true;
      group.add(hook);

      group.userData = { liftPointId: lp.id };
      scene.add(group);
      objectsRef.current.liftPoints.push(group);
    });

    const pitGeo = new THREE.CylinderGeometry(
      tree.targetPit.diameter / 2,
      tree.targetPit.diameter / 2 + 0.2,
      tree.targetPit.depth,
      32,
      1,
      true
    );
    const pitMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      emissive: 0x064e3b,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const pit = new THREE.Mesh(pitGeo, pitMat);
    pit.position.set(
      tree.targetPit.position.x,
      tree.targetPit.depth / 2,
      tree.targetPit.position.z
    );
    scene.add(pit);

    const ringGeo = new THREE.RingGeometry(
      tree.targetPit.diameter / 2,
      tree.targetPit.diameter / 2 + 0.3,
      32
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(
      tree.targetPit.position.x,
      0.02,
      tree.targetPit.position.z
    );
    scene.add(ring);
    objectsRef.current.targetPit = pit;
  }

  function updateDynamicElements() {
    const tree = getCurrentTree();
    const scene = sceneRef.current;
    if (!tree || !scene) return;

    const { cables, pathLine } = objectsRef.current;
    cables.forEach(c => { scene.remove(c); disposeObject(c); });
    if (pathLine) { scene.remove(pathLine); disposeObject(pathLine); }
    objectsRef.current.cables = [];

    objectsRef.current.liftPoints.forEach((group, idx) => {
      const lp = tree.liftPoints[idx];
      if (!lp) return;
      const isSelected = selectedLiftPoints.includes(lp.id);
      group.traverse(child => {
        const m = child as THREE.Mesh;
        const mat = m.material as THREE.MeshStandardMaterial | undefined;
        if (mat && 'emissive' in mat) {
          if (isSelected) {
            mat.color.set(0x22c55e);
            mat.emissive.set(0x22c55e);
            mat.emissiveIntensity = 0.6;
          } else {
            const meshChild = child as THREE.Mesh;
            if (meshChild.geometry instanceof THREE.SphereGeometry) {
              mat.color.set(0xf59e0b);
              mat.emissive.set(0xf59e0b);
              mat.emissiveIntensity = 0.3;
            }
          }
        }
      });
    });

    if (selectedLiftPoints.length === 2) {
      const lpA = tree.liftPoints.find(l => l.id === selectedLiftPoints[0]);
      const lpB = tree.liftPoints.find(l => l.id === selectedLiftPoints[1]);
      if (!lpA || !lpB) return;

      const ballRadius = tree.soilBall.diameter / 2;
      const startPos = tree.soilBall.centerOfMass;
      const targetPos = {
        x: tree.targetPit.position.x,
        y: tree.targetPit.depth + ballRadius,
        z: tree.targetPit.position.z,
      };
      const liftHeight = computeLiftHeight(startPos, targetPos, tree.obstacles, ballRadius);

      const swingRad = swingCm / 100;
      const swingOffset: Vec3 = { x: swingRad, y: 0, z: swingRad };
      const { hasCollision } = checkPathCollision(
        startPos, targetPos, ballRadius, liftHeight, tree.obstacles, swingOffset
      );
      objectsRef.current.pathHasCollision = hasCollision;

      const pathColor = hasCollision ? 0xef4444 : 0x22c55e;
      const pathPoints: THREE.Vector3[] = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const pos = computeBallPosition(startPos, targetPos, t, liftHeight);
        pathPoints.push(new THREE.Vector3(pos.x, pos.y, pos.z));
      }
      const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
      const pathMat = new THREE.LineDashedMaterial({
        color: pathColor,
        dashSize: 0.3,
        gapSize: 0.2,
        linewidth: 2,
      });
      const pLine = new THREE.Line(pathGeo, pathMat);
      pLine.computeLineDistances();
      scene.add(pLine);
      objectsRef.current.pathLine = pLine;

      objectsRef.current.obstacles.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (hasCollision) {
          mat.color.set(0x7f1d1d);
          mat.opacity = 0.7;
        } else {
          mat.color.set(0x4a5568);
          mat.opacity = 0.55;
        }
      });
    } else {
      objectsRef.current.obstacles.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.set(0x4a5568);
        mat.opacity = 0.55;
      });
    }
  }

  function animateSoilBall() {
    const tree = getCurrentTree();
    const scene = sceneRef.current;
    if (!tree || !scene) return;

    const { soilBall, treeTrunk, cables } = objectsRef.current;
    if (!soilBall || !treeTrunk) return;

    const ballRadius = tree.soilBall.diameter / 2;
    const startPos = tree.soilBall.centerOfMass;
    const targetPos = {
      x: tree.targetPit.position.x,
      y: tree.targetPit.depth + ballRadius,
      z: tree.targetPit.position.z,
    };
    const liftHeight = computeLiftHeight(startPos, targetPos, tree.obstacles, ballRadius);

    const swingRad = swingCm / 100;
    const swingOffset: Vec3 = { x: swingRad, y: 0, z: swingRad };

    const basePos = computeBallPosition(startPos, targetPos, animationProgress, liftHeight);
    const pos = vecAdd(basePos, swingOffset);
    soilBall.position.set(pos.x, pos.y, pos.z);
    treeTrunk.position.set(pos.x, pos.y + ballRadius + 2, pos.z);

    cables.forEach(c => { scene.remove(c); disposeObject(c); });
    objectsRef.current.cables = [];

    if (selectedLiftPoints.length === 2) {
      const lpA = tree.liftPoints.find(l => l.id === selectedLiftPoints[0]);
      const lpB = tree.liftPoints.find(l => l.id === selectedLiftPoints[1]);
      if (!lpA || !lpB) return;

      const { tonnageA, tonnageB } = computeCableTonnage(
        tree.soilBall.weight, lpA.position, lpB.position, pos
      );
      const overloaded = tonnageA > lpA.ratedTonnage || tonnageB > lpB.ratedTonnage;
      const cableColor = objectsRef.current.pathHasCollision || overloaded ? 0xef4444 : 0xfbbf24;

      [
        { lp: lpA, ballPos: pos },
        { lp: lpB, ballPos: pos },
      ].forEach(({ lp, ballPos }) => {
        const cablePoints = [
          new THREE.Vector3(lp.position.x, lp.position.y, lp.position.z),
          new THREE.Vector3(ballPos.x, ballPos.y, ballPos.z),
        ];
        const cableGeo = new THREE.BufferGeometry().setFromPoints(cablePoints);
        const cableMat = new THREE.LineBasicMaterial({ color: cableColor, linewidth: 3 });
        const cable = new THREE.Line(cableGeo, cableMat);
        scene.add(cable);
        objectsRef.current.cables.push(cable);
      });
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0"
      style={{ touchAction: 'none' }}
    />
  );
}
