(function () {
  if (typeof THREE === 'undefined') return;

  const container = document.getElementById('globe-3d');
  if (!container) return;

  const SIZE = 500;

  // ── Scene setup ──────────────────────────────────────
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.55, 3.6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(SIZE, SIZE);
  container.appendChild(renderer.domElement);

  // ── Continent paths (1000×500 logical, same as the SVG fallback) ──
  const continentPaths = [
    "M 135 90 Q 155 75 185 78 L 215 72 L 250 78 L 280 88 L 295 110 L 298 135 L 290 158 L 280 178 L 265 195 L 245 200 L 232 215 L 220 222 L 200 218 L 178 200 L 162 178 L 148 152 L 138 125 Z",
    "M 360 55 Q 380 48 405 52 L 420 65 L 415 82 L 395 88 L 375 82 L 365 70 Z",
    "M 215 215 L 240 220 L 260 230 L 275 245 L 270 252 L 250 245 L 230 235 L 215 225 Z",
    "M 285 245 L 320 232 L 355 240 L 380 258 L 388 290 L 380 322 L 368 358 L 348 392 L 330 412 L 315 406 L 305 380 L 295 350 L 285 320 L 278 290 L 275 265 Z",
    "M 478 100 Q 495 92 515 95 L 540 90 L 558 100 L 565 118 L 560 135 L 548 148 L 530 152 L 510 152 L 492 145 L 480 132 L 475 115 Z",
    "M 530 70 L 548 65 L 558 78 L 552 92 L 538 90 L 528 82 Z",
    "M 490 175 Q 520 165 555 168 L 595 172 L 615 188 L 622 215 L 618 242 L 608 272 L 598 300 L 582 328 L 562 345 L 542 340 L 530 320 L 520 295 L 510 268 L 502 240 L 495 212 L 490 192 Z",
    "M 615 188 L 645 188 L 660 205 L 658 225 L 642 232 L 625 222 L 618 205 Z",
    "M 558 100 L 590 88 L 625 80 L 670 75 L 720 72 L 770 75 L 815 82 L 855 92 L 890 105 L 905 125 L 895 145 L 870 158 L 840 165 L 808 168 L 775 165 L 745 162 L 715 162 L 685 162 L 665 170 L 645 175 L 625 175 L 605 168 L 588 158 L 575 145 L 565 130 Z",
    "M 685 162 L 715 168 L 728 188 L 720 215 L 705 232 L 690 220 L 682 198 L 678 178 Z",
    "M 745 195 L 770 192 L 778 215 L 770 235 L 755 235 L 745 218 Z",
    "M 875 142 L 888 138 L 898 152 L 902 168 L 892 178 L 880 170 L 875 158 Z",
    "M 850 320 Q 875 312 905 318 L 935 325 L 942 342 L 932 358 L 905 365 L 875 362 L 855 350 L 848 338 Z",
    "M 970 360 L 980 358 L 982 372 L 975 378 L 970 372 Z",
    "M 968 345 L 975 343 L 977 354 L 970 358 Z",
  ];
  const continentEllipses = [
    [484, 106, 7, 10],
    [628, 310, 6, 18, -12],
    [788, 252, 22, 7],
    [822, 258, 14, 6],
    [848, 255, 6, 5],
    [838, 232, 5, 9],
    [845, 218, 5, 7],
    [455, 80, 9, 5],
  ];

  // ── Build dotted-continents texture via canvas ──────
  function buildEarthTexture() {
    const cv = document.createElement('canvas');
    cv.width = 4096;
    cv.height = 2048;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);

    // Logical 1000×500 → canvas 4096×2048
    ctx.scale(4.096, 4.096);
    ctx.fillStyle = '#F2EDE3';

    const drawDots = () => {
      const gap = 5;
      for (let y = 0; y < 500; y += gap) {
        const rowOffset = (Math.floor(y / gap) % 2) * (gap / 2);
        for (let x = 0; x < 1000; x += gap) {
          ctx.beginPath();
          ctx.arc(x + rowOffset, y, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    continentPaths.forEach((d) => {
      ctx.save();
      ctx.clip(new Path2D(d));
      drawDots();
      ctx.restore();
    });

    continentEllipses.forEach(([cx, cy, rx, ry, rot]) => {
      ctx.save();
      if (rot) {
        ctx.translate(cx, cy);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      const p = new Path2D();
      p.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip(p);
      drawDots();
      ctx.restore();
    });

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.needsUpdate = true;
    return tex;
  }

  const earthGroup = new THREE.Group();
  earthGroup.rotation.z = (23.5 * Math.PI) / 180;

  // Dark base sphere
  const baseSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0x14110f })
  );
  earthGroup.add(baseSphere);

  // Subtle lat/lon wireframe
  const wireGeo = new THREE.EdgesGeometry(new THREE.SphereGeometry(1.002, 32, 16));
  const wire = new THREE.LineSegments(
    wireGeo,
    new THREE.LineBasicMaterial({ color: 0xf2ede3, transparent: true, opacity: 0.05 })
  );
  earthGroup.add(wire);

  // Dotted continents
  const continentsSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.005, 96, 64),
    new THREE.MeshBasicMaterial({
      map: buildEarthTexture(),
      transparent: true,
      depthWrite: false,
    })
  );
  earthGroup.add(continentsSphere);

  // ── Cloudflare PoP markers ──────────────────────────
  const pops = [
    [40.7, -74], [34, -118], [41.9, -87.6], [32.8, -96.8], [25.8, -80.2],
    [37.8, -122.4], [47.6, -122.3], [43.7, -79.4], [19.4, -99.1],
    [-23.5, -46.6], [-34.6, -58.4], [-22.9, -43.2], [4.7, -74.1],
    [51.5, -0.1], [48.9, 2.3], [40.4, -3.7], [52.4, 4.9], [50.1, 8.7],
    [52.5, 13.4], [59.3, 18.1], [55.8, 37.6], [41, 28.9], [38, 23.7],
    [6.5, 3.4], [30, 31.2], [-26.2, 28], [-1.3, 36.8],
    [25.2, 55.3], [19.1, 72.9], [28.6, 77.2], [13.8, 100.5], [1.3, 103.8],
    [22.3, 114.2], [31.2, 121.5], [39.9, 116.4], [35.7, 139.7],
    [37.6, 126.9], [14.6, 121], [-6.2, 106.8],
    [-33.9, 151.2], [-37.8, 144.9], [-36.9, 174.8],
  ];

  function latLonToVec3(lat, lon, radius) {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  const popDotGeo = new THREE.SphereGeometry(0.014, 10, 10);
  const popDotMat = new THREE.MeshBasicMaterial({ color: 0xe8945e });
  const popHaloMat = new THREE.MeshBasicMaterial({
    color: 0xe8945e,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const popHaloGeo = new THREE.SphereGeometry(0.028, 12, 12);

  pops.forEach(([lat, lon]) => {
    const pos = latLonToVec3(lat, lon, 1.018);
    const dot = new THREE.Mesh(popDotGeo, popDotMat);
    const halo = new THREE.Mesh(popHaloGeo, popHaloMat);
    dot.position.copy(pos);
    halo.position.copy(pos);
    earthGroup.add(halo, dot);
  });

  scene.add(earthGroup);

  // ── Animate ─────────────────────────────────────────
  let lastTime = 0;
  function animate(time) {
    requestAnimationFrame(animate);
    const dt = (time - lastTime) / 1000 || 0;
    lastTime = time;
    earthGroup.rotation.y += dt * 0.15;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

  // ── Resize ──────────────────────────────────────────
  function onResize() {
    const rect = container.getBoundingClientRect();
    const size = Math.max(220, Math.min(rect.width, rect.height));
    renderer.setSize(size, size, false);
    renderer.domElement.style.width = size + 'px';
    renderer.domElement.style.height = size + 'px';
  }
  window.addEventListener('resize', onResize);
  setTimeout(onResize, 0);
})();
