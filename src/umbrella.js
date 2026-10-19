import * as THREE from 'three';

/**
 * 创建一把油纸伞，返回 THREE.Group。
 * 坐标：Y 轴向上；手柄底端为 y = 0；长度使用同一相对单位。
 * openAmount 从 0（收拢）到 1（张开），驱动固定长度的伞骨、撑骨与伞面。
 * 返回的组提供 setOpenAmount(value)，可在原对象上连续调节，不重复创建部件。
 * 伞面支持物理透光；伞面、竹骨与手柄可接入材质图，动画计时由页面负责。
 */
export function createUmbrella(params = {}) {
  const p = {
    ribCount: 32,
    radius: 1.1,
    canopyHeight: 0.4,
    canopyRise: 0.045,
    shaftLength: 2.25,
    shaftRadius: 0.018,
    ribRadius: 0.008,
    stretcherRadius: 0.007,
    hubRadius: 0.045,
    hubHeight: 0.065,
    lowerHubDistance: 0.7,
    openAmount: 1,
    handleLength: 0.28,
    handleRadius: 0.035,
    transmission: 0.65,
    roughness: 0.75,
    canopyColor: '#d4b66e',
    canopyTexture: null,
    // 当前素材圆半径860像素，画布2048像素；透明留边不映射到伞面。
    canopyTextureRadius: 860 / 2048,
    bambooColor: '#87915b',
    woodColor: '#573622',
    bambooTexture: null,
    woodTexture: null,
    ...params,
  };

  // 拒绝无效尺寸，避免生成看不见或断开的结构。
  for (const key of [
    'radius', 'canopyHeight', 'shaftLength', 'shaftRadius', 'ribRadius',
    'stretcherRadius', 'hubRadius', 'hubHeight', 'lowerHubDistance',
    'handleLength', 'handleRadius',
  ]) {
    if (!Number.isFinite(p[key]) || p[key] <= 0) {
      throw new RangeError(`${key} must be a positive finite number.`);
    }
  }
  if (!Number.isInteger(p.ribCount) || p.ribCount < 3) {
    throw new RangeError('ribCount must be an integer of at least 3.');
  }
  if (!Number.isFinite(p.canopyRise) || p.canopyRise < 0) {
    throw new RangeError('canopyRise must be a non-negative finite number.');
  }
  if (!Number.isFinite(p.openAmount) || p.openAmount < 0 || p.openAmount > 1) {
    throw new RangeError('openAmount must be between 0 and 1.');
  }

  for (const key of ['transmission', 'roughness']) {
    if (!Number.isFinite(p[key]) || p[key] < 0 || p[key] > 1) {
      throw new RangeError(`${key} must be between 0 and 1.`);
    }
  }

  if (p.canopyTexture !== null && (typeof p.canopyTexture !== 'string' || !p.canopyTexture.trim())) {
    throw new TypeError('canopyTexture must be an image path or null.');
  }
  if (!Number.isFinite(p.canopyTextureRadius) || p.canopyTextureRadius <= 0 || p.canopyTextureRadius > 0.5) {
    throw new RangeError('canopyTextureRadius must be greater than 0 and at most 0.5.');
  }

  const topY = p.shaftLength;
  // 用完全张开的形态确定杆长，此后开合时两种杆都不伸缩。
  const ribLength = Math.hypot(p.radius, p.canopyHeight);
  const halfRib = ribLength / 2;
  const stretcherLength = Math.hypot(
    p.radius / 2, p.lowerHubDistance - p.canopyHeight / 2,
  );
  const openAngle = Math.atan2(p.radius, p.canopyHeight);
  // 留下中棒和叠合伞骨需要的厚度，避免在 0 时塌成一条退化线。
  const foldedRadius = Math.max(
    p.hubRadius + p.ribRadius * 2,
    p.ribRadius * 1.2 / Math.sin(Math.PI / p.ribCount),
  );
  if (foldedRadius >= p.radius) {
    throw new RangeError('The open radius must exceed the folded bundle thickness.');
  }
  const closedAngle = Math.asin(foldedRadius / ribLength);
  if (p.handleRadius < p.shaftRadius || p.hubRadius <= p.shaftRadius) {
    throw new RangeError('The handle and hubs must enclose the shaft.');
  }
  if (p.lowerHubDistance <= p.canopyHeight / 2 + p.hubHeight) {
    throw new RangeError('The lower hub must remain below the stretcher joints.');
  }

  function shapeAt(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError('openAmount must be between 0 and 1.');
    }
    const angle = closedAngle + (openAngle - closedAngle) * value;
    const radius = ribLength * Math.sin(angle);
    const drop = ribLength * Math.cos(angle);
    // 下巢—撑骨—伞骨中点构成三角形。由勾股关系反求下巢高度。
    const jointRadius = radius / 2;
    const belowJoint = Math.sqrt(Math.max(
      0, stretcherLength ** 2 - jointRadius ** 2,
    ));
    return { radius, drop, lowerHubY: topY - drop / 2 - belowJoint };
  }
  // 验证整段行程，而不是只保证初始状态装得下。
  for (const value of [0, 1]) {
    const shape = shapeAt(value);
    if (shape.lowerHubY - p.hubHeight / 2 <= p.handleLength
        || topY - shape.drop - p.canopyRise <= p.handleLength) {
      throw new RangeError('The folded mechanism needs clearance above the handle.');
    }
  }

  const umbrella = new THREE.Group();
  umbrella.name = 'umbrella';
  umbrella.userData.params = { ...p };

  const bamboo = new THREE.MeshStandardMaterial({
    color: p.bambooColor, map: p.bambooTexture, roughness: 0.85, metalness: 0,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: p.woodColor, roughness: 0.8, metalness: 0,
  });
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: p.woodColor, map: p.woodTexture, roughness: 0.8, metalness: 0,
  });
  const paper = new THREE.MeshPhysicalMaterial({
    color: p.canopyColor,
    transmission: p.transmission,
    roughness: p.roughness,
    metalness: 0,
    // 使用薄片模型，保持不透明度为1；透光由 transmission 独立控制。
    opacity: 1,
    thickness: 0,
    ior: 1.3,
    side: THREE.DoubleSide,
  });

  if (p.canopyTexture !== null) {
    const map = new THREE.TextureLoader().load(p.canopyTexture);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    paper.map = map;
    // 贴图由本生成器创建；材质释放时同步释放，避免调参重建后累积。
    paper.addEventListener('dispose', () => map.dispose());
  }

  // 所有细杆共用单位圆柱；方向和长度由端点计算。
  const rodGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
  const up = new THREE.Vector3(0, 1, 0);
  function rod(name, from, to, radius, material) {
    const mesh = new THREE.Mesh(rodGeometry, material);
    mesh.name = name;
    placeRod(mesh, from, to, radius);
    return mesh;
  }

  function placeRod(mesh, from, to, radius) {
    const direction = new THREE.Vector3().subVectors(to, from);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    mesh.scale.set(radius, direction.length(), radius);
    mesh.userData.endpoints = { from: from.toArray(), to: to.toArray() };
  }

  umbrella.add(rod('shaft', new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, topY + p.hubHeight / 2, 0), p.shaftRadius, wood));

  function hub(name, y) {
    const geometry = new THREE.CylinderGeometry(
      p.hubRadius * 0.8, p.hubRadius, p.hubHeight, 16,
    );
    const mesh = new THREE.Mesh(geometry, wood);
    mesh.name = name;
    mesh.position.y = y;
    umbrella.add(mesh);
  }
  hub('upperHub', topY);
  hub('lowerHub', topY - p.lowerHubDistance);

  const ribs = new THREE.Group();
  ribs.name = 'ribs';
  const stretchers = new THREE.Group();
  stretchers.name = 'stretchers';
  const canopy = new THREE.Group();
  canopy.name = 'canopy';
  const top = new THREE.Vector3(0, topY, 0);
  const lower = new THREE.Vector3(0, topY - p.lowerHubDistance, 0);
  const angleStep = Math.PI * 2 / p.ribCount;

  // 每两个相邻伞骨之间为一片伞面。采样弧垂，避免成为笔直圆锥。
  function canopyPanel(startAngle) {
    const radialSegments = 12;
    const angularSegments = 8;
    const rowWidth = angularSegments + 1;
    const positions = new Float32Array((1 + radialSegments * rowWidth) * 3);
    const indices = [];
    for (let column = 0; column < angularSegments; column += 1) {
      indices.push(0, column + 2, column + 1);
    }
    for (let row = 1; row < radialSegments; row += 1) {
      for (let column = 0; column < angularSegments; column += 1) {
        const a = 1 + (row - 1) * rowWidth + column;
        const b = a + 1;
        const c = a + rowWidth;
        const d = c + 1;
        indices.push(a, b, c, c, b, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(positions.length / 3 * 2), 2));
    geometry.setIndex(indices);
    geometry.userData.startAngle = startAngle;
    return new THREE.Mesh(geometry, paper);
  }

  for (let i = 0; i < p.ribCount; i += 1) {
    const angle = i * angleStep;
    const tip = new THREE.Vector3(
      p.radius * Math.cos(angle), topY - p.canopyHeight, p.radius * Math.sin(angle),
    );
    const midpoint = top.clone().lerp(tip, 0.5);
    ribs.add(rod(`rib-${i}`, top, tip, p.ribRadius, bamboo));
    stretchers.add(rod(`stretcher-${i}`, lower, midpoint, p.stretcherRadius, bamboo));
    const panel = canopyPanel(angle);
    panel.name = `canopy-panel-${i}`;
    canopy.add(panel);
  }
  umbrella.add(ribs, stretchers, canopy);
  umbrella.add(rod('handle', new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, p.handleLength, 0), p.handleRadius, handleMaterial));

  function setOpenAmount(value) {
    const shape = shapeAt(value);
    lower.y = shape.lowerHubY;
    umbrella.getObjectByName('lowerHub').position.y = lower.y;
    for (let i = 0; i < p.ribCount; i += 1) {
      const angle = i * angleStep;
      const tip = new THREE.Vector3(
        shape.radius * Math.cos(angle), topY - shape.drop,
        shape.radius * Math.sin(angle),
      );
      const midpoint = top.clone().lerp(tip, 0.5);
      placeRod(ribs.children[i], top, tip, p.ribRadius);
      placeRod(stretchers.children[i], lower, midpoint, p.stretcherRadius);

      const geometry = canopy.children[i].geometry;
      const positions = geometry.getAttribute('position');
      positions.setXYZ(0, 0, topY, 0);
      // 顶点连接关系不变，只移动顶点，整个过程没有重建、消失或跳变。
      for (let row = 1; row <= 12; row += 1) {
        const distance = row / 12;
        for (let column = 0; column <= 8; column += 1) {
          const across = column / 8;
          const theta = angle + across * angleStep;
          const sag = p.canopyRise * value * Math.sin(Math.PI * across)
            * Math.sin(Math.PI * distance);
          positions.setXYZ(
            1 + (row - 1) * 9 + column,
            shape.radius * distance * Math.cos(theta),
            topY - shape.drop * distance - sag,
            shape.radius * distance * Math.sin(theta),
          );
        }
      }
      // 水平距离决定纹样半径，方位角决定纹样角度；各片共用同一圆心。
      // 用当前张开半径归一化，开合时图案跟随纸面，不从贴图中心滑向边缘。
      const uv = geometry.getAttribute('uv');
      uv.setXY(0, 0.5, 0.5);
      for (let vertex = 1; vertex < positions.count; vertex += 1) {
        const x = positions.getX(vertex), z = positions.getZ(vertex);
        const radius = Math.hypot(x, z) / shape.radius * p.canopyTextureRadius;
        const theta = Math.atan2(z, x);
        uv.setXY(vertex, 0.5 + radius * Math.cos(theta), 0.5 + radius * Math.sin(theta));
      }
      uv.needsUpdate = true;
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
    p.openAmount = value;
    umbrella.userData.params.openAmount = value;
    return umbrella;
  }

  // 所有扇片共用同一个材质；修改外观不必重建骨架或伞面。
  function setCanopyMaterial(values = {}) {
    for (const key of ['transmission', 'roughness']) {
      if (values[key] !== undefined
          && (!Number.isFinite(values[key]) || values[key] < 0 || values[key] > 1)) {
        throw new RangeError(`${key} must be between 0 and 1.`);
      }
    }
    if (values.transmission !== undefined) {
      const wasTransmissive = paper.transmission > 0;
      paper.transmission = values.transmission;
      if (wasTransmissive !== (paper.transmission > 0)) paper.needsUpdate = true;
      p.transmission = values.transmission;
    }
    if (values.roughness !== undefined) {
      paper.roughness = values.roughness;
      p.roughness = values.roughness;
    }
    if (values.canopyColor !== undefined) {
      paper.color.set(values.canopyColor);
      p.canopyColor = values.canopyColor;
    }
    Object.assign(umbrella.userData.params, {
      transmission: p.transmission, roughness: p.roughness, canopyColor: p.canopyColor,
    });
    return umbrella;
  }

  // 颜色与竹纹叠加，调色时保留贴图，不重建部件。
  umbrella.setBambooColor = function (color) {
    bamboo.color.set(color);
    p.bambooColor = color;
    umbrella.userData.params.bambooColor = color;
    return umbrella;
  };
  umbrella.setCanopyMaterial = setCanopyMaterial;
  umbrella.setOpenAmount = setOpenAmount;
  setOpenAmount(p.openAmount);
  return umbrella;
}
