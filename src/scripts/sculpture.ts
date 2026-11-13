export async function mountSculpture(host: HTMLElement, signal: AbortSignal) {
  const canvas = host.querySelector("canvas")!;
  const stage = host.querySelector<HTMLElement>(".sculpture-stage")!;
  const motion = host.querySelector<HTMLButtonElement>("[data-motion]")!;
  const arrange = host.querySelector<HTMLButtonElement>("[data-arrange]")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let cleanup = () => {};
  signal.addEventListener("abort", () => cleanup(), { once: true });
  try {
    const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
      import("three"),
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/environments/RoomEnvironment.js"),
    ]);
    if (signal.aborted) return;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0, 12.8);
    const studio = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(studio, 0.04);
    scene.environment = environment.texture;
    studio.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x52665c, 2));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(-3, 5, 5);
    scene.add(key);
    const pivot = new THREE.Group();
    scene.add(pivot);
    let frame = 0;
    let visible = false;
    let paused = reduced.matches;
    let dragging = false;
    let spread = false;
    let yaw = -0.15;
    let phase = 0;
    let pitch = 0.12;
    let last = 0;
    const parts: {
      mesh: import("three").Object3D;
      origin: import("three").Vector3;
      offset: import("three").Vector3;
    }[] = [];
    const disposeModel = (model: import("three").Object3D) =>
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            material.dispose();
        }
      });
    const resize = new ResizeObserver(() => {
      renderer.setSize(stage.clientWidth, stage.clientHeight, false);
      camera.aspect = stage.clientWidth / Math.max(1, stage.clientHeight);
      camera.updateProjectionMatrix();
      draw();
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      draw();
    });
    cleanup = () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      disposeModel(pivot);
      environment.dispose();
      renderer.dispose();
    };
    const gltf = await new GLTFLoader().loadAsync(
      "/models/kraft-sculpture.glb",
    );
    if (signal.aborted) {
      disposeModel(gltf.scene);
      return;
    }
    pivot.add(gltf.scene);
    const offsets: Record<string, number[]> = {
      Kraft_BracketLeft: [-0.65, 0, 0],
      Kraft_BracketRight: [0.65, 0, 0],
      Kraft_Slash: [0.35, 0, 0.25],
      Kraft_Stem: [-0.25, 0, 0],
      Kraft_Upper: [0.35, 0.5, 0],
      Kraft_Lower: [0.35, -0.5, 0],
    };
    gltf.scene.traverse((mesh) => {
      if (offsets[mesh.name])
        parts.push({
          mesh,
          origin: mesh.position.clone(),
          offset: new THREE.Vector3(...offsets[mesh.name]),
        });
    });
    function draw(time = performance.now()) {
      cancelAnimationFrame(frame);
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      if (!visible || document.hidden || signal.aborted) return;
      if (!paused && !dragging) phase += dt * 0.45;
      // Keep the letter readable instead of letting it turn edge-on or backwards.
      yaw = THREE.MathUtils.clamp(yaw, -0.4, 0.4);
      pitch = THREE.MathUtils.clamp(pitch, -0.3, 0.3);
      pivot.rotation.set(pitch, yaw + Math.sin(phase) * 0.14, 0);
      let settling = false;
      for (const part of parts) {
        const target = part.origin
          .clone()
          .addScaledVector(part.offset, spread ? 1 : 0);
        part.mesh.position.lerp(
          target,
          reduced.matches ? 1 : 1 - Math.exp(-dt * 10),
        );
        if (part.mesh.position.distanceToSquared(target) > 0.00001)
          settling = true;
      }
      renderer.render(scene, camera);
      if ((!paused && !dragging) || settling)
        frame = requestAnimationFrame(draw);
    }
    function syncMotion() {
      motion.textContent = paused ? "Play motion" : "Pause motion";
      motion.setAttribute("aria-pressed", String(paused));
    }
    function toggleSpread() {
      spread = !spread;
      arrange.firstChild!.textContent = spread
        ? "Bring it together "
        : "Take it apart ";
      arrange.setAttribute("aria-pressed", String(spread));
      draw();
    }
    let x = 0,
      y = 0;
    canvas.addEventListener(
      "pointerdown",
      (event) => {
        dragging = true;
        x = event.clientX;
        y = event.clientY;
        canvas.setPointerCapture(event.pointerId);
      },
      { signal },
    );
    canvas.addEventListener(
      "pointermove",
      (event) => {
        if (!dragging) return;
        yaw += (event.clientX - x) * 0.008;
        pitch = THREE.MathUtils.clamp(
          pitch + (event.clientY - y) * 0.005,
          -0.7,
          0.7,
        );
        x = event.clientX;
        y = event.clientY;
        draw();
      },
      { signal },
    );
    const release = () => {
      dragging = false;
      draw();
    };
    canvas.addEventListener("pointerup", release, { signal });
    canvas.addEventListener("pointercancel", release, { signal });
    canvas.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleSpread();
        }
        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
          paused = true;
          syncMotion();
          yaw +=
            event.key === "ArrowLeft"
              ? -0.15
              : event.key === "ArrowRight"
                ? 0.15
                : 0;
          pitch = THREE.MathUtils.clamp(
            pitch +
              (event.key === "ArrowUp"
                ? -0.15
                : event.key === "ArrowDown"
                  ? 0.15
                  : 0),
            -0.7,
            0.7,
          );
          draw();
        }
      },
      { signal },
    );
    arrange.addEventListener("click", toggleSpread, { signal });
    motion.addEventListener(
      "click",
      () => {
        paused = !paused;
        syncMotion();
        draw();
      },
      { signal },
    );
    reduced.addEventListener(
      "change",
      () => {
        paused = reduced.matches;
        syncMotion();
        draw();
      },
      { signal },
    );
    document.addEventListener("visibilitychange", () => draw(), { signal });
    resize.observe(stage);
    intersection.observe(host);
    host.dataset.ready = "true";
    canvas.tabIndex = 0;
    host.querySelectorAll<HTMLElement>("[hidden]").forEach((element) => {
      element.hidden = false;
    });
    syncMotion();
  } catch (error) {
    cleanup();
    canvas.tabIndex = -1;
    canvas.hidden = true;
    // The Blender render remains useful when WebGL or the asset is unavailable.
    console.warn("Kraft sculpture: showing the still image.", error);
  }
}
