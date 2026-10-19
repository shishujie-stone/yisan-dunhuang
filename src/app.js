// 伞名、形状、外观和灯光取自档案；纹样选项取自正式素材清单。
const catalog = document.querySelector('#umbrella-list');
const status = document.querySelector('#status');
const exhibition = document.querySelector('.exhibition');
const loadingPanel = document.querySelector('#stage-loading');
const loadingMessage = document.querySelector('#loading-message');
const loadingProgress = document.querySelector('#loading-progress');
function updateLoading(value, message) {
  loadingProgress.value = value;
  loadingMessage.textContent = message;
}
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const exhibitCaption = document.querySelector('.exhibit-caption');
const exhibitName = document.querySelector('#exhibit-name');
const exhibitSummary = document.querySelector('#exhibit-summary');
const openInput = document.querySelector('#openAmount');
const openOutput = document.querySelector('#openAmount-value');
const patternInput = document.querySelector('#canopyTexture');
const patternName = document.querySelector('#pattern-name');
const resetViewButton = document.querySelector('#reset-view');
const panel = document.querySelector('#stage-controls');
const inspectButton = document.querySelector('#inspect-umbrella');
const rotationButton = document.querySelector('#toggle-rotation');
const actionStatus = document.querySelector('#stage-action-status');
// 全屏覆盖整个页面，标题栏中的同一按钮始终可用于退出。
const fullscreenToggle = document.querySelector('#fullscreen-toggle');
const fullscreenFeedback = document.querySelector('#fullscreen-feedback');
function syncFullscreenButton() {
  const active = Boolean(document.fullscreenElement);
  const label = active ? '退出全屏' : '进入全屏';
  fullscreenToggle.setAttribute('aria-pressed', String(active));
  fullscreenToggle.setAttribute('aria-label', label);
  fullscreenToggle.title = label;
}
fullscreenToggle.addEventListener('click', async () => {
  fullscreenFeedback.textContent = '';
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else throw new Error('Fullscreen unavailable');
  } catch {
    fullscreenFeedback.textContent = '当前浏览器未能开启网页全屏，请使用浏览器自带的全屏功能。';
  }
  syncFullscreenButton();
});
document.addEventListener('fullscreenchange', syncFullscreenButton);
syncFullscreenButton();

// 手机将现有设置收成小按钮，桌面仍然直接显示控制条。
const controlsToggle = document.querySelector('#controls-toggle');
controlsToggle.addEventListener('click', () => {
  const expanded = exhibition.classList.toggle('controls-open');
  controlsToggle.setAttribute('aria-expanded', String(expanded));
  controlsToggle.setAttribute('aria-label', expanded ? '收起伞的设置' : '展开伞的设置');
  controlsToggle.querySelector('span').textContent = expanded ? '×' : '⚙';
});

async function readJSON(path) {
  // 本地调试及内容更新后重新向服务器核对，避免继续使用旧素材清单。
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${path}：HTTP ${response.status}`);
  return response.json();
}

function disposeModel(model) {
  const geometries = new Set();
  const materials = new Set();
  model.traverse(part => {
    if (part.isMesh) { geometries.add(part.geometry); materials.add(part.material); }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

// 以下仅生成下方解说区；标签标题是界面用语，文化正文、分级和来源均读档案。
const cultureSection = document.querySelector('#culture-section');
// 共用的创作说明先于单款展品介绍；正文仍从数据表读取。
const introTab = document.createElement('button');
introTab.id = 'tab-origin';
introTab.type = 'button';
introTab.textContent = '缘起';
introTab.setAttribute('role', 'tab');
introTab.setAttribute('aria-controls', 'panel-origin');
cultureSection.querySelector('[role="tablist"]').prepend(introTab);
const introPanel = document.createElement('div');
introPanel.id = 'panel-origin';
introPanel.className = 'culture-copy';
introPanel.setAttribute('role', 'tabpanel');
introPanel.setAttribute('aria-labelledby', 'tab-origin');
introPanel.tabIndex = 0;
cultureSection.insertBefore(introPanel, document.querySelector('#panel-shape'));
const cultureTabs = Array.from(cultureSection.querySelectorAll('[role="tab"]'));
function activateCultureTab(activeTab) {
  for (const tab of cultureTabs) {
    const selected = tab === activeTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  }
}
activateCultureTab(introTab);
for (const tab of cultureTabs) {
  tab.addEventListener('click', () => activateCultureTab(tab));
  tab.addEventListener('keydown', event => {
    const index = cultureTabs.indexOf(tab);
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % cultureTabs.length;
    else if (event.key === 'ArrowLeft') next = (index + cultureTabs.length - 1) % cultureTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = cultureTabs.length - 1;
    else return;
    event.preventDefault();
    activateCultureTab(cultureTabs[next]);
    cultureTabs[next].focus();
  });
}
function appendSources(container, sources) {
  if (!Array.isArray(sources)) return;
  const line = document.createElement('p');
  line.className = 'sources';
  for (const source of sources) {
    const path = source.url || source.path;
    if (!path || !source.title) continue;
    const url = new URL(path, document.baseURI);
    if (!['http:', 'https:'].includes(url.protocol)) continue;
    const link = document.createElement('a');
    link.href = url.href;
    link.textContent = source.title;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    line.append(link);
  }
  if (line.childElementCount) container.append(line);
}
function appendExplanation(container, title, text, entry) {
  const heading = document.createElement('h3');
  heading.textContent = title;
  if (entry.level) {
    const level = document.createElement('span');
    level.className = 'evidence-level';
    level.textContent = entry.level;
    heading.append(level);
  }
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  container.append(heading, paragraph);
  appendSources(container, entry._source);
}
function renderCulture(entry) {
  const shapePanel = document.querySelector('#panel-shape');
  const patternPanel = document.querySelector('#panel-pattern');
  const craftPanel = document.querySelector('#panel-craft');
  shapePanel.replaceChildren(); patternPanel.replaceChildren(); craftPanel.replaceChildren();
  const fields = [
    ['shape', '形制特征', shapePanel], ['size', '尺寸', shapePanel],
    ['materials', '主要用材', shapePanel],
    ['patternTheme', '纹样主题', patternPanel], ['patternMeaning', '纹样寓意', patternPanel],
  ];
  for (const [key, title, container] of fields) {
    const item = entry.culture?.[key];
    if (!item?.text) continue; // 已删除或留空的字段不补造内容。
    const article = document.createElement('article');
    article.className = 'culture-entry';
    appendExplanation(article, title, item.text, item);
    container.append(article);
  }
  const list = document.createElement('ol');
  list.className = 'craft-list';
  for (const step of entry.craftSteps || []) {
    const item = document.createElement('li');
    item.className = 'craft-step';
    const image = document.createElement('img');
    image.src = step.image;
    image.alt = step.name;
    image.width = image.height = 1024;
    const copy = document.createElement('div');
    appendExplanation(copy, step.name, step.desc, step);
    item.append(image, copy);
    list.append(item);
  }
  craftPanel.append(list);
  cultureSection.hidden = false;
}

async function start() {
  try {
    updateLoading(10, '正在读取展品资料与展示程序……');
    status.textContent = '正在加载展台……';
    const [umbrellas, manifest, THREE, { createScene }, { createUmbrella }] = await Promise.all([
      readJSON('./data/umbrellas.json'), readJSON('./assets/manifest.json'),
      import('three'), import('./scene.js'), import('./umbrella.js'),
    ]);
    updateLoading(30, '资料已就绪，正在准备石窟背景……');
    if (!Array.isArray(umbrellas) || umbrellas.length === 0) throw new Error('档案中没有伞');
    const projectIntro = umbrellas.find(entry => entry.projectIntro)?.projectIntro;
    if (projectIntro?.text) {
      const heading = document.createElement('h3');
      heading.textContent = projectIntro.title;
      const paragraph = document.createElement('p');
      paragraph.textContent = projectIntro.text;
      introPanel.replaceChildren(heading, paragraph);
    }
    const ids = new Set();
    for (const entry of umbrellas) {
      if (!entry || typeof entry.id !== 'string' || !entry.id.trim()
          || typeof entry.name !== 'string' || !entry.name.trim() || ids.has(entry.id)) {
        throw new Error('档案中的编号或名称无效');
      }
      ids.add(entry.id);
    }
    const patterns = manifest.assets.filter(asset => /^P0[1-8]$/.test(asset.id))
      .sort((a, b) => a.id.localeCompare(b.id));
    const patternButtons = new Map();
    for (const pattern of patterns) {
      const path = `assets/${pattern.path}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pattern-option';
      button.setAttribute('aria-label', pattern.name);
      button.setAttribute('aria-pressed', 'false');
      button.title = pattern.name;
      button.dataset.patternPath = path;
      const image = document.createElement('img');
      image.src = path;
      image.alt = '';
      image.width = image.height = 56;
      button.append(image);
      patternInput.append(button);
      patternButtons.set(path, button);
    }
    function syncPatternSelection(path) {
      for (const [value, button] of patternButtons) button.setAttribute('aria-pressed', String(value === path));
      patternName.textContent = patterns.find(pattern => `assets/${pattern.path}` === path)?.name || '';
    }
    const stage = createScene(document.querySelector('#viewport'));
    stage.renderer.domElement.setAttribute('aria-label', '古伞三维视图，可拖动旋转、滚轮缩放');
    stage.renderer.domElement.tabIndex = 0;
    // 首屏保持已确认的斜置观察角度，手机取景居中。
    let narrowFraming = window.matchMedia('(max-width: 600px)').matches;
    function frameDisplayCamera() {
      const horizontalTarget = narrowFraming ? -0.25 : 0.4;
      stage.camera.position.set(horizontalTarget, 4.15, 4.9);
      stage.controls.target.set(horizontalTarget, 1.25, 0);
      stage.controls.update();
      stage.controls.saveState();
    }
    frameDisplayCamera();
    stage.renderer.toneMappingExposure = 1.3;
    // 正面用柔和暖光提亮纹样与竹骨，斜后方主光继续保留透光剪影。
    const firstScreenAmbient = new THREE.HemisphereLight('#fff4da', '#b0a17e', 1.0);
    const firstScreenFill = new THREE.DirectionalLight('#fff1d5', 1.8);
    firstScreenFill.position.set(3, 2.5, 4);
    firstScreenFill.target.position.set(0, 1.4, 0);
    stage.scene.add(firstScreenAmbient, firstScreenFill, firstScreenFill.target);
    const loader = new THREE.TextureLoader();
    // 由页面持有贴图；换纹样只换纸面上的图片，不重建骨架。
    const textures = new Map();
    const textureLoads = new Map();
    let disposed = false;
    function loadTexture(path, repeat = false) {
      if (!path) return Promise.resolve(null);
      if (!textureLoads.has(path)) {
        const promise = loader.loadAsync(path).then(texture => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = texture.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
          if (disposed) { texture.dispose(); throw new Error('展台已关闭'); }
          textures.set(path, texture);
          return texture;
        }).catch(error => { textureLoads.delete(path); throw error; });
        textureLoads.set(path, promise);
      }
      return textureLoads.get(path);
    }

    // 使用已有石窟与大漠素材，保留明亮沙色与远景，只柔化背景细节。
    const backgroundAsset = manifest.assets.find(asset => asset.id === 'B01');
    if (!backgroundAsset) throw new Error('素材清单缺少背景图');
    const backgroundSource = await loadTexture(`assets/${backgroundAsset.path}`);
    const backgroundCanvas = document.createElement('canvas');
    backgroundCanvas.width = 2048;
    backgroundCanvas.height = 1152;
    const backgroundContext = backgroundCanvas.getContext('2d');
    backgroundContext.fillStyle = '#8b7967';
    backgroundContext.fillRect(0, 0, 2048, 1152);
    backgroundContext.filter = 'blur(6px) brightness(0.96) saturate(0.8) sepia(0.18)';
    // 多画一点到边界外，避免虚化时画面四边透出空隙。
    backgroundContext.drawImage(backgroundSource.image, -40, -23, 2128, 1198);
    backgroundContext.filter = 'none';
    // 轻薄暖褐罩色，与壁画的赭石呼应，避免灰绿罩色令背景发冷。
    backgroundContext.fillStyle = 'rgba(112, 76, 43, 0.10)';
    backgroundContext.fillRect(0, 0, 2048, 1152);
    const background = new THREE.CanvasTexture(backgroundCanvas);
    background.colorSpace = THREE.SRGBColorSpace;
    stage.scene.background = background;
    function fitBackground() {
      const nextNarrowFraming = window.matchMedia('(max-width: 600px)').matches;
      if (nextNarrowFraming !== narrowFraming) {
        narrowFraming = nextNarrowFraming;
        frameDisplayCamera();
      }
      const viewport = stage.renderer.domElement.parentElement;
      const viewAspect = viewport.clientWidth / Math.max(viewport.clientHeight, 1);
      const imageAspect = backgroundCanvas.width / backgroundCanvas.height;
      // 保持图片比例，居中裁切铺满，背景建筑不会被拉长。
      if (viewAspect < imageAspect) background.repeat.set(viewAspect / imageAspect, 1);
      else background.repeat.set(1, imageAspect / viewAspect);
      // 手机取景稍偏左，让石窟崖壁也能保留在窄画面里。
      const horizontalFocus = viewAspect < 1 ? 0.2 : 0.5;
      background.offset.set((1 - background.repeat.x) * horizontalFocus, (1 - background.repeat.y) / 2);
      background.updateMatrix();
    }
    const backgroundObserver = new ResizeObserver(fitBackground);
    backgroundObserver.observe(document.querySelector('#viewport'));
    fitBackground();

    updateLoading(60, '背景已就绪，正在准备伞面与竹木材质……');
    let model = null;
    let displayPhase = 0;
    const posePivot = new THREE.Vector3();
    // 以伞身中点斜置，整体放大并下移，让手柄末端靠近背景地面。
    // 只调整整个展品的摆放，不改变生成器和任何结构参数。
    function applyDisplayPose(target) {
      const pivotHeight = target.userData.params.shaftLength / 2;
      target.rotation.set(0.30, Math.sin(displayPhase) * 0.12, 0.5, 'XYZ');
      const displayScale = 1.18;
      target.scale.setScalar(displayScale);
      posePivot.set(0, pivotHeight, 0).applyEuler(target.rotation).multiplyScalar(displayScale);
      target.position.set(-posePivot.x, 0.6 - posePivot.y, -posePivot.z);
    }
    let current = null;
    let selectionVersion = 0;
    let selectionAnimating = false;
    let patternVersion = 0;
    let displayedOpen = 1;
    let targetOpen = 1;
    let patternTransition = null;
    // 过渡期间用小画布混合两张图，结束立即恢复原始高清贴图。
    const blendCanvas = document.createElement('canvas');
    blendCanvas.width = blendCanvas.height = 512;
    const blendContext = blendCanvas.getContext('2d');
    const blendTexture = new THREE.CanvasTexture(blendCanvas);
    blendTexture.colorSpace = THREE.SRGBColorSpace;
    function applyPatternMap(paper, texture) {
      const hadMap = Boolean(paper.map);
      paper.map = texture;
      if (hadMap !== Boolean(texture)) paper.needsUpdate = true;
    }
    function drawPatternBlend(amount) {
      const { from, to } = patternTransition;
      blendContext.globalAlpha = 1;
      blendContext.fillStyle = '#ffffff';
      blendContext.fillRect(0, 0, 512, 512);
      if (from) blendContext.drawImage(from.image, 0, 0, 512, 512);
      blendContext.globalAlpha = amount;
      if (to) blendContext.drawImage(to.image, 0, 0, 512, 512);
      else blendContext.fillRect(0, 0, 512, 512);
      blendContext.globalAlpha = 1;
      blendTexture.needsUpdate = true;
    }
    function setPattern(texture, path, animate = false) {
      const paper = model.getObjectByName('canopy').children[0].material;
      const previous = patternTransition?.to ?? paper.map;
      // 连续快速切换时，以前一次的目标图接续，不留下旧的异步动画。
      patternTransition = null;
      if (animate && !reducedMotion.matches && previous !== texture) {
        patternTransition = { from: previous === blendTexture ? null : previous, to: texture, paper, start: performance.now() };
        drawPatternBlend(0);
        applyPatternMap(paper, blendTexture);
      } else applyPatternMap(paper, texture);
      model.userData.params.canopyTexture = path;
    }
    // 所有款式共用“收拢旧伞—展开新伞”的过渡，始终保留一把伞在画面中。
    function animateSelectionOpen(target, from, to, duration, version) {
      if (reducedMotion.matches) { target.setOpenAmount(to); return Promise.resolve(true); }
      target.setOpenAmount(from);
      return new Promise(resolve => {
        let started;
        function tick(time) {
          if (disposed || version !== selectionVersion) { resolve(false); return; }
          if (started === undefined) started = time;
          const progress = Math.min(1, (time - started) / duration);
          const eased = progress * progress * (3 - 2 * progress);
          target.setOpenAmount(from + (to - from) * eased);
          if (progress === 1) resolve(true);
          else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }
    async function selectUmbrella(entry, button) {
      const version = ++selectionVersion;
      selectionAnimating = true;
      ++patternVersion;
      panel.disabled = true;
      status.textContent = '正在加载展品……';
      try {
        const path = entry.material.canopyTexture || '';
        if (path && !patterns.some(pattern => `assets/${pattern.path}` === path)) {
          throw new Error('档案纹样不在素材清单内');
        }
        const [bambooTexture, woodTexture, canopyTexture] = await Promise.all([
          loadTexture(entry.textures.bamboo, true), loadTexture(entry.textures.wood, true), loadTexture(path),
        ]);
        if (disposed || version !== selectionVersion) return;
        const next = createUmbrella({
          ...entry.geometry, ...entry.material,
          canopyTexture: null, bambooTexture, woodTexture,
        });
        // 图片准备好才开始过渡；快速连点时取消旧请求并释放未展示的模型。
        if (model) {
          patternTransition = null;
          const completed = await animateSelectionOpen(model, model.userData.params.openAmount, 0, 180, version);
          if (!completed) { disposeModel(next); return; }

          stage.scene.remove(model);
          disposeModel(model);
        }
        const animateIn = Boolean(model);
        model = next;
        applyDisplayPose(model);
        patternTransition = null;
        displayedOpen = targetOpen = entry.geometry.openAmount;
        current = entry;
        setPattern(canopyTexture, path || null);
        if (animateIn) model.setOpenAmount(0);
        model.traverse(part => {
          if (part.isMesh) {
            part.castShadow = !part.material.isMeshPhysicalMaterial;
            part.receiveShadow = part.material.isMeshPhysicalMaterial;
          }
        });
        stage.scene.add(model);
        // 首屏加强暖色逆光，与正面柔光配合；不改动档案和调参台。
        stage.setMainLight(entry.lighting.lightAngle, Math.min(10, entry.lighting.lightIntensity * 1.5));
        if (animateIn && !await animateSelectionOpen(model, 0, entry.geometry.openAmount, 280, version)) return;
        openInput.value = entry.geometry.openAmount;
        openOutput.value = `${Math.round(entry.geometry.openAmount * 100)}%`;
        syncPatternSelection(path);
        for (const item of catalog.querySelectorAll('button')) item.removeAttribute('aria-current');
        button.setAttribute('aria-current', 'true');
        exhibition.dataset.umbrellaId = entry.id;
        document.title = `${entry.name}｜一伞敦煌`;
        exhibitName.textContent = entry.name;
        const summaryWords = entry.patternSummary?.words;
        exhibitSummary.textContent = Array.isArray(summaryWords) ? summaryWords.join(' · ') : '';
        exhibitSummary.hidden = !exhibitSummary.textContent;
        exhibitCaption.hidden = false;
        renderCulture(entry);
        status.textContent = '';
      } catch (error) {
        if (version === selectionVersion) status.textContent = `展品加载失败：${error.message}`;
      } finally {
        if (version === selectionVersion) {
          selectionAnimating = false;
          if (model) displayedOpen = model.userData.params.openAmount;
          panel.disabled = !model;
          inspectButton.disabled = !model;
          rotationButton.disabled = !model || reducedMotion.matches;
        }
      }
    }

    const fragment = document.createDocumentFragment();
    for (const entry of umbrellas) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = entry.name;
      button.dataset.umbrellaId = entry.id;
      button.addEventListener('click', () => {
        if (current?.id !== entry.id) selectUmbrella(entry, button);
      });
      item.append(button); fragment.append(item);
    }
    catalog.replaceChildren(fragment);

    openInput.addEventListener('input', () => {
      if (!model) return;
      targetOpen = Number(openInput.value);
      openOutput.value = `${Math.round(Number(openInput.value) * 100)}%`;
    });
    patternInput.addEventListener('click', async event => {
      const button = event.target.closest('button[data-pattern-path]');
      if (!button || !model || selectionAnimating) return;
      const path = button.dataset.patternPath;
      const version = ++patternVersion;
      const targetModel = model;
      status.textContent = '正在加载纹样……';
      try {
        const texture = await loadTexture(path);
        if (disposed || version !== patternVersion || model !== targetModel) return;
        setPattern(texture, path, true);
        syncPatternSelection(path);
        status.textContent = '';
      } catch (error) {
        if (version !== patternVersion || model !== targetModel) return;
        syncPatternSelection(model.userData.params.canopyTexture || '');
        status.textContent = `纹样加载失败：${error.message}`;
      }
    });
    resetViewButton.addEventListener('click', () => {
      if (!model) return;
      stage.controls.reset();
      displayPhase = 0;
      applyDisplayPose(model);
      actionStatus.textContent = '已重置视角，开合程度和纹样保持当前选择。';
    });

    // 复用展台的绘制方式，只在绘制前加入缓慢自转。
    // 鼠标操作时暂停自转，松手两秒后再继续，避免与拖动相互干扰。
    let interacting = false;
    let autoPaused = false;
    let resumeAt = 0;
    let previousTime;
    function setAutoPaused(paused) {
      autoPaused = paused || reducedMotion.matches;
      rotationButton.disabled = reducedMotion.matches || !model;
      const label = reducedMotion.matches ? '已减少动态' : (autoPaused ? '继续自转' : '暂停自转');
      rotationButton.querySelector('.rotation-label').textContent = label;
      rotationButton.querySelector('.rotation-icon').textContent = autoPaused ? '▷' : 'Ⅱ';
      rotationButton.setAttribute('aria-pressed', String(autoPaused));
      rotationButton.title = label;
      if (!autoPaused) resumeAt = performance.now();
    }
    function syncMotionPreference() {
      stage.controls.enableDamping = !reducedMotion.matches;
      setAutoPaused(autoPaused);
      if (reducedMotion.matches) {
        if (patternTransition) {
          applyPatternMap(patternTransition.paper, patternTransition.to);
          patternTransition = null;
        }
        actionStatus.textContent = '已按系统设置停止自动转动；仍可手动拖动观察。';
      }
    }
    reducedMotion.addEventListener('change', syncMotionPreference);
    syncMotionPreference();
    rotationButton.addEventListener('click', () => {
      setAutoPaused(!autoPaused);
      actionStatus.textContent = autoPaused ? '已暂停自转，仍可拖动查看。' : '已恢复自动旋转。';
    });
    inspectButton.addEventListener('click', () => {
      setAutoPaused(true);
      actionStatus.textContent = '已暂停自转，请在伞上拖动旋转，细看伞骨；手机可用单指拖动。';
      stage.renderer.domElement.focus({ preventScroll: true });
    });
    stage.controls.addEventListener('start', () => { interacting = true; });
    stage.controls.addEventListener('end', () => { interacting = false; resumeAt = performance.now() + 2000; });
    stage.renderer.setAnimationLoop(time => {
      const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      if (model && !selectionAnimating && displayedOpen !== targetOpen) {
        displayedOpen = reducedMotion.matches ? targetOpen
          : displayedOpen + (targetOpen - displayedOpen) * (1 - Math.exp(-16 * delta));
        if (Math.abs(targetOpen - displayedOpen) < 0.0005) displayedOpen = targetOpen;
        model.setOpenAmount(displayedOpen);
      }
      if (patternTransition) {
        const amount = Math.min(1, Math.max(0, (time - patternTransition.start) / 320));
        drawPatternBlend(amount * amount * (3 - 2 * amount));
        if (amount === 1) {
          applyPatternMap(patternTransition.paper, patternTransition.to);
          patternTransition = null;
        }
      }
      if (model && !reducedMotion.matches && !autoPaused && !interacting && time >= resumeAt) {
        displayPhase += delta * 0.42;
        applyDisplayPose(model);
      }
      stage.controls.update();
      stage.renderer.render(stage.scene, stage.camera);
    });
    stage.renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); panel.disabled = true;
      status.textContent = '三维画面已中断，请刷新页面。';
    });
    window.addEventListener('pagehide', () => {
      disposed = true;
      reducedMotion.removeEventListener('change', syncMotionPreference);
      if (model) disposeModel(model);
      textures.forEach(texture => texture.dispose());
      backgroundObserver.disconnect();
      background.dispose();
      blendTexture.dispose();
      stage.dispose();
    }, { once: true });
    await selectUmbrella(umbrellas[0], catalog.querySelector('button'));
    if (!model) throw new Error(status.textContent || '首款展品未能加载');
    updateLoading(100, '展台已准备好');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    loadingPanel.hidden = true;
    exhibition.setAttribute('aria-busy', 'false');
  } catch (error) {
    loadingPanel.hidden = false;
    loadingProgress.hidden = true;
    loadingMessage.textContent = '展台加载未完成，请检查网络后刷新页面。';
    exhibition.setAttribute('aria-busy', 'false');
    panel.disabled = true;
    status.textContent = `页面加载失败：${error.message}。请通过本地预览地址打开，并检查数据与网络连接。`;
  }
}

start();
