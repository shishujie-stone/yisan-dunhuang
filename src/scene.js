import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** 调参台的展台：只负责灯光、相机、鼠标操作与绘制，不定义伞的结构。 */
export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#202927');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
  camera.position.set(3, -1.3, 4.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', '古伞三维调参视图，可拖动旋转、滚轮缩放');
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.4, 0);
  controls.enableDamping = true;
  controls.minDistance = 1.5;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI - 0.03;
  controls.update();

  // 压低正面补光，将主要能量放到伞的斜后上方。
  scene.add(new THREE.HemisphereLight('#fff4df', '#263b32', 0.3));
  const mainLight = new THREE.DirectionalLight('#ffe7b0', 4.5);
  mainLight.target.position.set(0, 1.8, 0);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(2048, 2048);
  Object.assign(mainLight.shadow.camera, {
    left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 15,
  });
  mainLight.shadow.camera.updateProjectionMatrix();
  mainLight.shadow.bias = -0.00005;
  mainLight.shadow.normalBias = 0.002;
  mainLight.shadow.radius = 1;
  scene.add(mainLight, mainLight.target);
  const fillLight = new THREE.DirectionalLight('#bdcfda', 0.12);
  fillLight.position.set(3, 1, 4);
  scene.add(fillLight);

  // 物理透光需要伞后有可透射的亮环境。此平面是灯箱的发光面，
  // 不是图案贴图，也不在伞面上画假阴影；遮挡由真实骨架产生。
  const lightPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 9.5),
    new THREE.MeshBasicMaterial({
      color: '#ffe7b0', side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  lightPanel.name = 'backlight-emitter';
  // 只在透光的离屏计算中绘制灯箱，主画面不直接展示灯箱外形。
  // 仍然由物理材质取样真实光面，不在伞面上叠加亮色或假骨架。
  lightPanel.onBeforeRender = activeRenderer => {
    lightPanel.material.colorWrite = activeRenderer.getRenderTarget() !== null;
  };
  scene.add(lightPanel);

  function setMainLight(angle = 55, intensity = 4.5) {
    if (!Number.isFinite(angle) || angle < 15 || angle > 85
        || !Number.isFinite(intensity) || intensity < 0 || intensity > 10) {
      throw new RangeError('Light angle must be 15–85 degrees; intensity must be 0–10.');
    }
    const elevation = THREE.MathUtils.degToRad(angle);
    const direction = new THREE.Vector3(
      -0.6 * Math.cos(elevation), Math.sin(elevation), -0.8 * Math.cos(elevation),
    );
    mainLight.position.copy(mainLight.target.position).addScaledVector(direction, 6);
    mainLight.intensity = intensity;
    lightPanel.position.copy(mainLight.position);
    lightPanel.lookAt(mainLight.target.position);
    lightPanel.material.color.set('#ffe7b0').multiplyScalar(intensity * 0.6);
    lightPanel.visible = intensity > 0;
  }
  setMainLight();

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  function setView(view) {
    const positions = {
      default: [3, -1.3, 4.2],
      side: [4.8, 1.3, 0],
      bottom: [2.5, -1.7, 3.1],
      top: [0.01, 5.8, 0],
    };
    camera.position.fromArray(positions[view] || positions.default);
    controls.target.set(0, 1.4, 0);
    controls.update();
  }

  function dispose() {
    observer.disconnect();
    renderer.setAnimationLoop(null);
    controls.dispose();
    mainLight.shadow.dispose();
    lightPanel.geometry.dispose();
    lightPanel.material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { scene, camera, renderer, controls, setView, setMainLight, dispose };
}
