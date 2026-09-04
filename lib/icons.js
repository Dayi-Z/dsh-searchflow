/**
 * dsh-searchflow shared icon library — extracted from dsh-icon-workbench.
 * 7 animated icons: Search / Reading / Screenshot / Click / Navigate / Done / Error.
 * All use h() (createElement), no JSX. KF injected once via ensureKF().
 * @module dsh-searchflow/icons
 */

let react;
let injected = false;

const KF = `
@keyframes wbDraw{to{stroke-dashoffset:0}}
@keyframes wbFadeIn{from{opacity:0}to{opacity:1}}
@keyframes wbFadeOut{from{opacity:1}to{opacity:0}}
@keyframes wbCornerBreathe{0%,100%{transform:scale(1);opacity:.72}50%{transform:scale(1.1);opacity:1}}
@keyframes wbSonar{0%{transform:scale(.88);opacity:.45}100%{transform:scale(1.55);opacity:0}}
@keyframes wbRadarSweep{to{transform:rotate(360deg)}}
@keyframes wbBreath{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.12);opacity:1}}
@keyframes wbRippleArc{0%{transform:scale(.7);opacity:.55}100%{transform:scale(1.7);opacity:0}}
@keyframes wbFlow{to{stroke-dashoffset:-18}}
@keyframes wbLockRing{0%{transform:scale(.55);opacity:.8}100%{transform:scale(1.35);opacity:0}}
@keyframes wbImpact{0%{transform:scale(.5);opacity:.55}100%{transform:scale(1.7);opacity:0}}
@keyframes wbEndpoint{0%,100%{transform:scale(1);opacity:.95}50%{transform:scale(1.35);opacity:1}}
@keyframes wbBlink{0%,100%{opacity:.3}50%{opacity:.9}}
@keyframes wbCircleIn{0%{stroke-dashoffset:63}100%{stroke-dashoffset:0}}
@keyframes wbCheckIn{0%{stroke-dashoffset:24}100%{stroke-dashoffset:0}}
@keyframes wbDoneBounce{0%{transform:scale(.9)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes wbShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-1.5px)}40%{transform:translateX(1.5px)}60%{transform:translateX(-1px)}80%{transform:translateX(1px)}}
@keyframes wbPathDraw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
@keyframes wbTravel{0%{offset-distance:0%;opacity:0}10%{opacity:1}80%{opacity:1}100%{offset-distance:100%;opacity:0}}
@keyframes wbDoorCycle{0%,8%{transform:translateY(0)}26%,64%{transform:translateY(6.5px)}82%,100%{transform:translateY(0)}}
@keyframes wbDoorOut{to{transform:translateY(6.5px)}}
@keyframes wbDoorJam{0%{transform:translateY(0)}30%{transform:translateY(2.4px)}42%{transform:translateY(1.9px)}54%{transform:translateY(2.4px)}66%{transform:translateY(2.1px)}100%{transform:translateY(2.2px)}}
@keyframes wbLensQuest{0%,26%{transform:translate(0,0) rotate(0)}34%,42%{transform:translate(-3.8px,-5.6px) rotate(-10deg)}56%{transform:translate(4.2px,-5.6px) rotate(8deg)}64%,78%{transform:translate(.2px,-4.9px) rotate(0)}90%,100%{transform:translate(0,0) rotate(0)}}
@keyframes wbLensHover{to{transform:translate(.2px,-14px)}}
@keyframes wbLensBob{0%,100%{transform:translate(.2px,-14px)}50%{transform:translate(.2px,-13.4px)}}
@keyframes wbItemReveal{0%,24%{opacity:0;transform:translateY(2.5px) scale(.6)}32%{opacity:1;transform:translateY(-.8px) scale(1.12)}38%,76%{opacity:1;transform:translateY(0) scale(1)}88%,100%{opacity:0;transform:translateY(2px) scale(.7)}}
@keyframes wbItemGlow{0%,36%{filter:brightness(1)}42%{filter:brightness(1.9) drop-shadow(0 0 2px currentColor)}48%,100%{filter:brightness(1)}}
@keyframes wbItemPop{0%{opacity:0;transform:translateY(2.5px) scale(.6)}60%{opacity:1;transform:translateY(-.8px) scale(1.12)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes wbSpark{0%,56%{opacity:0;transform:scale(.3) rotate(0)}64%{opacity:1;transform:scale(1.15) rotate(20deg)}72%,100%{opacity:0;transform:scale(.4) rotate(45deg)}}
@keyframes wbScanSweep{0%{transform:translateY(0);opacity:0}8%{opacity:.55}50%{transform:translateY(8.6px);opacity:.55}56%,100%{transform:translateY(8.6px);opacity:0}}
@keyframes wbFlash{0%,57%{opacity:0}62%{opacity:.28}70%,100%{opacity:0}}
@keyframes wbPrint{0%,60%{transform:translateY(0);opacity:0}63%{transform:translateY(0);opacity:1}84%{transform:translateY(6.5px);opacity:1}93%,100%{transform:translateY(6.5px);opacity:0}}
@keyframes wbPrintOnce{0%{transform:translateY(0);opacity:0}40%{opacity:1}100%{transform:translateY(6.5px);opacity:1}}
@keyframes wbCursorJourney{0%,6%{transform:translate(4.5px,6px) scale(1)}30%{transform:translate(15.5px,12px) scale(1)}38%,50%{transform:translate(15.5px,12px) scale(.8)}62%{transform:translate(15.5px,12px) scale(1)}82%,100%{transform:translate(4.5px,6px) scale(1)}}
@keyframes wbTargetPulse{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.07);opacity:1}}
@keyframes wbTargetHit{0%,32%{transform:scale(1)}40%,50%{transform:scale(.76)}64%,100%{transform:scale(1)}}
@keyframes wbClickRipple{0%,38%{transform:scale(.5);opacity:0}41%{opacity:.5}64%{transform:scale(1.7);opacity:0}100%{transform:scale(1.7);opacity:0}}
@keyframes wbCursorLand{0%{transform:translate(4.5px,6px) scale(1);opacity:1}45%{transform:translate(15.5px,12px) scale(1)}58%{transform:translate(15.5px,12px) scale(.8)}75%{transform:translate(15.5px,12px) scale(.85);opacity:1}100%{transform:translate(4.5px,6px) scale(1);opacity:.45}}
@keyframes wbCursorMiss{0%{transform:translate(4.5px,6px) scale(1)}70%{transform:translate(7px,14px) scale(1)}100%{transform:translate(7px,14px) scale(.85)}}
@keyframes wbTargetPress{to{transform:scale(.82)}}
.wb-icon *{transform-box:fill-box;transform-origin:center}
@media(prefers-reduced-motion:reduce){.wb-icon *{animation:none!important;transition:none!important}}
`;

function init(r) {
  react = r;
  cx = react.createElement;
  if (injected || typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.id = 'sf-icon-kf';
  s.textContent = KF;
  document.head.appendChild(s);
  injected = true;
}

let SPEED = 1;
function spd(s) { return (parseFloat(s) / SPEED).toFixed(2) + 's'; }

const FADE = 'opacity .28s cubic-bezier(.4,0,.2,1)';
let cx = null;

// ── SearchIcon: 拉匣寻物 ──
function SearchIcon({ state = 'running', size = 24 }) {
  const run = state === 'running', err = state === 'error', done = state === 'done';
  const LOOP = spd('3.8s');
  const REVEAL_D = [0, .09, .18], GLOW_D = [0, .27, .5];
  const itemStyle = (i) => ({
    transition: FADE,
    animation: run
      ? `wbItemReveal ${LOOP} cubic-bezier(.34,1.4,.64,1) ${REVEAL_D[i] / SPEED}s infinite, wbItemGlow ${LOOP} ease ${GLOW_D[i] / SPEED}s infinite`
      : done ? `wbItemPop ${spd('.4s')} cubic-bezier(.34,1.56,.64,1) ${(.28 + i * .1) / SPEED}s both` : undefined
  });
  const itemOp = err ? .12 : .9;
  return cx('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, className: 'wb-icon', style: { overflow: 'visible', animation: err ? `wbShake ${spd('.4s')} ease` : undefined } },
    cx('rect', { x: 4.5, y: 6, width: 15, height: 9, rx: 1.5, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, opacity: .4, strokeLinecap: 'round' }),
    cx('rect', { x: 6.1, y: 7.5, width: 11.8, height: 6.3, rx: 1, fill: 'currentColor', opacity: .05 }),
    cx('line', { x1: 6.5, y1: 13.4, x2: 17.9, y2: 13.4, stroke: 'currentColor', strokeWidth: .8, opacity: .25, strokeLinecap: 'round' }),
    cx('g', { key: 'items' },
      cx('path', { d: 'M6.6 12.6 L8.2 9.8 L9.8 12.6 Z', fill: 'currentColor', opacity: itemOp, style: itemStyle(0) }),
      cx('circle', { cx: 12.2, cy: 11.4, r: 1.3, fill: 'currentColor', opacity: itemOp, style: itemStyle(1) }),
      cx('rect', { x: 14.9, y: 10.1, width: 2.6, height: 2.6, rx: .5, fill: 'currentColor', opacity: itemOp, style: itemStyle(2) })
    ),
    run && cx('path', { d: 'M12.2 7.2 L12.6 8.1 L13.5 8.5 L12.6 8.9 L12.2 9.8 L11.8 8.9 L10.9 8.5 L11.8 8.1 Z', fill: 'currentColor', style: { animation: `wbSpark ${LOOP} ease infinite` } }),
    cx('g', { style: { animation: run ? `wbDoorCycle ${LOOP} cubic-bezier(.45,.05,.25,1) infinite` : done ? `wbDoorOut ${spd('.5s')} cubic-bezier(.34,1.56,.64,1) forwards` : `wbDoorJam ${spd('.7s')} ease forwards` } },
      cx('rect', { x: 5.2, y: 6.8, width: 13.6, height: 7.4, rx: 1.2, fill: 'currentColor', fillOpacity: .14, stroke: 'currentColor', strokeWidth: 1.2, strokeOpacity: .85 }),
      cx('line', { x1: 8, y1: 8.3, x2: 16, y2: 8.3, stroke: 'currentColor', strokeWidth: .7, opacity: .3, strokeLinecap: 'round' }),
      cx('g', { style: { animation: run ? `wbLensQuest ${LOOP} cubic-bezier(.45,.05,.25,1) infinite` : done ? `wbLensHover ${spd('.45s')} cubic-bezier(.34,1.56,.64,1) ${spd('.3s')} forwards, wbLensBob ${spd('2.2s')} ease-in-out ${spd('.9s')} infinite` : undefined } },
        cx('circle', { cx: 12, cy: 10.5, r: 2.3, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, opacity: .95 }),
        cx('path', { d: 'M13.6 12.1 Q15.1 13.4 15.2 14.8', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', opacity: .95 }),
        done && cx('path', { d: 'M10.9 10.5 L11.9 11.5 L13.5 9.6', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: 24, strokeDashoffset: 24, style: { animation: `wbDraw ${spd('.3s')} ease ${spd('.8s')} forwards` } })
      )
    ),
    err && cx('g', { key: 'err', style: { animation: `wbFadeIn ${spd('.18s')} ease ${spd('.25s')} both` } },
      [['M10.9 7 L13.1 9.2'], ['M13.1 7 L10.9 9.2']].map(([d], i) =>
        cx('path', { key: i, d, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeDasharray: 12, strokeDashoffset: 12, style: { animation: `wbDraw ${spd('.22s')} ease ${spd(i ? '.42s' : '.3s')} forwards` } })
      )
    )
  );
}

// ── ScreenshotIcon: 取景·定影 ──
const CORNERS = [
  { d: 'M3 7 V3 H7', delay: '0s', dur: '1.5s' },
  { d: 'M17 3 H21 V7', delay: '.12s', dur: '1.6s' },
  { d: 'M21 17 V21 H17', delay: '.25s', dur: '1.45s' },
  { d: 'M7 21 H3 V17', delay: '.38s', dur: '1.55s' }
];
function ScreenshotIcon({ state = 'running', size = 24 }) {
  const run = state === 'running', err = state === 'error', done = state === 'done';
  const LOOP = spd('3.2s');
  return cx('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, className: 'wb-icon', style: { overflow: 'visible', animation: err ? `wbShake ${spd('.35s')} ease` : undefined } },
    cx('rect', { x: 7, y: 7, width: 10, height: 10, rx: 1.5, fill: 'none', stroke: 'currentColor', strokeWidth: 1, opacity: done ? .1 : .15, style: { transition: FADE } }),
    cx('g', { opacity: run ? .35 : done ? .18 : .15, style: { transition: FADE } },
      cx('path', { d: 'M8 14.6 L10.8 11.2 L12.6 13.4 L13.8 12 L16 14.6', fill: 'none', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      cx('circle', { cx: 10.4, cy: 9.6, r: .8, fill: 'currentColor' })
    ),
    CORNERS.map((c, i) =>
      cx('path', { key: i, d: c.d, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', style: { transformOrigin: 'center', opacity: run ? 1 : .45, transition: FADE, animation: run ? `wbCornerBreathe ${(parseFloat(c.dur) / SPEED).toFixed(2)}s cubic-bezier(.4,0,.2,1) ${parseFloat(c.delay) / SPEED}s infinite` : undefined } })
    ),
    run && cx('line', { x1: 7.6, y1: 7.6, x2: 16.4, y2: 7.6, stroke: 'currentColor', strokeWidth: 1.1, strokeLinecap: 'round', style: { animation: `wbScanSweep ${LOOP} ease-in-out infinite`, filter: 'drop-shadow(0 0 2.5px currentColor)' } }),
    run && cx('rect', { x: 7, y: 7, width: 10, height: 10, rx: 1.5, fill: 'currentColor', style: { animation: `wbFlash ${LOOP} ease infinite` } }),
    run && cx('g', { style: { animation: `wbPrint ${LOOP} cubic-bezier(.3,.7,.3,1) infinite` } },
      cx('rect', { x: 9.2, y: 9.8, width: 5.6, height: 4.4, rx: .6, fill: 'currentColor', fillOpacity: .16, stroke: 'currentColor', strokeWidth: 1.1 }),
      cx('path', { d: 'M10.1 13.2 L11.4 11.5 L12.4 12.7 L13 12 L14.5 13.2', fill: 'none', stroke: 'currentColor', strokeWidth: .7, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: .9 }),
      cx('circle', { cx: 13.4, cy: 10.9, r: .45, fill: 'currentColor', opacity: .9 })
    ),
    done && cx('g', { key: 'done', style: { animation: `wbPrintOnce ${spd('.5s')} cubic-bezier(.34,1.3,.64,1) both` } },
      cx('rect', { x: 9.2, y: 9.8, width: 5.6, height: 4.4, rx: .6, fill: 'currentColor', fillOpacity: .16, stroke: 'currentColor', strokeWidth: 1.1 }),
      cx('path', { d: 'M10.7 12.1 L11.7 13.1 L13.5 11', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: 24, strokeDashoffset: 24, style: { animation: `wbDraw ${spd('.3s')} ease ${spd('.5s')} forwards` } })
    ),
    err && cx('g', { key: 'err' },
      cx('line', { x1: 7.6, y1: 11.6, x2: 16.4, y2: 11.6, stroke: 'currentColor', strokeWidth: 1.1, strokeLinecap: 'round', opacity: .2, style: { animation: `wbBlink ${spd('.7s')} ease-in-out infinite` } }),
      [['M10.4 10.4 L13.6 13.6'], ['M13.6 10.4 L10.4 13.6']].map(([d], i) =>
        cx('path', { key: i, d, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeDasharray: 12, strokeDashoffset: 12, style: { animation: `wbDraw ${spd('.22s')} ease ${spd(i ? '.18s' : '.08s')} forwards` } })
      )
    )
  );
}

// ── ClickIcon: 指尖按靶 ──
function ClickIcon({ state = 'running', size = 24 }) {
  const run = state === 'running', err = state === 'error', done = state === 'done';
  const LOOP = spd('2.8s');
  const cursorAnim = run ? `wbCursorJourney ${LOOP} cubic-bezier(.45,.05,.25,1) infinite` : done ? `wbCursorLand ${spd('.55s')} cubic-bezier(.35,.05,.25,1) forwards` : `wbCursorMiss ${spd('.45s')} cubic-bezier(.3,.7,.3,1) forwards`;
  return cx('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, className: 'wb-icon', style: { overflow: 'visible', animation: err ? `wbShake ${spd('.35s')} ease` : undefined } },
    cx('g', { style: { opacity: err ? .25 : 1, transition: FADE, animation: run ? `wbTargetPulse ${spd('1.6s')} ease-in-out infinite` : undefined } },
      cx('g', { style: { animation: run ? `wbTargetHit ${LOOP} cubic-bezier(.34,1.56,.64,1) infinite` : done ? `wbTargetPress ${spd('.25s')} ease ${spd('.32s')} both` : undefined } },
        cx('circle', { cx: 15.5, cy: 12, r: 3.6, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, opacity: .75 }),
        cx('circle', { cx: 15.5, cy: 12, r: 1.2, fill: 'currentColor', opacity: done ? 1 : .5, style: { transition: FADE } })
      )
    ),
    run && cx('circle', { cx: 15.5, cy: 12, r: 4, fill: 'none', stroke: 'currentColor', strokeWidth: 1, style: { animation: `wbClickRipple ${LOOP} ease-out infinite` } }),
    cx('path', { d: 'M0 0 L0 7 L1.8 5.5 L3 7.8 L4 7.3 L2.8 5 L5.2 5 Z', fill: 'currentColor', stroke: 'currentColor', strokeWidth: .6, strokeLinejoin: 'round', style: { transformBox: 'fill-box', transformOrigin: '0 0', animation: cursorAnim } }),
    done && cx('g', { key: 'done' },
      [0, 1].map(i =>
        cx('circle', { key: i, cx: 15.5, cy: 12, r: 4.2, fill: 'none', stroke: 'currentColor', strokeWidth: 1, opacity: 0, style: { animation: `wbImpact ${spd('.55s')} ease-out ${(i * 0.12 / SPEED).toFixed(2)}s forwards` } })
      ),
      cx('path', { d: 'M13.9 12 L15.1 13.2 L17.4 10.7', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: 24, strokeDashoffset: 24, style: { animation: `wbDraw ${spd('.26s')} ease ${spd('.5s')} forwards` } })
    ),
    err && cx('g', { key: 'err' },
      [['M5.9 12.5 L8.1 14.7'], ['M8.1 12.5 L5.9 14.7']].map(([d], i) =>
        cx('path', { key: i, d, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeDasharray: 12, strokeDashoffset: 12, style: { animation: `wbDraw ${spd('.22s')} ease ${spd(i ? '.28s' : '.4s')} forwards` } })
      )
    )
  );
}

// ── NavigateIcon: 路径绘制 ──
function NavigateIcon({ state = 'running', size = 24 }) {
  const run = state === 'running', err = state === 'error', done = state === 'done';
  const D = 'M6 18 L6 11 Q6 6 11 6 L18 6';
  return cx('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, className: 'wb-icon', style: { overflow: 'visible', animation: err ? `wbShake ${spd('.35s')} ease` : undefined } },
    cx('path', { d: D, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeDasharray: '3 5', opacity: run ? .3 : done ? .15 : .2, style: { transition: FADE } }),
    cx('g', { key: 'main', style: { opacity: run ? 1 : 0, transition: FADE } },
      cx('path', { d: D, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeDasharray: '4 10', opacity: .3, style: { animation: `wbFlow ${spd('1.6s')} linear infinite` } }),
      cx('path', { d: 'M-3 -2.9 L3.4 0 L-3 2.9 L-1.3 0 Z', fill: 'currentColor', style: { offsetPath: `path("${D}")`, offsetRotate: 'auto', animation: `wbTravel ${spd('2.4s')} cubic-bezier(.45,.05,.55,.95) infinite`, filter: 'drop-shadow(0 0 2px currentColor)' } })
    ),
    done && cx('g', { key: 'done', style: { animation: `wbFadeIn ${spd('.26s')} ease ${spd('.05s')} both` } },
      cx('path', { d: D, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeDasharray: 26, strokeDashoffset: 26, style: { animation: `wbDraw ${spd('.45s')} ease ${spd('.12s')} forwards` } }),
      cx('circle', { cx: 18, cy: 6, r: 1.8, fill: 'currentColor', opacity: 0, style: { transformOrigin: '18px 6px', animation: `wbFadeIn ${spd('.15s')} ease ${spd('.45s')} forwards, wbEndpoint ${spd('1.2s')} ease-in-out ${spd('.6s')} infinite` } }),
      cx('circle', { cx: 18, cy: 6, r: 3, fill: 'none', stroke: 'currentColor', strokeWidth: 1.1, opacity: 0, style: { transformOrigin: '18px 6px', animation: `wbLockRing ${spd('.6s')} ease-out ${spd('.55s')} forwards` } })
    ),
    err && cx('g', { key: 'err', style: { animation: `wbFadeIn ${spd('.26s')} ease ${spd('.05s')} both` } },
      cx('path', { d: 'M6 18 L6 11 Q6 6 11 6 L14 6', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeDasharray: 22, strokeDashoffset: 22, style: { animation: `wbDraw ${spd('.35s')} ease ${spd('.1s')} forwards` } }),
      cx('path', { d: 'M14 6 L18 6', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeDasharray: '3 4', style: { animation: `wbBlink ${spd('.7s')} ease-in-out ${spd('.3s')} infinite` } }),
      [['M14.6 4.4 L17.4 7.6'], ['M17.4 4.4 L14.6 7.6']].map(([d], i) =>
        cx('path', { key: i, d, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeDasharray: 12, strokeDashoffset: 12, style: { animation: `wbDraw ${spd('.22s')} ease ${spd(i ? '.28s' : '.18s')} forwards` } })
      )
    )
  );
}

// ── ReadingIcon: 16宫格扫描 ──
const RD_N = 4;
function ReadingIcon({ state = 'running', size = 24 }) {
  const gap = Math.max(1.5, size / 10);
  const pad = size / 9;
  const cell = (size - pad * 2 - gap * (RD_N - 1)) / RD_N;
  const [active, setActive] = react.useState(-1);
  const [trail, setTrail] = react.useState(-1);
  const ref = react.useRef({ active: -1, trail: -1 });
  react.useEffect(() => {
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (state !== 'running' || reduced) { setActive(-1); setTrail(-1); ref.current = { active: -1, trail: -1 }; return; }
    let alive = true, timer = null;
    const neighbors = (i) => {
      const r = Math.floor(i / RD_N), c = i % RD_N, out = [];
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < RD_N && nc >= 0 && nc < RD_N) out.push(nr * RD_N + nc);
      }
      return out;
    };
    const step = () => {
      if (!alive) return;
      const cur = ref.current.active;
      let next;
      if (cur >= 0 && Math.random() < 0.7) { const nb = neighbors(cur); next = nb[Math.floor(Math.random() * nb.length)]; }
      else { next = Math.floor(Math.random() * RD_N * RD_N); }
      ref.current = { active: next, trail: Math.random() < 0.15 ? cur : -1 };
      setActive(next); setTrail(ref.current.trail);
      timer = setTimeout(step, (170 + Math.random() * 170) / SPEED);
    };
    step();
    return () => { alive = false; clearTimeout(timer); };
  }, [state]);
  const cells = [];
  for (let i = 0; i < RD_N * RD_N; i++) {
    const r = Math.floor(i / RD_N);
    const onRow = state === 'running' && active >= 0 && r === Math.floor(active / RD_N);
    const isActive = i === active, isTrail = i === trail;
    cells.push(cx('div', { key: i, style: {
      width: cell, height: cell,
      borderRadius: Math.max(1, cell * 0.2),
      background: 'currentColor',
      transform: isActive ? 'scale(1.35)' : isTrail ? 'scale(1.06)' : 'scale(1)',
      opacity: state === 'done' ? .8 : state === 'error' ? .35 : isActive ? 1 : isTrail ? .55 : onRow ? .32 : .16,
      boxShadow: isActive ? '0 0 4px currentColor' : 'none',
      transition: 'opacity .28s ease-out, transform .28s ease-out, box-shadow .28s ease-out'
    } }));
  }
  return cx('div', { className: 'wb-icon', style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, animation: state === 'error' ? `wbShake ${spd('.35s')} ease` : undefined } },
    cx('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${RD_N},${cell}px)`, gridTemplateRows: `repeat(${RD_N},${cell}px)`, gap } }, cells)
  );
}

// ── DoneIcon: 圆圈 + 勾 ──
function DoneIcon({ state = 'done', size = 24 }) {
  return cx('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, className: 'wb-icon', style: { animation: state === 'done' ? `wbDoneBounce ${spd('.4s')} ease ${spd('.6s')} both` : undefined, transformOrigin: 'center' } },
    cx('circle', { cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeDasharray: 57, strokeDashoffset: state === 'done' ? 0 : 57, style: { animation: state === 'done' ? `wbCircleIn ${spd('.4s')} ease forwards` : undefined } }),
    cx('path', { d: 'M8 12.5 L11 15.5 L16 9.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: 24, strokeDashoffset: state === 'done' ? 0 : 24, style: { animation: state === 'done' ? `wbCheckIn ${spd('.3s')} ease ${spd('.35s')} forwards` : undefined } })
  );
}

// ── ErrorIcon: 圆圈 + X ──
function ErrorIcon({ state = 'error', size = 24 }) {
  return cx('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, className: 'wb-icon', style: { animation: state === 'error' ? `wbShake ${spd('.35s')} ease` : undefined } },
    cx('circle', { cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, opacity: .5 }),
    cx('path', { d: 'M8.5 8.5 L15.5 15.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeDasharray: 20, strokeDashoffset: state === 'error' ? 0 : 20, style: { animation: state === 'error' ? `wbDraw ${spd('.3s')} ease ${spd('.1s')} forwards` : undefined } }),
    cx('path', { d: 'M15.5 8.5 L8.5 15.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeDasharray: 20, strokeDashoffset: state === 'error' ? 0 : 20, style: { animation: state === 'error' ? `wbDraw ${spd('.3s')} ease ${spd('.25s')} forwards` : undefined } })
  );
}

// ── Phase → Icon mapping (IconForPhase) ──
const PHASE_MAP = {
  navigate: { Icon: NavigateIcon, label: '导航' },
  settle:   { Icon: SearchIcon,   label: '渲染' },
  search:   { Icon: SearchIcon,   label: '搜索' },
  snapshot: { Icon: ScreenshotIcon, label: '快照' },
  click:    { Icon: ClickIcon,    label: '点击' },
  read:     { Icon: ReadingIcon,  label: '阅读' },
  done:     { Icon: DoneIcon,     label: '完成' },
  error:    { Icon: ErrorIcon,    label: '失败' },
};

function IconForPhase({ phase, state = 'running', size = 18 }) {
  const entry = PHASE_MAP[phase] ?? PHASE_MAP.done;
  const Icon = entry.Icon;
  return Icon({ state, size });
}

export { KF, init, spd, SearchIcon, ScreenshotIcon, ClickIcon, ReadingIcon, NavigateIcon, DoneIcon, ErrorIcon, PHASE_MAP, IconForPhase, SPEED };
