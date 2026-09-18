/**
 * dsh-searchflow — client plugin.
 * Real-time inline visualization of the web tool flow.
 * Observes tool lifecycle events via SSE and replaces the generic
 * tool-call row icons with animated wb_* phase icons — search → fetch →
 * snapshot → click → read → navigate — showing live running/done/error
 * state right where the tool call happens. No summary lane, no floating
 * bubble: the icons ARE the flow indicator.
 */
window.__ModuleLoader__.load({
	id: "dsh-searchflow",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		// ⚠️ 不要 require("react-dom/client")：那个子路径不在浏览器模块表的 seed 里，
		// materialize 时 makeRequire 抛 missed the module table → apply 永不执行（GUI 里插件静默消失）。
		// 内建 client bundle（打包产物自包含）都只用根路径 react-dom 的 legacy render。
		let react_dom = require("react-dom");
		try { document.title = (document.title || "") + " [sf-factory] "; } catch {} // PROBE

		// ═══════════════════════════════════════════════════════
		// CSS Keyframes (injected once into document.head)
		// ═══════════════════════════════════════════════════════
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
@keyframes sfPulseRing{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.25);opacity:0}}
@keyframes sfExpand{from{opacity:0;transform:scale(.92) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes sfCollapse{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.92) translateY(8px)}}
.wb-icon *{transform-box:fill-box;transform-origin:center}
@media(prefers-reduced-motion:reduce){.wb-icon *{animation:none!important;transition:none!important}}
/* Zero-gap stock suppression: React re-creates the leading icon svg on
   expand/collapse; this rule re-hides it the instant it re-enters the DOM
   (CSS applies before any JS sweep could) on rows we have enhanced.
   :not([data-sf-state]) carves out our OWN cloned icons; :not(chevron)
   keeps the expand/collapse arrow visible (it sits inside _leading_ too). */
[data-sf-row] [class*="_leading_"] svg:not([data-sf-state]):not([class*="chevron"]){visibility:hidden!important}

/* Skeleton loading placeholder */
.sf-skeleton {
  background: linear-gradient(
    90deg,
    var(--sf-skeleton-base) 25%,
    var(--sf-skeleton-highlight) 50%,
    var(--sf-skeleton-base) 75%
  );
  background-size: 200% 100%;
  animation: sfShimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}
@keyframes sfShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .sf-skeleton { animation: none; background: var(--sf-skeleton-highlight); }
}

/* Focus visible for interactive elements */
.sf-icon:focus-visible,
[data-sf-inline]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--sf-focus-ring), 0 0 0 4px var(--sf-bg-primary);
}

/* Status badge with proper ARIA */
.sf-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
.sf-status-badge--running { background: var(--sf-status-running-glass); color: var(--sf-status-running); }
.sf-status-badge--done { background: var(--sf-status-done-glass); color: var(--sf-status-done); }
.sf-status-badge--error { background: var(--sf-status-error-glass); color: var(--sf-status-error); }
.sf-status-badge__dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
  animation: sfStatusPulse 1.5s ease-in-out infinite;
}
@keyframes sfStatusPulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}
@media (prefers-reduced-motion: reduce) {
  .sf-status-badge__dot { animation: none; opacity: 1; }
}

/* Live region for status announcements */
.sf-live-region {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0);
  white-space: nowrap; border: 0;
}

/* Focus visible for interactive elements */
.sf-icon:focus-visible,
[data-sf-inline]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--sf-focus-ring), 0 0 0 4px var(--sf-bg-primary);
}

/* Skeleton loading placeholder */
.sf-skeleton {
  background: linear-gradient(
    90deg,
    var(--sf-skeleton-base) 25%,
    var(--sf-skeleton-highlight) 50%,
    var(--sf-skeleton-base) 75%
  );
  background-size: 200% 100%;
  animation: sfShimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}
@keyframes sfShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .sf-skeleton { animation: none; background: var(--sf-skeleton-highlight); }
}
@keyframes sfItemIn{0%{opacity:0;transform:translateY(6px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes sfSegPulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes sfBlink{0%,49%{opacity:1}50%,100%{opacity:0}}
`;
		let kfInjected = false;
		function ensureKF() {
			if (kfInjected || typeof document === "undefined") return;
			const s = document.createElement("style");
			s.id = "sf-icon-kf";
			s.textContent = KF;
			document.head.appendChild(s);
			kfInjected = true;
		}

		// ════════════════════════════════════════════════════════════════
		// Design Tokens — Semantic Color System (Dark Mode Optimized)
		// Based on Developer Tool / IDE dark theme palette
		// ══════════════════════════════════════════════════════════════
		const COLOR_TOKENS = {
			// Base surfaces (OLED-friendly dark)
			bgPrimary: "#0F172A",      // slte 950
			bgCard: "#1B2336",         // slate 900
			bgMuted: "#272F42",        // slate 800
			bgHover: "#334155",        // slate 700
			
			// Text hierarchy
			fgPrimary: "#F8FAFC",      // slate 50
			fgSecondary: "#CBD5E1",    // slate 300
			fgMuted: "#94A3B8",        // slate 400
			
			// Semantic status colors (accessible on dark)
			statusRunning: "#60a5fa",  // blue 400
			statusDone: "#4ade80",     // green 400
			statusError: "#f87171",    // red 400
			statusWarning: "#fbbf24",  // amber 400
			
			// Semantic color with transparency variants
			statusRunningGlass: "rgba(96, 165, 250, 0.14)",
			statusDoneGlass: "rgba(74, 222, 128, 0.12)",
			statusErrorGlass: "rgba(248, 113, 113, 0.12)",
			
			// Focus ring (accessible on dark)
			focusRing: "#60a5fa",
			
			// Border
			borderSubtle: "rgba(148, 163, 184, 0.12)",
			borderFocus: "#60a5fa",
			
			// Skeleton/shimmer
			skeletonBase: "#1E293B",
			skeletonHighlight: "#334155",
			
			// Transitions
			transitionFast: "150ms cubic-bezier(.4,0,.2,1)",
			transitionNormal: "250ms cubic-bezier(.4,0,.2,1)",
			transitionSlow: "350ms cubic-bezier(.4,0,.2,1)",
		};
		
		// Inject CSS custom properties into document root
		function injectColorTokens() {
			if (typeof document === "undefined" || document.getElementById("sf-color-tokens")) return;
			const style = document.createElement("style");
			style.id = "sf-color-tokens";
			const cssVars = Object.entries(COLOR_TOKENS)
				.map(([k, v]) => `--sf-${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v};`)
				.join("\n");
			style.textContent = `:root { ${cssVars} }`;
			document.documentElement.appendChild(style);
		}

		// Reduced motion detection (JS side for components that can't use CSS media query)
		function getReducedMotion() {
			if (typeof window === "undefined") return false;
			return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		}
		let reducedMotion = getReducedMotion();
		if (typeof window !== "undefined") {
			window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
				reducedMotion = e.matches;
			});
		}

		// Speed multiplier
		let SPEED = 1;
		function spd(s) { return (parseFloat(s) / SPEED).toFixed(2) + "s"; }

		const FADE = "opacity .28s cubic-bezier(.4,0,.2,1)";
		const cx = react.createElement;

		// ═══════════════════════════════════════════════════════
		// Icon Components (inline from dsh-icon-workbench)
		// ═══════════════════════════════════════════════════════

		function SearchIcon({ state = "running", size = 24 }) {
			const run = state === "running", err = state === "error", done = state === "done";
			const LOOP = spd("3.8s");
			const REVEAL_D = [0, .09, .18], GLOW_D = [0, .27, .5];
			const itemStyle = (i) => ({
				transition: FADE,
				animation: run
					? `wbItemReveal ${LOOP} cubic-bezier(.34,1.4,.64,1) ${REVEAL_D[i] / SPEED}s infinite, wbItemGlow ${LOOP} ease ${GLOW_D[i] / SPEED}s infinite`
					: done ? `wbItemPop ${spd(".4s")} cubic-bezier(.34,1.56,.64,1) ${(.28 + i * .1) / SPEED}s both` : undefined
			});
			const itemOp = err ? .12 : .9;
			return cx("svg", { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": true, className: "wb-icon", style: { overflow: "visible", animation: err ? `wbShake ${spd(".4s")} ease` : undefined } },
				cx("rect", { x: 4.5, y: 6, width: 15, height: 9, rx: 1.5, fill: "none", stroke: "currentColor", strokeWidth: 1.3, opacity: .4, strokeLinecap: "round" }),
				cx("rect", { x: 6.1, y: 7.5, width: 11.8, height: 6.3, rx: 1, fill: "currentColor", opacity: .05 }),
				cx("line", { x1: 6.5, y1: 13.4, x2: 17.9, y2: 13.4, stroke: "currentColor", strokeWidth: .8, opacity: .25, strokeLinecap: "round" }),
				cx("g", { key: "items" },
					cx("path", { d: "M6.6 12.6 L8.2 9.8 L9.8 12.6 Z", fill: "currentColor", opacity: itemOp, style: itemStyle(0) }),
					cx("circle", { cx: 12.2, cy: 11.4, r: 1.3, fill: "currentColor", opacity: itemOp, style: itemStyle(1) }),
					cx("rect", { x: 14.9, y: 10.1, width: 2.6, height: 2.6, rx: .5, fill: "currentColor", opacity: itemOp, style: itemStyle(2) })
				),
				run && cx("path", { d: "M12.2 7.2 L12.6 8.1 L13.5 8.5 L12.6 8.9 L12.2 9.8 L11.8 8.9 L10.9 8.5 L11.8 8.1 Z", fill: "currentColor", style: { animation: `wbSpark ${LOOP} ease infinite` } }),
				cx("g", { style: { animation: run ? `wbDoorCycle ${LOOP} cubic-bezier(.45,.05,.25,1) infinite` : done ? `wbDoorOut ${spd(".5s")} cubic-bezier(.34,1.56,.64,1) forwards` : `wbDoorJam ${spd(".7s")} ease forwards` } },
					cx("rect", { x: 5.2, y: 6.8, width: 13.6, height: 7.4, rx: 1.2, fill: "currentColor", fillOpacity: .14, stroke: "currentColor", strokeWidth: 1.2, strokeOpacity: .85 }),
					cx("line", { x1: 8, y1: 8.3, x2: 16, y2: 8.3, stroke: "currentColor", strokeWidth: .7, opacity: .3, strokeLinecap: "round" }),
					cx("g", { style: { animation: run ? `wbLensQuest ${LOOP} cubic-bezier(.45,.05,.25,1) infinite` : done ? `wbLensHover ${spd(".45s")} cubic-bezier(.34,1.56,.64,1) ${spd(".3s")} forwards, wbLensBob ${spd("2.2s")} ease-in-out ${spd(".9s")} infinite` : undefined } },
						cx("circle", { cx: 12, cy: 10.5, r: 2.3, fill: "none", stroke: "currentColor", strokeWidth: 1.5, opacity: .95 }),
						cx("path", { d: "M13.6 12.1 Q15.1 13.4 15.2 14.8", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", opacity: .95 }),
						done && cx("path", { d: "M10.9 10.5 L11.9 11.5 L13.5 9.6", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round", strokeDasharray: 24, strokeDashoffset: 24, style: { animation: `wbDraw ${spd(".3s")} ease ${spd(".8s")} forwards` } })
					)
				),
				err && cx("g", { key: "err", style: { animation: `wbFadeIn ${spd(".18s")} ease ${spd(".25s")} both` } },
					[["M10.9 7 L13.1 9.2"], ["M13.1 7 L10.9 9.2"]].map(([d], i) =>
						cx("path", { key: i, d, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeDasharray: 12, strokeDashoffset: 12, style: { animation: `wbDraw ${spd(".22s")} ease ${spd(i ? ".42s" : ".3s")} forwards` } })
					)
				)
			);
		}

		const CORNERS = [
			{ d: "M3 7 V3 H7", delay: "0s", dur: "1.5s" },
			{ d: "M17 3 H21 V7", delay: ".12s", dur: "1.6s" },
			{ d: "M21 17 V21 H17", delay: ".25s", dur: "1.45s" },
			{ d: "M7 21 H3 V17", delay: ".38s", dur: "1.55s" }
		];
		function ScreenshotIcon({ state = "running", size = 24 }) {
			const run = state === "running", err = state === "error", done = state === "done";
			const LOOP = spd("3.2s");
			return cx("svg", { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": true, className: "wb-icon", style: { overflow: "visible", animation: err ? `wbShake ${spd(".35s")} ease` : undefined } },
				cx("rect", { x: 7, y: 7, width: 10, height: 10, rx: 1.5, fill: "none", stroke: "currentColor", strokeWidth: 1, opacity: done ? .1 : .15, style: { transition: FADE } }),
				cx("g", { opacity: run ? .35 : done ? .18 : .15, style: { transition: FADE } },
					cx("path", { d: "M8 14.6 L10.8 11.2 L12.6 13.4 L13.8 12 L16 14.6", fill: "none", stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round", strokeLinejoin: "round" }),
					cx("circle", { cx: 10.4, cy: 9.6, r: .8, fill: "currentColor" })
				),
				CORNERS.map((c, i) =>
					cx("path", { key: i, d: c.d, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", style: { transformOrigin: "center", opacity: run ? 1 : .45, transition: FADE, animation: run ? `wbCornerBreathe ${(parseFloat(c.dur) / SPEED).toFixed(2)}s cubic-bezier(.4,0,.2,1) ${parseFloat(c.delay) / SPEED}s infinite` : undefined } })
				),
				run && cx("line", { x1: 7.6, y1: 7.6, x2: 16.4, y2: 7.6, stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round", style: { animation: `wbScanSweep ${LOOP} ease-in-out infinite`, filter: "drop-shadow(0 0 2.5px currentColor)" } }),
				run && cx("rect", { x: 7, y: 7, width: 10, height: 10, rx: 1.5, fill: "currentColor", style: { animation: `wbFlash ${LOOP} ease infinite` } }),
				run && cx("g", { style: { animation: `wbPrint ${LOOP} cubic-bezier(.3,.7,.3,1) infinite` } },
					cx("rect", { x: 9.2, y: 9.8, width: 5.6, height: 4.4, rx: .6, fill: "currentColor", fillOpacity: .16, stroke: "currentColor", strokeWidth: 1.1 }),
					cx("path", { d: "M10.1 13.2 L11.4 11.5 L12.4 12.7 L13 12 L14.5 13.2", fill: "none", stroke: "currentColor", strokeWidth: .7, strokeLinecap: "round", strokeLinejoin: "round", opacity: .9 }),
					cx("circle", { cx: 13.4, cy: 10.9, r: .45, fill: "currentColor", opacity: .9 })
				),
				done && cx("g", { key: "done", style: { animation: `wbPrintOnce ${spd(".5s")} cubic-bezier(.34,1.3,.64,1) both` } },
					cx("rect", { x: 9.2, y: 9.8, width: 5.6, height: 4.4, rx: .6, fill: "currentColor", fillOpacity: .16, stroke: "currentColor", strokeWidth: 1.1 }),
					cx("path", { d: "M10.7 12.1 L11.7 13.1 L13.5 11", fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round", strokeDasharray: 24, strokeDashoffset: 24, style: { animation: `wbDraw ${spd(".3s")} ease ${spd(".5s")} forwards` } })
				),
				err && cx("g", { key: "err" },
					cx("line", { x1: 7.6, y1: 11.6, x2: 16.4, y2: 11.6, stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round", opacity: .2, style: { animation: `wbBlink ${spd(".7s")} ease-in-out infinite` } }),
					[["M10.4 10.4 L13.6 13.6"], ["M13.6 10.4 L10.4 13.6"]].map(([d], i) =>
						cx("path", { key: i, d, fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeDasharray: 12, strokeDashoffset: 12, style: { animation: `wbDraw ${spd(".22s")} ease ${spd(i ? ".18s" : ".08s")} forwards` } })
					)
				)
			);
		}

		function ClickIcon({ state = "running", size = 24 }) {
			const run = state === "running", err = state === "error", done = state === "done";
			const LOOP = spd("2.8s");
			const cursorAnim = run ? `wbCursorJourney ${LOOP} cubic-bezier(.45,.05,.25,1) infinite` : done ? `wbCursorLand ${spd(".55s")} cubic-bezier(.35,.05,.25,1) forwards` : `wbCursorMiss ${spd(".45s")} cubic-bezier(.3,.7,.3,1) forwards`;
			return cx("svg", { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": true, className: "wb-icon", style: { overflow: "visible", animation: err ? `wbShake ${spd(".35s")} ease` : undefined } },
				cx("g", { style: { opacity: err ? .25 : 1, transition: FADE, animation: run ? `wbTargetPulse ${spd("1.6s")} ease-in-out infinite` : undefined } },
					cx("g", { style: { animation: run ? `wbTargetHit ${LOOP} cubic-bezier(.34,1.56,.64,1) infinite` : done ? `wbTargetPress ${spd(".25s")} ease ${spd(".32s")} both` : undefined } },
						cx("circle", { cx: 15.5, cy: 12, r: 3.6, fill: "none", stroke: "currentColor", strokeWidth: 1.2, opacity: .75 }),
						cx("circle", { cx: 15.5, cy: 12, r: 1.2, fill: "currentColor", opacity: done ? 1 : .5, style: { transition: FADE } })
					)
				),
				run && cx("circle", { cx: 15.5, cy: 12, r: 4, fill: "none", stroke: "currentColor", strokeWidth: 1, style: { animation: `wbClickRipple ${LOOP} ease-out infinite` } }),
				cx("path", { d: "M0 0 L0 7 L1.8 5.5 L3 7.8 L4 7.3 L2.8 5 L5.2 5 Z", fill: "currentColor", stroke: "currentColor", strokeWidth: .6, strokeLinejoin: "round", style: { transformBox: "fill-box", transformOrigin: "0 0", animation: cursorAnim } }),
				done && cx("g", { key: "done" },
					[0, 1].map(i =>
						cx("circle", { key: i, cx: 15.5, cy: 12, r: 4.2, fill: "none", stroke: "currentColor", strokeWidth: 1, opacity: 0, style: { animation: `wbImpact ${spd(".55s")} ease-out ${(i * 0.12 / SPEED).toFixed(2)}s forwards` } })
					),
					cx("path", { d: "M13.9 12 L15.1 13.2 L17.4 10.7", fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round", strokeLinejoin: "round", strokeDasharray: 24, strokeDashoffset: 24, style: { animation: `wbDraw ${spd(".26s")} ease ${spd(".5s")} forwards` } })
				),
				err && cx("g", { key: "err" },
					[["M5.9 12.5 L8.1 14.7"], ["M8.1 12.5 L5.9 14.7"]].map(([d], i) =>
						cx("path", { key: i, d, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeDasharray: 12, strokeDashoffset: 12, style: { animation: `wbDraw ${spd(".22s")} ease ${spd(i ? ".28s" : ".4s")} forwards` } })
					)
				)
			);
		}

		function NavigateIcon({ state = "running", size = 24 }) {
			const run = state === "running", err = state === "error", done = state === "done";
			const D = "M6 18 L6 11 Q6 6 11 6 L18 6";
			return cx("svg", { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": true, className: "wb-icon", style: { overflow: "visible", animation: err ? `wbShake ${spd(".35s")} ease` : undefined } },
				cx("path", { d: D, fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeDasharray: "3 5", opacity: run ? .3 : done ? .15 : .2, style: { transition: FADE } }),
				cx("g", { key: "main", style: { opacity: run ? 1 : 0, transition: FADE } },
					cx("path", { d: D, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeDasharray: "4 10", opacity: .3, style: { animation: `wbFlow ${spd("1.6s")} linear infinite` } }),
					cx("path", { d: "M-3 -2.9 L3.4 0 L-3 2.9 L-1.3 0 Z", fill: "currentColor", style: { offsetPath: `path("${D}")`, offsetRotate: "auto", animation: `wbTravel ${spd("2.4s")} cubic-bezier(.45,.05,.55,.95) infinite`, filter: "drop-shadow(0 0 2px currentColor)" } })
				),
				done && cx("g", { key: "done", style: { animation: `wbFadeIn ${spd(".26s")} ease ${spd(".05s")} both` } },
					cx("path", { d: D, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeDasharray: 26, strokeDashoffset: 26, style: { animation: `wbDraw ${spd(".45s")} ease ${spd(".12s")} forwards` } }),
					cx("circle", { cx: 18, cy: 6, r: 1.8, fill: "currentColor", opacity: 0, style: { transformOrigin: "18px 6px", animation: `wbFadeIn ${spd(".15s")} ease ${spd(".45s")} forwards, wbEndpoint ${spd("1.2s")} ease-in-out ${spd(".6s")} infinite` } }),
					cx("circle", { cx: 18, cy: 6, r: 3, fill: "none", stroke: "currentColor", strokeWidth: 1.1, opacity: 0, style: { transformOrigin: "18px 6px", animation: `wbLockRing ${spd(".6s")} ease-out ${spd(".55s")} forwards` } })
				),
				err && cx("g", { key: "err", style: { animation: `wbFadeIn ${spd(".26s")} ease ${spd(".05s")} both` } },
					cx("path", { d: "M6 18 L6 11 Q6 6 11 6 L14 6", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeDasharray: 22, strokeDashoffset: 22, style: { animation: `wbDraw ${spd(".35s")} ease ${spd(".1s")} forwards` } }),
					cx("path", { d: "M14 6 L18 6", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeDasharray: "3 4", style: { animation: `wbBlink ${spd(".7s")} ease-in-out ${spd(".3s")} infinite` } }),
					[["M14.6 4.4 L17.4 7.6"], ["M17.4 4.4 L14.6 7.6"]].map(([d], i) =>
						cx("path", { key: i, d, fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeDasharray: 12, strokeDashoffset: 12, style: { animation: `wbDraw ${spd(".22s")} ease ${spd(i ? ".28s" : ".18s")} forwards` } })
					)
				)
			);
		}

		const RD_N = 4;
		function ReadingIcon({ state = "running", size = 24 }) {
			const gap = Math.max(1.5, size / 10);
			const pad = size / 9;
			const cell = (size - pad * 2 - gap * (RD_N - 1)) / RD_N;
			const [active, setActive] = react.useState(-1);
			const [trail, setTrail] = react.useState(-1);
			const ref = react.useRef({ active: -1, trail: -1 });
			react.useEffect(() => {
				const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
				if (state !== "running" || reduced) { setActive(-1); setTrail(-1); ref.current = { active: -1, trail: -1 }; return; }
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
				const onRow = state === "running" && active >= 0 && r === Math.floor(active / RD_N);
				const isActive = i === active, isTrail = i === trail;
				cells.push(cx("div", { key: i, style: {
					width: cell, height: cell,
					borderRadius: Math.max(1, cell * 0.2),
					background: "currentColor",
					transform: isActive ? "scale(1.35)" : isTrail ? "scale(1.06)" : "scale(1)",
					opacity: state === "done" ? .8 : state === "error" ? .35 : isActive ? 1 : isTrail ? .55 : onRow ? .32 : .16,
					boxShadow: isActive ? "0 0 4px currentColor" : "none",
					transition: "opacity .28s ease-out, transform .28s ease-out, box-shadow .28s ease-out"
				} }));
			}
			return cx("div", { className: "wb-icon", style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, animation: state === "error" ? `wbShake ${spd(".35s")} ease` : undefined } },
				cx("div", { style: { display: "grid", gridTemplateColumns: `repeat(${RD_N},${cell}px)`, gridTemplateRows: `repeat(${RD_N},${cell}px)`, gap } }, cells)
			);
		}

		function DoneIcon({ state = "done", size = 24 }) {
			return cx("svg", { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": true, className: "wb-icon", style: { animation: state === "done" ? `wbDoneBounce ${spd(".4s")} ease ${spd(".6s")} both` : undefined, transformOrigin: "center" } },
				cx("circle", { cx: 12, cy: 12, r: 9, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeDasharray: 57, strokeDashoffset: state === "done" ? 0 : 57, style: { animation: state === "done" ? `wbCircleIn ${spd(".4s")} ease forwards` : undefined } }),
				cx("path", { d: "M8 12.5 L11 15.5 L16 9.5", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", strokeDasharray: 24, strokeDashoffset: state === "done" ? 0 : 24, style: { animation: state === "done" ? `wbCheckIn ${spd(".3s")} ease ${spd(".35s")} forwards` : undefined } })
			);
		}

		function ErrorIcon({ state = "error", size = 24 }) {
			return cx("svg", { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": true, className: "wb-icon", style: { animation: state === "error" ? `wbShake ${spd(".35s")} ease` : undefined } },
				cx("circle", { cx: 12, cy: 12, r: 9, fill: "none", stroke: "currentColor", strokeWidth: 1.5, opacity: .5 }),
				cx("path", { d: "M8.5 8.5 L15.5 15.5", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeDasharray: 20, strokeDashoffset: state === "error" ? 0 : 20, style: { animation: state === "error" ? `wbDraw ${spd(".3s")} ease ${spd(".1s")} forwards` : undefined } }),
				cx("path", { d: "M15.5 8.5 L8.5 15.5", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeDasharray: 20, strokeDashoffset: state === "error" ? 0 : 20, style: { animation: state === "error" ? `wbDraw ${spd(".3s")} ease ${spd(".25s")} forwards` : undefined } })
			);
		}

		// ═══════════════════════════════════════════════════════
		// Phase → Icon mapping
		// ═══════════════════════════════════════════════════════
		const PHASES = [
			{ id: "search",   label: "搜索",   Icon: SearchIcon },
			{ id: "fetch",    label: "抓取",   Icon: ScreenshotIcon },
			{ id: "snapshot", label: "快照",   Icon: ScreenshotIcon },
			{ id: "click",    label: "点击",   Icon: ClickIcon },
			{ id: "read",     label: "阅读",   Icon: ReadingIcon },
			{ id: "navigate", label: "导航",   Icon: NavigateIcon },
		];

		// ═══════════════════════════════════════════════════════
		// SSE Store — live phase state driving the inline row icons
		// ═══════════════════════════════════════════════════════
		const MAX_EVENTS = 200;
		const PHASE_STATE = {};   // phase → 'running'|'done'|'error'
		const PHASE_COUNT = {};  // phase → number of tool:start hits
		let allEvents = [];
		let es = null;
		let connected = false;

		// Runtime observability — expose internals for diagnosis.
		const debug = (window.__SF_DEBUG__ = { msgCount: 0, connCount: 0, lastMsg: null, lastErr: null, esState: -1 });
		function syncDebug() { debug.phases = PHASE_STATE; debug.esState = es ? es.readyState : -1; }
		setInterval(syncDebug, 1000);

		function selfHealRev() {
			// Periodically compare the bundle rev in the boot manifest against
			// the one on record — reload once per change so server-side rebuilds
			// reach long-lived tabs. The baseline is recorded on first check:
			// comparing against an unset __SF_REV__ would reload every tick.
			setInterval(async () => {
				try {
					const res = await fetch("/", { cache: "no-store", headers: { "Accept": "text/html" } });
					const html = await res.text();
					const m = html.match(/dsh-searchflow\/client\.js\?rev=([^"&\s]+)/);
					if (!m) return;
					if (window.__SF_REV__ && m[1] !== window.__SF_REV__) location.reload();
					window.__SF_REV__ = m[1];
				} catch {}
			}, 120_000);
		}

		// 桌面端（Electron app:// 载体）没有 HTTP 端口，EventSource(SSE) 不可用 →
		// 走 /searchflow/poll unary 轮询（增量 since=id，首次 since=0 重放历史，语义同 SSE）。
		const IS_DESKTOP = location.protocol !== "http:" && location.protocol !== "https:";
		let pollSince = 0, pollTimer = null, pollBusy = false;

		function consumeEvent(raw) {
			try {
				const evt = typeof raw === "string" ? JSON.parse(raw) : raw;
				debug.msgCount++;
				debug.lastMsg = evt.type + ":" + (evt.data && evt.data.phase);
				allEvents.push(evt);
				if (allEvents.length > MAX_EVENTS) allEvents.shift();
				processEvent(evt);
				applyInlineIcons();
			} catch (err) { debug.lastErr = String(err && err.message || err); }
		}

		function pollOnce() {
			if (pollBusy) return;
			pollBusy = true;
			fetch("/searchflow/poll?since=" + pollSince, { cache: "no-store" })
				.then((r) => (r.ok ? r.json() : null))
				.then((j) => {
					if (j && Array.isArray(j.events)) {
						for (const evt of j.events) {
							pollSince = Math.max(pollSince, Number(String(evt.id).slice(3)) || 0);
							consumeEvent(evt);
						}
					}
					if (!connected) { connected = true; announce("搜索流程连接已建立"); }
				})
				.catch(() => { connected = false; })
				.finally(() => { pollBusy = false; });
		}

		function connectSSE() {
			if (IS_DESKTOP) {
				if (!pollTimer) { pollTimer = setInterval(pollOnce, 1200); pollOnce(); }
				return;
			}
			if (es) return;
			try {
				debug.connCount++;
				es = new EventSource("/searchflow/events");
				es.onmessage = (e) => consumeEvent(e.data);
				es.onerror = () => { connected = false; es = null; setTimeout(connectSSE, 3000); };
				es.onopen = () => { connected = true; announce("搜索流程连接已建立"); };
			} catch { setTimeout(connectSSE, 3000); }
		}

		function processEvent(evt) {
			sfHandleTaskEvent(evt);
			const { type, data } = evt;
			const phase = data.phase;
			if (!phase) return;
			if (type === "tool:start") {
				PHASE_STATE[phase] = "running";
				PHASE_COUNT[phase] = (PHASE_COUNT[phase] || 0) + 1;
				announce(`${data.summary || phase} 开始`);
			} else if (type === "tool:completed") {
				PHASE_STATE[phase] = "done";
				announce(`${data.summary || phase} 完成`);
			} else if (type === "tool:error") {
				PHASE_STATE[phase] = "error";
				announce(`${data.summary || phase} 出错: ${data.error || "未知错误"}`);
			}
		}

		function getPhaseState(phase) { return PHASE_STATE[phase] ?? "idle"; }

		/**
		 * 状态播报：写进 apply() 挂的那块 aria-live 区域。
		 *
		 * 必须是模块级函数：`processEvent` / `connectSSE` / `pollOnce` 都在模块
		 * 作用域里调用它，而它原先声明在 apply() 内部——每次事件都抛
		 * ReferenceError，被 `consumeEvent` 的 try/catch 吞掉，连带同一段后面的
		 * `applyInlineIcons()` 一起不执行。区域还没挂（或已卸载）时静默跳过。
		 */
		function announce(message) {
			try {
				const region = document.getElementById("sf-live-region");
				if (region) region.textContent = message;
			} catch { /* 没有 document：安静跳过 */ }
		}

		// Clear all flow state on a real session switch (flow A → flow B):
		// rows of the new session must start clean and stock.
		function resetFlow() {
			for (const k of Object.keys(PHASE_STATE)) delete PHASE_STATE[k];
			for (const k of Object.keys(PHASE_COUNT)) delete PHASE_COUNT[k];
			allEvents.length = 0;
			// 换会话时把当前这轮**归档**再放手，而不是直接丢掉：它是一次已经发生
			// 过的检索，不该因为切了个会话就消失。sfHistory 本身跨会话保留——宿主
			// 事件流不区分会话，记录也就是全局的（见 README「已知边界」）。
			sfArchiveTask(sfTask);
			sfTask = null;
			// 必须通知：归档后当前任务已经没了，不重绘的话面板会停在上一次的样子
			// （页签里那条 400ms 的续跑定时器要求 sfTask 存在，它也不会再刷新）。
			sfNotify();
		}


		// ═══════════════════════════════════════════════════════
		// Icon Farm — LAZY icon cache: renders phase×state icons on first use,
		// caches the DOM nodes, and clones from cache for inline rows.
		// Avoids pre-rendering all 21 icons (7 phases × 3 states) upfront.
		// ═══════════════════════════════════════════════════════

		// ── Icon farm: all phase×state icons are pre-rendered ONCE into an
		// offscreen container at mount; row enhancement clones from it.
		// (createRoot().render() commits asynchronously — a per-icon
		// render-then-clone can never work: the DOM isn't there yet.)
		let farmHost = null;
		function IconFarm() {
			return cx("div", null,
				PHASES.map(p =>
					["running", "done", "error"].map(st =>
						cx("span", {
							key: p.id + ":" + st,
							"data-sf-icon": p.id + ":" + st,
							style: { display: "inline-flex" },
						},
							cx(p.Icon, { state: st, size: 16 })
						)
					)
				)
			);
		}
		function mountIconFarm() {
			if (farmHost && farmHost.isConnected) return;
			farmHost = document.createElement("div");
			farmHost.id = "sf-iconfarm";
			farmHost.setAttribute("aria-hidden", "true");
			farmHost.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none;opacity:0;";
			document.body.appendChild(farmHost);
			react_dom.render(cx(IconFarm), farmHost);
		}
		function iconFromFarm(phase, state) {
			if (!farmHost || !farmHost.isConnected) return null;
			const src = farmHost.querySelector('[data-sf-icon="' + phase + ":" + state + '"]');
			const kid = src && src.firstElementChild;
			if (!kid) return null;
			// data-sf-state marks the clone as OURS: the CSS suppression rule
			// (:not([data-sf-state])) and the state-change diff both key on it.
			const clone = kid.cloneNode(true);
			clone.setAttribute("data-sf-state", phase + ":" + state);
			return clone;
		}

		// ═══════════════════════════════════════════════════════
		// Plugin Registration — icon farm + inline row enhancement.
		// The dynamic phase icons live INSIDE the tool-call rows: no
		// host injection, no summary lane below the conversation.
		// ═══════════════════════════════════════════════════════
		const name = "dsh-searchflow-client";
		const inject = [];
		const FLOW_SEL = "[data-chat-flow]";

		// ── Inline row enhancement: replace the generic tool-call row icon
		// with the animated phase icon, live. ──
		// Tool name → phase. Longer names FIRST — matching is substring
		// based (web_search_stats must precede web_search, web_search_pro
		// must precede web_search). Mirrors the server TOOL_PHASE map so a
		// row always looks up the phase the server actually emits.
		const INLINE_TOOL_PHASE = [
			["web_search_pro", "search"],
			["web_search_stats", "read"],
			["web_platform_search", "search"],
			["github_issue_list", "search"],
			["web_search", "search"],
			["web_fetch_pro", "fetch"],
			["web_exa_contents", "fetch"],
			["web_fetch", "fetch"],
			["web_snapshot", "snapshot"],
			["browser_screenshot", "snapshot"],
			["browser_automation_search", "search"],
			["browser_automation_develop", "read"],
			["browser_automation_run", "click"],
			["browser_opencli_catalog", "read"],
			["browser_opencli_run", "read"],
			["browser_opencli_status", "read"],
			["browser_recipe_run", "click"],
			["browser_script_catalog", "read"],
			["browser_script_run_builtin", "read"],
			["browser_userscript_run", "read"],
			["github_issue_read", "read"],
			["browser_set_files", "click"],
			["browser_evaluate", "read"],
			["browser_hover", "click"],
			["browser_crawl", "fetch"],
			["browser_status", "read"],
			["browser_click", "click"],
			["browser_scroll", "click"],
			["browser_type", "click"],
			["browser_open", "click"],
			["browser_read", "read"],
			["web_rule", "read"],
			["web_history", "read"],
			["web_backend_status", "read"],
			["web_cache_clear", "read"],
			["web_deps", "read"],
			// 知识库（dsh-learn-wiki）+ MCP（dsh-mcp-lens）工具。它们给**行内图标**带阶段，
			// 但「开一轮搜索流程」由 sfHandleTaskEvent 里的 SEARCH_TOOLS 身份守卫 ——
			// wiki_recall / mcp_search 永远不会误开或误计一次 Web 搜索。
			["wiki_recall", "search"],
			["wiki_acquire", "fetch"],
			["wiki_harvest", "read"],
			["wiki_learn", "read"],
			["wiki_commit", "read"],
			["wiki_review", "read"],
			["wiki_lint", "read"],
			["wiki_merge", "read"],
			["wiki_sessions", "read"],
			["wiki_struggle", "read"],
			["mcp_search", "search"],
			["mcp_call", "read"],
		];

		// State → accent color: the dynamic icon must POP against the gray
		// row, so running glows blue, done settles green, error burns red.
		const INLINE_COLORS = {
			running: "#60a5fa",
			done: "#4ade80",
			error: "#f87171",
		};

		// Exact tool-name → phase lookup from the row's data-tool attribute
		// (stable, set by the host app on every ToolRow). Falls back to the
		// legacy substring scan for unknown/variant names.
		const TOOL_PHASE_MAP = new Map(INLINE_TOOL_PHASE);
		function phaseOfRow(row) {
			const t = row.getAttribute("data-tool");
			if (t) { const p = TOOL_PHASE_MAP.get(t); if (p) return p; }
			const text = row.textContent || "";
			for (const [tool, ph] of INLINE_TOOL_PHASE) {
				if (text.indexOf(tool) !== -1) { return ph; }
			}
			return null;
		}

		// Text tuning: dim the "Tool call" prefix, tint the summary to the
		// row state (error keeps the host's own red). All idempotent writes.
		function styleRowText(row, st) {
			const title = row.querySelector('[class$="_title"]');
			if (title && title.style.opacity !== "0.5") title.style.opacity = "0.5";
			const summary = row.querySelector('[class$="_summary"]');
			if (summary) {
				const want = st === "running" ? "rgb(147, 197, 253)" : st === "done" ? "rgb(209, 213, 219)" : "";
				if (summary.style.color !== want) summary.style.color = want;
			}
		}
		function restoreRowText(row) {
			const title = row.querySelector('[class$="_title"]');
			if (title && title.style.opacity !== "") title.style.opacity = "";
			const summary = row.querySelector('[class$="_summary"]');
			if (summary && summary.style.color !== "") summary.style.color = "";
		}

		function applyInlineIcons() {
			const rows = document.querySelectorAll("[data-tool]");
			for (const row of rows) {
				const phase = phaseOfRow(row);
				if (!phase) continue;
				// Row-level truth first: the host app maintains data-state on
				// every ToolRow (ok / error / running). A failed row must show
				// the red error icon even when the phase later succeeded, so
				// PHASE_STATE is only a fallback for rows without data-state.
				const rowState = row.getAttribute("data-state");
				let st;
				if (rowState === "error") st = "error";
				else if (rowState === "ok" || rowState === "done") st = "done";
				else if (rowState === "running" || rowState === "ongoing" || rowState === "pending") st = "running";
				else st = PHASE_STATE[phase] || "idle";
				if (st === "idle") {
					// Flow state gone (session switch) — restore stock row.
					if (row.hasAttribute("data-sf-row")) {
						row.removeAttribute("data-sf-row");
						row.style.background = "";
						row.style.boxShadow = "";
						row.style.overflow = "";
						restoreRowText(row);
						const ov = row.querySelector("[data-sf-inline]");
						if (ov) {
							const h = ov._sfHiddenHost || ov.parentElement;
							// Restore whatever we hid: the host (icon holder or
							// StateDot dot) and the stock svg inside it.
							if (h) h.style.visibility = "";
							const s = h && h.querySelector("svg:not([data-sf-state])");
							if (s) s.style.visibility = "";
							ov.remove();
						}
						// Put the host row box back to overflow:hidden (sweep
						// animation) now that our overlay is gone.
						const lb = row.querySelector('[class*="_leading_"]');
						if (lb && lb.parentElement) lb.parentElement.style.overflow = "";
					}
					continue;
				}
				// Locate the STOCK icon precisely: only a leading-slot svg that
				// is NOT ours (:not([data-sf-state])) and NOT the chevron (it
				// also lives inside _leading_ and would otherwise win on rows
				// whose stock icon is a StateDot span — error rows).
				const leading = row.querySelector('[class*="_leading_"]');
				if (!leading) continue;
				// Hide whatever stock leading icon exists — a stock svg (also
				// covered by the CSS suppression rule) or a StateDot span (only
				// this inline hide removes it). Keep a reference so the restore
				// paths can put the host icon back.
				let hiddenHost = null;
				const stockSvg = leading.querySelector('svg:not([data-sf-state]):not([class*="chevron"])');
				if (stockSvg) {
					hiddenHost = stockSvg.parentElement;
					if (stockSvg.style.visibility !== "hidden") stockSvg.style.visibility = "hidden";
				} else {
					// No stock svg (e.g. error rows show a StateDot span) —
					// hide that stock dot instead.
					const dot = leading.firstElementChild;
					if (!dot) continue;
					hiddenHost = dot;
					if (dot.getAttribute("data-sf-inline") === null && dot.style.visibility !== "hidden") dot.style.visibility = "hidden";
				}
				// Un-clip the clipping chain. The ACTUAL clipper is the row box
				// that owns the leading slot (host CSS overflow:hidden on the
				// row div) — the [data-tool] wrapper is upstream of it. A 22px
				// icon centered on the 14px stock holder poked 3px past the
				// slot's left edge and was sheared there; the 16px icon now
				// fits the 16px slot exactly, and we also clear overflow on the
				// row box so the glow/halo never shear either.
				if (row.style.overflow !== "visible") row.style.overflow = "visible";
				const rowBox = leading.parentElement;
				if (rowBox && getComputedStyle(rowBox).overflow !== "visible" && rowBox.style.overflow !== "visible") rowBox.style.overflow = "visible";
				if (getComputedStyle(leading).position === "static" && leading.style.position !== "relative") leading.style.position = "relative";
				// Anchor the overlay to the leading slot itself (16×16) instead
				// of the 14px stock holder, and center a 16px icon in it: the
				// icon fits the slot exactly, so nothing overhangs to clip.
				let overlay = leading.querySelector("[data-sf-inline]");
				if (!overlay) {
					overlay = document.createElement("span");
					overlay.setAttribute("data-sf-inline", "1");
					// visibility:visible — a hidden stock host (StateDot row)
					// would otherwise cascade and hide our icon too.
					overlay.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;visibility:visible;";
					overlay._sfHiddenHost = hiddenHost;
					leading.appendChild(overlay);
				} else {
					overlay._sfHiddenHost = hiddenHost;
				}
				if (!row.hasAttribute("data-sf-row")) row.setAttribute("data-sf-row", phase);
				// Live emphasis: tint the row and pin a blue accent bar to its
				// left edge while the phase runs.
				if (st === "running") {
					if (!row.hasAttribute("data-sf-run")) {
						row.setAttribute("data-sf-run", "1");
						row.style.background = "rgba(59,130,246,.14)";
						row.style.borderRadius = "6px";
						row.style.boxShadow = "inset 2.5px 0 0 0 #60a5fa";
					}
				} else if (row.hasAttribute("data-sf-run")) {
					row.removeAttribute("data-sf-run");
					row.style.background = "";
					row.style.boxShadow = "";
				}
				// Skip repaint when the phase:state didn't change — preserves
				// running CSS animation progress across observer sweeps.
				const cur = overlay.querySelector("[data-sf-state]");
				const wantKey = phase + ":" + st;
				if (cur && cur.getAttribute("data-sf-state") === wantKey) continue;
				// Clone BEFORE removing the old node: if the farm ever fails
				// we keep the previous icon instead of leaving a blank slot.
				const node = iconFromFarm(phase, st);
				if (!node) continue;
				if (cur) cur.remove();
				const oldHalo = overlay.querySelector("[data-sf-halo]");
				if (oldHalo) oldHalo.remove();
				node.style.color = INLINE_COLORS[st] || "";
				// Glow scale: running burns brightest (double shadow), error
				// stays hot, done gets a soft green aura so settled rows still
				// read at a glance.
				if (st === "running") node.style.filter = "drop-shadow(0 0 3px rgba(96,165,250,.9)) drop-shadow(0 0 7px rgba(96,165,250,.45))";
				else if (st === "error") node.style.filter = "drop-shadow(0 0 3px rgba(248,113,113,.85)) drop-shadow(0 0 6px rgba(248,113,113,.4))";
				else node.style.filter = "drop-shadow(0 0 2.5px rgba(74,222,128,.45))";
				// Pulsing halo: 24px ring sits a clear 4px outside the 16px
				// icon so the stroke never overlaps the icon artwork; faint
				// enough to read as ambient, not as a mask.
				if (st === "running") {
					const halo = document.createElement("span");
					halo.setAttribute("data-sf-halo", "1");
					halo.style.cssText = "position:absolute;left:50%;top:50%;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;border:1.5px solid rgba(96,165,250,.35);animation:sfPulseRing 1.5s ease-out infinite;pointer-events:none;";
					overlay.appendChild(halo);
				}
				overlay.appendChild(node);
				// Dim "Tool call" prefix, tint summary to match the state.
				styleRowText(row, st);
			}
		}

		/** Strip every inline overlay and restore the stock icons. */
		function clearInlineIcons() {
			document.querySelectorAll("[data-sf-row]").forEach(row => {
				row.removeAttribute("data-sf-row");
				row.removeAttribute("data-sf-run");
				row.style.background = "";
				row.style.boxShadow = "";
				row.style.overflow = "";
				const lb = row.querySelector('[class*="_leading_"]');
				if (lb && lb.parentElement) lb.parentElement.style.overflow = "";
				restoreRowText(row);
			});
			document.querySelectorAll("[data-sf-inline]").forEach(el => {
				const holder = el._sfHiddenHost || el.parentElement;
				el.remove();
				if (holder) {
					// Restore host visibility (StateDot case) and stock svg.
					holder.style.visibility = "";
					const svg = holder.querySelector("svg:not([data-sf-state])");
					if (svg) svg.style.visibility = "";
				}
			});
		}


		// ═══════════════════════════════════════════════════════
		// SearchFlow Card — task-level 观感 (Wave 1)
		// Phase progress bar (搜索中→阅读中→撰写中) + progressive
		// result stream + completion summary line. Pure observe-layer:
		// consumes the same tool:start/completed/error events. No engine
		// attribution — users care about the process and the outcome.
		// ═══════════════════════════════════════════════════════

		const TASK_IDLE_MS = 30000;     // gap > this closes the current task
		const WRITE_IDLE_MS = 3500;     // gap > this → 撰写中 (model composing)
		const CARD_COLLAPSE_MS = 9000;  // auto-collapse after summary shows
		const CARD_MAX_RESULTS = 12;
		// 保留上限 > 卡片显示上限：页签是全高视图，值得看到比浮动卡片更多的历史；
		// 浮动卡片渲染时仍然只取最后 CARD_MAX_RESULTS 条。
		const TAB_MAX_RESULTS = 60;
		// 侧栏"检索记录"：已结束的检索**悬挂**保留多少条，以及展开单条时最多列几条结果。
		const SF_HISTORY_MAX = 20;
		const SF_HISTORY_RESULTS = 30;
	// 只有这几个「真搜索」工具能**开一轮**新的检索（README「什么算作一次搜索」）。
	// 判据是工具身份而不是 phase 字符串：wiki_recall / mcp_search 虽是 'search' 阶段
	// （行内图标用），但绝不能开任务或计为一次搜索。
	const SEARCH_TOOLS = new Set(["web_search", "web_search_pro", "web_platform_search", "github_issue_list"]);

		let sfCardRoot = null;
		let sfCardMount = null;
		const sfListeners = new Set();
		let sfTask = null;
		/** 已结束的检索记录，最新在前。新搜索开始时旧的**下移到这里**，不就地替换。 */
		let sfHistory = [];
		/** 历史记录里被展开的那些 id。模块级 + sfNotify 重渲染，与文件里其它状态同风格。 */
		let sfOpenHistory = new Set();
		let sfWriteTimer = null;
		let sfCollapseTimer = null;

		function sfHostname(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return String(u || ""); } }

		function sfNotify() {
			if (window.__SF_DEBUG__) { window.__SF_DEBUG__.task = sfTask; window.__SF_DEBUG__.history = sfHistory; }
			for (const fn of sfListeners) { try { fn(); } catch {} }
		}
		function sfSubscribe(fn) { sfListeners.add(fn); return () => { sfListeners.delete(fn); }; }

		// Deep mode toggle (query expansion + cross-language)
		let sfDeepMode = false;
		async function sfToggleDeep() {
			sfDeepMode = !sfDeepMode;
			sfNotify();
			try {
				const res = await fetch('/searchflow/deep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: sfDeepMode }) });
				const data = await res.json();
				if (typeof data.enabled === 'boolean') sfDeepMode = data.enabled;
			} catch {}
			sfNotify();
		}

		/** 展开/收起一条检索记录。 */
		function sfToggleHistory(id) {
			const next = new Set(sfOpenHistory);
			if (next.has(id)) next.delete(id); else next.add(id);
			sfOpenHistory = next;
			sfNotify();
		}

		function newTask() {
			return {
				id: Date.now(),
				phase: "search",
				startedAt: Date.now(),
				lastEventAt: Date.now(),
				searchCount: 0,
				reads: 0,
				results: [],
				domains: new Set(),
				validatedDomains: new Set(),
				seenUrls: new Map(),
				charCount: 0,
				cacheHits: 0,
				errors: 0,
				lastDurationMs: 0,
				lastResultCount: 0,
				collapsed: false,
				/** 这次任务里出现过的查询词（tool:start 的 summary），归档后就是记录的标题。 */
				queries: [],
				/** 本轮知识库召回（wiki_recall 判定）：次数 + 最差判定（miss > weak > hit）。 */
				wikiRecallCount: 0,
				wikiVerdict: null,
			};
		}

		/**
		 * 把一次已经结束的检索归档进侧栏的「检索记录」。
		 *
		 * 这是"悬挂"的关键：新的搜索开始时，上一次的记录**下移成一条历史**，
		 * 而不是被就地覆盖。侧栏空间够，能翻回去看比只看得见最后一次有用。
		 * 空任务（既没搜索也没结果）不占位置。
		 */
		function sfArchiveTask(t) {
			if (!t) return;
			if (t.searchCount === 0 && t.results.length === 0) return;
			if (sfHistory.length > 0 && sfHistory[0].id === t.id) return;
			t.doneAt = t.doneAt || t.lastEventAt || Date.now();
			sfHistory.unshift(t);
			if (sfHistory.length > SF_HISTORY_MAX) {
				sfHistory.length = SF_HISTORY_MAX;
				// 被挤出去的那条不该把展开状态留在集合里。
				if (sfOpenHistory.size > 0) {
					const alive = new Set(sfHistory.map((h) => h.id));
					sfOpenHistory = new Set([...sfOpenHistory].filter((id) => alive.has(id)));
				}
			}
		}

		function sfArmWriteTimer() {
			if (sfWriteTimer) clearTimeout(sfWriteTimer);
			sfWriteTimer = setTimeout(() => {
				sfWriteTimer = null;
				if (!sfTask) return;
				sfTask.doneAt = Date.now();
				sfTask.phase = "writing";
				sfNotify();
				if (sfCollapseTimer) clearTimeout(sfCollapseTimer);
				sfCollapseTimer = setTimeout(() => {
					sfCollapseTimer = null;
					if (sfTask && sfTask.phase === "writing") { sfTask.collapsed = true; sfNotify(); }
				}, CARD_COLLAPSE_MS);
			}, WRITE_IDLE_MS);
		}

		/**
		 * 推进当前检索任务。返回 false 表示这次事件**不该**产生/延续任务。
		 *
		 * `isSearch` 决定"能不能开一个新任务"：只有真正的搜索工具才算一轮检索的
		 * 开始。fetch / snapshot / click / read 这些只是**顺带推进**一个已经在跑的
		 * 检索——否则 agent 单纯打开一个网页，面板就会冒出来显示「0 次搜索」。
		 */
		function sfTouchTask(phase, isSearch) {
			const now = Date.now();
			const stale = sfTask !== null && now - sfTask.lastEventAt > TASK_IDLE_MS;
			if (sfTask === null || stale) {
				if (!isSearch) return false;   // 没有正在进行的检索：非搜索事件不开新任务
				sfArchiveTask(sfTask);         // 上一轮下移成历史记录，不被覆盖
				sfTask = newTask();
			}
			sfTask.lastEventAt = now;
			sfTask.phase = phase;
			sfTask.collapsed = false;
			if (sfWriteTimer) { clearTimeout(sfWriteTimer); sfWriteTimer = null; }
			if (sfCollapseTimer) { clearTimeout(sfCollapseTimer); sfCollapseTimer = null; }
			sfArmWriteTimer();
			sfNotify();
			return true;   // 这一步推进了任务，调用方可以继续更新它
		}

		function sfHandleTaskEvent(evt) {
			const data = evt && evt.data;
			if (!data || !data.phase) return;
			const type = evt.type;
			const phase = data.phase;
			// 开任务判据 = 工具身份（SEARCH_TOOLS），不是 phase：wiki_recall / mcp_search
		// 虽是 'search' 阶段（行内图标），但不算一轮 Web 检索、也不推进搜索计数。
		const isSearch = SEARCH_TOOLS.has(data.tool);
			const isReading = phase === "fetch" || phase === "snapshot" || phase === "click" || phase === "read" || phase === "navigate";
			if (type === "tool:start") {
				if (!sfTouchTask(isSearch ? "search" : "reading", isSearch)) return;
				if (!isSearch) sfTask.reads++;
				// 记下查询词：归档后的记录要能一眼认出"那次搜的是什么"。
				else if (data.summary && sfTask.queries.indexOf(data.summary) === -1) sfTask.queries.push(data.summary);
				return;
			}
			if (type === "tool:completed") {
				if (!sfTouchTask(isSearch ? "search" : "reading", isSearch)) return;
				if (data.fromCache) sfTask.cacheHits++;
				// 计数按**工具身份**，不是"有没有带回遥测"：一次真的搜索哪怕 0 结果
				// （宿主没有 sources 可发）也是「1 次搜索」，不该显示成 0。
				if (isSearch) {
					sfTask.searchCount++;
					sfTask.lastDurationMs = data.durationMs || 0;
					sfTask.lastResultCount = data.resultCount || 0;
					sfTask.charCount += data.charCount || 0;
				}
				// wiki_recall CRAG 判定 → 小结 chip（补料闭环透明度：miss = 知识库没答上，
				// 这轮才去搜的外网）。只记最差判定（hit < weak < miss）。
				if (data.wikiVerdict) {
					sfTask.wikiRecallCount++;
					const rank = { hit: 0, weak: 1, miss: 2 };
					if (rank[data.wikiVerdict] > (rank[sfTask.wikiVerdict] ?? -1)) sfTask.wikiVerdict = data.wikiVerdict;
				}
				if (isSearch && Array.isArray(data.sourcesTop)) {
					for (const s of data.sourcesTop) {
						if (!s || !s.url) continue;
						const host = sfHostname(s.url);
						sfTask.results.push({ url: s.url, title: s.title || host, snippet: s.snippet || "", domain: host });
						sfTask.domains.add(host);
						const cnt = (sfTask.seenUrls.get(s.url) || 0) + 1;
						sfTask.seenUrls.set(s.url, cnt);
						if (cnt >= 2) sfTask.validatedDomains.add(host);
					}
					if (sfTask.results.length > TAB_MAX_RESULTS * 2) sfTask.results = sfTask.results.slice(-TAB_MAX_RESULTS);
				}
				sfNotify();
				return;
			}
			if (type === "tool:error") {
				if (!sfTouchTask(isSearch ? "search" : "reading", isSearch)) return;
				sfTask.errors++;
			}
		}

		/** 一次检索的统计摘要。收任务参数而不是读全局——历史记录也要算同一份。 */
		function sfSummaryOf(t) {
			if (!t) return null;
			const totalMs = Date.now() - t.startedAt;
			const unique = t.domains.size;
			let duplicates = 0;
			for (const c of t.seenUrls.values()) duplicates += Math.max(0, c - 1);
			const tokens = Math.round(t.charCount / 3.5);
			let conf = null;
			if (t.searchCount >= 2 && unique > 0) {
				const ratio = t.validatedDomains.size / unique;
				conf = ratio >= 0.35 ? "高" : ratio >= 0.15 ? "中" : "低";
			}
			return { totalMs, finalMs: t.doneAt ? t.doneAt - t.startedAt : null, unique, duplicates, tokens, conf, searchCount: t.searchCount, cacheHits: t.cacheHits, errors: t.errors, shown: t.results.length };
		}

		const SF_TXT1 = "#f4f4f5", SF_TXT2 = "#b6b6be", SF_TXT3 = "#8b8b93";
		const SF_ACC = { search: "#5b9bff", reading: "#a78bfa", writing: "#34d399" };
		const SF_DONE = "#34d399";

		// ── Card-only icons ──
		function WritingIcon({ state = "running", size = 16 }) {
			const run = state === "running", done = state === "done";
			return cx("svg", { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": true, style: { overflow: "visible" } },
				cx("path", { d: "M4.5 19.5 L5.4 16.2 L15.9 5.7 a1.7 1.7 0 0 1 2.4 0 l.1.1 a1.7 1.7 0 0 1 0 2.4 L8 18.7 Z", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round", opacity: .92 }),
				cx("path", { d: "M14.4 7.2 L16.8 9.6", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", opacity: .5 }),
				run && cx("line", { x1: 10.5, y1: 11.5, x2: 15.2, y2: 11.5, stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", opacity: .9, style: { animation: reducedMotion ? undefined : "sfBlink 1.05s steps(1) infinite" } }),
				done && cx("path", { key: "done", d: "M9.3 12 L11 13.7 L14.9 9.4", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round", strokeDasharray: 24, strokeDashoffset: 24, style: { animation: "wbDraw " + spd(".3s") + " ease forwards" } })
			);
		}
		function SfGlyph({ d, size = 10, color }) {
			return cx("svg", { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": true, style: { color, flexShrink: 0 } },
				cx("path", { d, fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" }));
		}
		const GL_CLOCK = "M12 21 a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 7.5 V12 l3 2";
		const GL_LAYERS = "M12 3 3.5 8 12 13 20.5 8 Z M3.5 12 12 17 20.5 12 M3.5 16 12 21 20.5 16";
		const GL_DUP = "M8 8 h9 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 H8 a2 2 0 0 1 -2 -2 v-9 a2 2 0 0 1 2 -2 Z M15 8 V6 a2 2 0 0 0 -2 -2 H6 a2 2 0 0 0 -2 2 v7 a2 2 0 0 0 2 2 h2";
		const GL_SHIELD = "M12 3.2 20 6.5 V12 c0 4.6-3.4 7.6-8 8.8-4.6-1.2-8-4.2-8-8.8 V6.5 Z M8.8 12 l2.2 2.2 4.4-4.6";
		const GL_SPARK = "M12 3 14.6 9.4 21 12 14.6 14.6 12 21 9.4 14.6 3 12 9.4 9.4 Z";
	const GL_BOOK = "M4 5.2a7.5 2.4 0 0 1 8 .3 7.5 2.4 0 0 1 8-.3v12.4a7.5 2.4 0 0 0-8 .3 7.5 2.4 0 0 0-8-.3Z M12 5.5v12.4";

		function sfHashHue(s) {
			let h = 0;
			for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
			return h % 360;
		}

		const SF_SEGS = [
			{ id: "search", label: "搜索中", Icon: SearchIcon, color: SF_ACC.search, done: SF_DONE },
			{ id: "reading", label: "阅读中", Icon: ReadingIcon, color: SF_ACC.reading, done: SF_DONE },
			{ id: "writing", label: "撰写中", Icon: WritingIcon, color: SF_ACC.writing, done: SF_DONE },
		];

		function sfFmtMs(ms) { return (ms / 1000).toFixed(1) + "s"; }
		function sfFmtTokens(n) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n); }

		function SfChip({ icon, label, title, tone }) {
			return cx("span", { title, style: { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 999, background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.07)", fontSize: 10, color: SF_TXT2, fontVariantNumeric: "tabular-nums" } },
				cx(SfGlyph, { d: icon, size: 10, color: tone || SF_TXT3 }),
				cx("span", { style: { color: tone || SF_TXT1, fontWeight: 600 } }, label)
			);
		}

		/** 时间戳 → HH:MM（记录上"什么时候搜的"）。 */
		function sfClock(ts) {
			try {
				const d = new Date(ts);
				return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
			} catch { return ""; }
		}

		/** 一条检索结果行。行内实时结果流与历史记录展开后的列表共用这一份；
		 *  compact 只缩一点内边距并去掉错峰入场——回看历史不需要逐个浮现。 */
		function sfResultRow(it, i, reduced, dup, compact) {
			const hue = sfHashHue(it.domain);
			return cx("a", { key: it.url + ":" + i, href: it.url, target: "_blank", rel: "noreferrer", title: it.url, style: { display: "flex", alignItems: "center", gap: compact ? 7 : 9, padding: compact ? "4px 6px" : "6px 8px", borderRadius: 9, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.055)", textDecoration: "none", color: "inherit", transition: "background .18s ease, border-color .18s ease, transform .18s ease", animation: reduced ? undefined : "sfItemIn .3s ease both", animationDelay: reduced || compact ? undefined : i * 70 + "ms" } },
				cx("span", { style: { flexShrink: 0, fontSize: 9, padding: "1.5px 6px", borderRadius: 999, background: "hsla(" + hue + ",72%,62%,.16)", color: "hsl(" + hue + ",78%,68%)", maxWidth: 108, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: ".2px" } }, it.domain),
				cx("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 } },
					cx("span", { style: { fontSize: 11, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: SF_TXT1 } }, it.title || it.domain),
					it.snippet && cx("span", { style: { fontSize: 9.5, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: SF_TXT3 } }, it.snippet)
				),
				dup && cx("span", { title: "多轮搜索交叉验证命中", style: { flexShrink: 0, color: "#fbbf24", display: "flex", fontSize: 10 } }, "✓")
			);
		}

		/** 一条检索记录：默认收起成一行（搜了什么 / 什么时候 / 几个来源），点开看结果。 */
		function sfHistoryEntry(h, open) {
			const s = sfSummaryOf(h) || { unique: 0, duplicates: 0, tokens: 0, finalMs: null, totalMs: 0 };
			const query = (h.queries && h.queries.length > 0) ? h.queries.join(" · ") : "（未记录查询词）";
			return cx("div", { key: h.id, style: { flexShrink: 0, border: "1px solid rgba(255,255,255,.06)", borderRadius: 9, background: open ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.016)", overflow: "hidden" } },
				cx("button", { type: "button", "aria-expanded": open, title: query, onClick: () => sfToggleHistory(h.id), style: { width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "6px 9px", border: "none", background: "transparent", color: "inherit", font: "inherit", cursor: "pointer", textAlign: "left" } },
					cx("span", { "aria-hidden": true, style: { flexShrink: 0, fontSize: 8, color: SF_TXT3, transform: open ? "rotate(90deg)" : "none", transition: reducedMotion ? undefined : "transform .15s ease" } }, "▶"),
					cx("span", { style: { flex: 1, minWidth: 0, fontSize: 11, color: SF_TXT1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, query),
					cx("span", { style: { flexShrink: 0, fontSize: 9.5, color: SF_TXT3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } }, sfClock(h.startedAt) + " · " + h.searchCount + " 搜 · " + s.unique + " 源")
				),
				open && cx("div", { style: { padding: "0 9px 9px" } },
					cx("div", { style: { display: "flex", flexWrap: "wrap", gap: 5, margin: "2px 0 6px" } },
						cx(SfChip, { icon: GL_CLOCK, label: sfFmtMs(s.finalMs || s.totalMs), title: "总耗时" }),
						cx(SfChip, { icon: GL_LAYERS, label: s.unique + " 来源", title: "独立域名数" }),
						cx(SfChip, { icon: GL_DUP, label: String(s.duplicates), title: "跨搜索重复结果" }),
						h.wikiRecallCount > 0 ? cx(SfChip, { icon: GL_BOOK, label: "知识库 " + (h.wikiVerdict === "miss" ? "未命中" : h.wikiVerdict === "weak" ? "弱命中" : "命中"), title: "wiki_recall 判定（hit/weak/miss）· 共 " + h.wikiRecallCount + " 次", tone: h.wikiVerdict === "hit" ? "#6ee7b7" : h.wikiVerdict === "weak" ? "#fde68a" : "#fca5a5" }) : null,
						cx(SfChip, { icon: GL_SPARK, label: "≈" + sfFmtTokens(s.tokens), title: "token 估算" })
					),
					h.results.length === 0
						? cx("div", { style: { fontSize: 10, color: SF_TXT3 } }, "这次检索没有留下结果")
						: cx("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
							h.results.slice(-SF_HISTORY_RESULTS).reverse().map((it, i) => sfResultRow(it, i, true, (h.seenUrls.get(it.url) || 0) >= 2, true))
						)
				)
			);
		}

		/**
		 * 侧栏底部的「检索记录」区：已结束的检索悬挂在这里，新的在上面。
		 * 只在页签形态出现——浮动卡片就那么点地方，堆历史只会挤掉当前任务。
		 * grow=true 时（没有进行中的检索）让它占满剩余高度。
		 */
		function sfHistoryNodes(grow) {
			return cx("div", { "data-sf-history": true, style: { flex: grow ? "1 1 auto" : "0 0 auto", display: "flex", flexDirection: "column", minHeight: 0, maxHeight: grow ? undefined : "46%", borderTop: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.012)" } },
				cx("div", { style: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px 5px" } },
					cx("span", { style: { fontSize: 9.5, color: SF_TXT3, letterSpacing: ".6px", textTransform: "uppercase" } }, "检索记录"),
					cx("span", { style: { marginLeft: "auto", fontSize: 9.5, color: SF_TXT3, fontVariantNumeric: "tabular-nums" } }, sfHistory.length + " / " + SF_HISTORY_MAX)
				),
				cx("div", { style: { overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 4, padding: "0 12px 10px" } },
					sfHistory.map((h) => sfHistoryEntry(h, sfOpenHistory.has(h.id)))
				)
			);
		}

		/** 页签根容器：铺满宿主给的格子。侧栏自带表面与边框，所以这里不画背景、
		 *  不投影、不浮动——浮动卡片那一套（fixed / 固定宽 / 阴影 / 毛玻璃）搬进
		 *  页签只会让它看起来像一张贴歪的卡片。 */
		const sfTabBase = {
			position: "relative", display: "flex", flexDirection: "column",
			width: "100%", height: "100%", minHeight: 0, overflow: "hidden",
			fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
			color: SF_TXT1, background: "transparent", border: "none",
		};

		/**
		 * 搜索流程面板 —— 两种形态共用同一份实现：
		 *   variant "card" = 右下角浮动卡片（没有 better-sidebar 时的独立形态）
		 *   variant "tab"  = better-sidebar 页签（铺满容器、结果区可滚动、不自带外框）
		 * 数据、阶段推进、摘要完全一致，差异只在容器样式与"能不能自己收起"。
		 */
		function SearchFlowCard(props) {
			// 容忍"无参调用"：测试与静态渲染会直接取组件的 type() 跑一遍组件体，
			// 不给 props。缺省即浮动卡片形态。
			const { variant, visible = true } = props || {};
			const isTab = variant === "tab";
			const [, force] = react.useReducer((n) => n + 1, 0);
			const reduced = getReducedMotion();
			react.useEffect(() => {
				const unsub = sfSubscribe(force);
				// 页签不可见时停表：宿主把 visible=false 当成"隐藏视图请暂停"的约定。
				if (reduced || visible === false) return unsub;
				const iv = setInterval(() => {
					if (sfTask && !sfTask.collapsed && sfTask.phase !== "writing") force();
				}, 400);
				return () => { clearInterval(iv); unsub(); };
			}, [visible]);
			const t = sfTask;
			if (!t) {
				// 页签随时可能被打开，而任务可能早就结束了——空态是正常状态而不是
				// 异常。浮动卡片可以直接不渲染（return null = "没有卡片"），页签
				// 那么做只会得到一块空白，所以页签形态必须给出空态。
				if (!isTab) return null;
				// 没有进行中的检索、但记录还挂着——这正是「悬挂」想要的效果：打开
				// 侧栏还能翻上一次搜了什么，而不是对着一块空面板。
				if (sfHistory.length > 0) {
					return cx("div", { "data-sf-card": true, "data-sf-variant": "tab", style: sfTabBase },
						cx("div", { style: { padding: "10px 12px 2px", fontSize: 10.5, color: SF_TXT3 } }, "当前没有进行中的检索"),
						sfHistoryNodes(true)
					);
				}
				return cx("div", { "data-sf-card": true, "data-sf-variant": "tab", style: sfTabBase },
					cx("div", { style: { flex: "1 1 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center" } },
						cx("span", { style: { color: SF_TXT3, display: "flex", opacity: .8 } }, cx(SearchIcon, { state: "idle", size: 34 })),
						cx("div", { style: { fontSize: 12.5, fontWeight: 600 } }, "还没有搜索流程"),
						cx("div", { style: { fontSize: 11, color: SF_TXT3, lineHeight: 1.65, maxWidth: 250 } }, "模型调用 web_search / web_fetch / web_snapshot / browser_* 时，这里会实时显示阶段进度与结果流。")
					)
				);
			}
			const s = sfSummaryOf(t);
			const done = t.phase === "writing";
			const activeIdx = done ? 2 : t.phase === "reading" ? 1 : 0;
			const live = !done;
			const timeMs = live ? Date.now() - t.startedAt : (s.finalMs || Date.now() - t.startedAt);
			const timeLabel = live ? "进行中" : "总耗时";
			const emblemColor = done ? SF_DONE : SF_ACC[t.phase] || SF_ACC.search;
			const emblem = done ? cx(DoneIcon, { state: "done", size: 15 })
				: t.phase === "reading" ? cx(ReadingIcon, { state: "running", size: 15 })
				: cx(SearchIcon, { state: "running", size: 15 });
			// 页签形态用铺满容器的根样式；浮动卡片保留它原本的悬浮外观。
			const base = isTab ? sfTabBase : {
				position: "fixed", bottom: 84, right: 16, zIndex: 10000,
				fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
				color: SF_TXT1, background: "rgba(22,22,27,.94)",
				border: "1px solid rgba(255,255,255,.09)", borderRadius: 14,
				boxShadow: "0 12px 40px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.35)",
				backdropFilter: "blur(12px) saturate(1.3)", WebkitBackdropFilter: "blur(12px) saturate(1.3)",
			};

			if (t.collapsed && !isTab) {
				return cx("div", { role: "button", tabIndex: 0, "aria-label": "展开搜索流程", style: { ...base, cursor: "pointer", display: "flex", alignItems: "center", gap: 9, padding: "7px 12px", borderLeft: "3px solid " + emblemColor, animation: reduced ? undefined : "sfExpand .2s cubic-bezier(.34,1.56,.64,1) both" }, onClick: () => { t.collapsed = false; sfNotify(); }, onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t.collapsed = false; sfNotify(); } } },
					cx("span", { style: { color: emblemColor, display: "flex", flexShrink: 0, animation: done || reduced ? undefined : "sfSegPulse 1.6s ease-in-out infinite" } }, emblem),
					cx("span", { style: { fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" } }, "搜索流程"),
					cx("span", { style: { fontSize: 10, color: SF_TXT3, whiteSpace: "nowrap" } }, SF_SEGS[activeIdx].label),
					sfDeepMode && cx("span", { style: { fontSize: 9, padding: "1px 5px", borderRadius: 999, background: 'rgba(251,191,36,.12)', color: '#fbbf24', marginRight: 4 } }, '\u26A1'),
					cx("span", { style: { marginLeft: "auto", fontSize: 11, color: SF_TXT2, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" } }, (live ? "" : "总 ") + sfFmtMs(timeMs))
				);
			}

			return cx("div", { "data-sf-card": true, "data-sf-variant": isTab ? "tab" : "card", style: isTab ? base : { ...base, width: 368, maxWidth: "92vw", overflow: "hidden", animation: reduced ? undefined : "sfExpand .22s cubic-bezier(.34,1.56,.64,1) both" } },
				cx("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 8px", borderBottom: "1px solid rgba(255,255,255,.06)" } },
					cx("span", { style: { color: emblemColor, display: "flex", flexShrink: 0 } }, emblem),
					cx("span", { style: { fontSize: 12.5, fontWeight: 700, letterSpacing: ".2px" } }, "搜索流程"),
					done && cx("span", { style: { fontSize: 9.5, padding: "1px 7px", borderRadius: 999, background: "rgba(52,211,153,.14)", color: "#6ee7b7", fontWeight: 600 } }, "已完成"),
					cx("span", { style: { marginLeft: "auto", fontSize: 10, color: SF_TXT3, fontVariantNumeric: "tabular-nums" } }, (t.searchCount || 0) + " 次搜索" + (t.cacheHits ? " · " + t.cacheHits + " 缓存" : "")),
					cx("button", { "aria-label": sfDeepMode ? 'close deep' : 'open deep', title: sfDeepMode ? '\u6df1\u5ea6\u6a21\u5f0f\u5df2\u5f00\u542f' : '\u5f00\u542f\u6df1\u5ea6\u6a21\u5f0f\uff08\u8de8\u8bed\u8a00+\u6269\u5c55\u67e5\u8be2\uff09', onClick: sfToggleDeep, style: { width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 6, background: sfDeepMode ? 'rgba(251,191,36,.15)' : 'transparent', color: sfDeepMode ? '#fbbf24' : SF_TXT3, cursor: "pointer", fontSize: 12, lineHeight: 1, transition: 'background .2s, color .2s' } }, '\u26A1'),
					// 页签的生命周期归侧栏管，"收起"按钮只属于浮动卡片。
					!isTab && cx("button", { "aria-label": "收起", title: "收起", onClick: () => { t.collapsed = true; sfNotify(); }, style: { marginLeft: 4, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 6, background: "transparent", color: SF_TXT3, cursor: "pointer", fontSize: 12, lineHeight: 1 } }, "✕")
				),
				cx("div", { style: { padding: "12px 12px 4px" } },
					cx("div", { style: { display: "flex", alignItems: "center", height: 27 } },
						SF_SEGS.map((seg, i) => {
							const chipDone = i < activeIdx || done;
							const chipActive = i === activeIdx && !done;
							const chipColor = chipDone ? seg.done : chipActive ? seg.color : "#4a4a52";
							const st = chipDone ? "done" : chipActive ? "running" : "idle";
							return cx(react.Fragment, { key: seg.id },
								cx("div", { style: { flexShrink: 0, width: 27, height: 27, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: chipColor, background: chipDone ? "rgba(52,211,153,.12)" : chipActive ? "rgba(91,155,255,.12)" : "rgba(255,255,255,.035)", border: "1px solid " + (chipDone ? "rgba(52,211,153,.45)" : chipActive ? seg.color + "77" : "rgba(255,255,255,.08)"), boxShadow: chipActive && !reduced ? "0 0 0 3px " + seg.color + "22" : undefined, transition: "background .3s ease, border-color .3s ease, box-shadow .3s ease" } },
									cx(seg.Icon, { state: st, size: 13 })),
								i < SF_SEGS.length - 1 && cx("div", { style: { flex: 1, height: 2, margin: "0 6px", borderRadius: 1, background: chipDone ? seg.done : "#2e2e34", transition: "background .3s ease" } })
							);
						})
					),
					cx("div", { style: { display: "flex", marginTop: 6 } },
						SF_SEGS.map((seg, i) => {
							const chipDone = i < activeIdx || done;
							const chipActive = i === activeIdx && !done;
							return cx("span", { key: seg.id, style: { flex: 1, textAlign: i === 0 ? "left" : i === SF_SEGS.length - 1 ? "right" : "center", fontSize: 9.5, color: chipDone || chipActive ? "#dcdce2" : SF_TXT3, whiteSpace: "nowrap", fontWeight: chipActive ? 600 : 400, transition: "color .3s ease" } }, seg.label);
						})
					),
					cx("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: SF_TXT3, fontVariantNumeric: "tabular-nums" } },
						cx("span", null, timeLabel + " " + sfFmtMs(timeMs)),
						sfDeepMode && cx("span", { style: { color: '#fbbf24', fontSize: 9, padding: '1px 5px', borderRadius: 999, background: 'rgba(251,191,36,.1)' } }, '深度'),
					t.errors > 0 ? cx("span", { style: { color: "#fca5a5" } }, t.errors + " 次失败") : cx("span", null, live ? "实时更新" : "任务完成")
					)
				),
				// 浮动卡片限高 150px；页签形态把剩余高度全给结果区并让它自己滚动。
				t.results.length > 0 && cx("div", { style: { padding: "2px 12px 8px", maxHeight: isTab ? undefined : 150, flex: isTab ? "1 1 auto" : undefined, minHeight: isTab ? 0 : undefined, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 } },
					t.results.slice(isTab ? -TAB_MAX_RESULTS : -CARD_MAX_RESULTS).map((it, i) => sfResultRow(it, i, reduced, (t.seenUrls.get(it.url) || 0) >= 2, false))
				),
				done && s && cx("div", { style: { padding: "9px 12px 10px", borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.018)" } },
					cx("div", { style: { fontSize: 9.5, color: SF_TXT3, letterSpacing: ".6px", textTransform: "uppercase" } }, "本次检索小结"),
					cx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 } },
						cx(SfChip, { icon: GL_CLOCK, label: sfFmtMs(timeMs), title: "总耗时" }),
						cx(SfChip, { icon: GL_LAYERS, label: s.unique + " 来源", title: "独立域名数" }),
						cx(SfChip, { icon: GL_DUP, label: String(s.duplicates), title: "跨搜索重复结果" }),
						s.conf ? cx(SfChip, { icon: GL_SHIELD, label: "验证 " + s.conf, title: "交叉验证置信度", tone: s.conf === "高" ? "#6ee7b7" : s.conf === "中" ? "#fde68a" : "#fca5a5" }) : null,
				t.wikiRecallCount > 0 ? cx(SfChip, { icon: GL_BOOK, label: "知识库 " + (t.wikiVerdict === "miss" ? "未命中" : t.wikiVerdict === "weak" ? "弱命中" : "命中"), title: "wiki_recall 判定（hit/weak/miss）· 共 " + t.wikiRecallCount + " 次", tone: t.wikiVerdict === "hit" ? "#6ee7b7" : t.wikiVerdict === "weak" ? "#fde68a" : "#fca5a5" }) : null,
						cx(SfChip, { icon: GL_SPARK, label: "≈" + sfFmtTokens(s.tokens), title: "token 估算" })
					)
				),
				// 页签底部悬挂「检索记录」：这一轮结束后它不会消失；下一次搜索开始时
				// 它会**下移成历史里的一条**，而不是被就地覆盖。
				isTab && sfHistory.length > 0 && sfHistoryNodes(false)
			);
		}

		// ═══════════════════════════════════════════════════════
		// Host adaptation — better-sidebar 在场 ⇒ 作为它的一个页签活着；
		// 不在场 ⇒ 维持原来的右下角浮动卡片。
		//
		// better-sidebar 把客户端服务发布为 `ctx.betterSidebar`（registerTab
		// 贡献一种页签）。它是**可选同伴**：这里只用结构化描述探测，绝不 import
		// 它的类型——那会把软集成变成硬构建依赖，没装的人直接装不上。
		// 与 dsh-git-manager 的 embed 采用同一套约定（自动页签 / 缺席时独立形态）。
		// ═══════════════════════════════════════════════════════

		const SF_TAB_ID = "searchflow:panel";
		const SF_HOST_KEY = "sf.host";
		/** 页签条上的图标：静态放大镜（动效图标留给行内与面板内，页签上一直转会分神）。 */
		const SF_TAB_ICON_D = "M11 4 a7 7 0 1 0 0 14 7 7 0 0 0 0 -14 M16.2 16.2 L20.6 20.6";

		/** 宿主形态的手动覆盖：'dock' 强制浮动卡片，'tab' 强制页签，其它值=自动。 */
		function sfHostPreference() {
			try {
				const v = localStorage.getItem(SF_HOST_KEY);
				if (v === "dock" || v === "tab") return v;
			} catch {}
			return "auto";
		}

		/** 从任意 cordis 上下文取 better-sidebar 的客户端服务，取不到返回 null。
		 *  `ctx.get` 是运行时探测的正式入口；服务缺席只是普通的 null，不是装载失败。 */
		function betterSidebarOf(ctx) {
			try {
				const get = ctx && ctx.get;
				if (typeof get !== "function") return null;
				const svc = get.call(ctx, "betterSidebar");
				if (!svc || typeof svc.registerTab !== "function") return null;
				return svc;
			} catch { return null; }
		}

		/** 形态写进 body.dataset：出问题时一眼能看出它现在以哪种身份活着。 */
		function sfMarkHost(mode) {
			try { document.body.dataset.sfHost = mode; } catch {}
			console.log("dsh-searchflow: host = " + mode);
		}

		/** 浮动卡片 = 独立形态。id 固定，便于收尸与诊断。 */
		function mountStandaloneCard() {
			if (sfCardMount) return;
			sfCardMount = document.createElement("div");
			sfCardMount.id = "sf-card-mount";
			document.body.appendChild(sfCardMount);
			sfCardRoot = { node: sfCardMount };
			react_dom.render(cx(SearchFlowCard, { variant: "card" }), sfCardMount);
		}
		function teardownStandaloneCard() {
			if (sfCardRoot) { try { react_dom.unmountComponentAtNode(sfCardRoot.node); } catch {} sfCardRoot = null; }
			if (sfCardMount && sfCardMount.parentNode) sfCardMount.parentNode.removeChild(sfCardMount);
			sfCardMount = null;
		}

		/** 页签内容体：同一份面板，只多告诉它"现在在不在屏幕上"。 */
		function SearchFlowTab({ visible }) {
			return cx(SearchFlowCard, { variant: "tab", visible: visible });
		}

		/**
		 * 把搜索流程注册成 better-sidebar 的一个页签，返回注销函数。
		 *
		 * 注册成功后**回读一次注册表**（getTab）：调用了 registerTab 不等于页签
		 * 真的进了列表（宿主版本差异、服务半路失效……），而"页签静默消失"是最糟
		 * 的结局。回读不到就抛错，让调用方退回落地的浮动卡片——宁可有卡片，
		 * 不可没面板。
		 */
		function registerSidebarTab(service) {
			const dispose = service.registerTab({
				id: SF_TAB_ID,
				title: "搜索流程",
				description: "web_search → fetch → snapshot → click 的实时阶段与结果流",
				icon: (size) => cx(SfGlyph, { d: SF_TAB_ICON_D, size: size }),
				order: 96,
				// 单实例：搜索流程是全局观测（事件流不区分会话），开一个就够。
				single: true,
				// 页签角标：流程进行中把已有结果数顶上去，结束后隐藏。
				badge: () => (sfTask && sfTask.phase !== "writing" ? Math.max(1, sfTask.results.length) : null),
				component: (props) => cx(SearchFlowTab, { visible: props && props.visible }),
			});
			// 回读校验：老版本没有 getTab 就跳过（不阻塞集成）。
			if (typeof service.getTab === "function" && service.getTab(SF_TAB_ID) === undefined) {
				try { dispose(); } catch {}
				throw new Error("better-sidebar accepted registerTab('" + SF_TAB_ID + "') but does not list it");
			}
			return dispose;
		}

		function apply(ctx) {
			try { document.title = (document.title || "") + " [sf-apply] "; } catch {} // PROBE
			try { console.log("[dsh-searchflow] apply called"); } catch {} // PROBE
			ensureKF();
			if (typeof document === "undefined") return;
			
			// Inject semantic color tokens into CSS custom properties
			injectColorTokens();

			// Create live region for status announcements (ARIA live region).
			// 播报函数本身在模块级（见下方 announce）——事件通路（processEvent /
			// connectSSE / pollOnce）都在模块作用域，写在 apply 里它们看不见。
			const liveRegion = document.createElement("div");
			liveRegion.className = "sf-live-region";
			liveRegion.setAttribute("aria-live", "polite");
			liveRegion.setAttribute("aria-atomic", "true");
			liveRegion.id = "sf-live-region";
			document.body.appendChild(liveRegion);

			// Inject semantic color tokens into CSS custom properties
			injectColorTokens();

			// Session tracking: reset phase state only on a real session
			// switch (flow column A → flow column B). The very first sight
			// of a flow must NOT reset — SSE replay may have populated state.
			let currentFlow = null;
			function trackSessionFlow() {
				const flow = document.querySelector(FLOW_SEL);
				if (currentFlow && flow !== currentFlow) resetFlow();
				currentFlow = flow;
			}

			connectSSE();

			// ── Unified scheduler (replaces sessionObserver + liveObserver + healLoop)
			// Single rAF-driven loop with dirty flags — eliminates 3×200ms timers +
			// two MutationObservers. Only runs when SSE or DOM actually changed.
			let dirty = false;
			let rafId = null;
			let lastFlow = null;
			function markDirty() { dirty = true; scheduleTick(); }
			function scheduleTick() {
				if (rafId) return;
				rafId = requestAnimationFrame(() => {
					rafId = null;
					if (!dirty) return;
					dirty = false;
					// Track session flow (only on real flow switch)
					const flow = document.querySelector(FLOW_SEL);
					if (lastFlow && flow !== lastFlow) resetFlow();
					lastFlow = flow;
					applyInlineIcons();
				});
			}
			// Single MutationObserver for all DOM changes
			const domObserver = new MutationObserver((muts) => {
				for (const m of muts) {
					const t = m.target;
					// Any change inside a tool row → immediate tick
					if (t && t.closest && t.closest("[data-tool]")) { markDirty(); return; }
					// Flow column added/removed → track session flow
					if (t && t.matches && t.matches(FLOW_SEL)) { markDirty(); return; }
					// Flow column removed → flow will be null next tick
					if (m.removedNodes.length) { markDirty(); return; }
				}
			});
			domObserver.observe(document.body, { childList: true, subtree: true, attributes: false });
			// Icon farm must exist before the first enhancement sweep.
			mountIconFarm();
			// Deep mode: sync initial state from host
			fetch('/searchflow/deep').then(function(r) { return r.json(); }).then(function(d) { if (typeof d.enabled === 'boolean') { sfDeepMode = d.enabled; sfNotify(); } }).catch(function() {});

			// ── SearchFlow 面板挂载：better-sidebar 在场就做它的页签，
			//    不在场就退回右下角浮动卡片。手动覆盖 localStorage['sf.host']。──
			let disposeTab = null;
			const adoptSidebar = (svc) => {
				if (!svc || disposeTab) return false;
				try { disposeTab = registerSidebarTab(svc); return true; }
				catch (e) {
					disposeTab = null;
					console.error("dsh-searchflow: better-sidebar tab registration failed; keeping the floating card", e);
					return false;
				}
			};
			// 收尸：上一次 HMR 实例可能留下一张孤儿卡片（本插件的旧版本不认 dataset）。
			try {
				const stale = document.getElementById("sf-card-mount");
				if (stale && stale !== sfCardMount) stale.remove();
			} catch {}

			const sfPref = sfHostPreference();
			const sfProbed = sfPref === "dock" ? null : betterSidebarOf(ctx);
			if (adoptSidebar(sfProbed)) {
				sfMarkHost("tab");
			} else {
				sfMarkHost("dock");
				mountStandaloneCard();
				// better-sidebar 可能比本插件晚挂载：它一出现就换成页签形态，
				// 并把浮动卡片撤掉（否则同一份数据在屏幕上有两个出处）。
				try {
					if (sfPref !== "dock" && typeof ctx.inject === "function") {
						ctx.inject(["betterSidebar"], (scope) => {
				try { document.title = (document.title || "") + " [sf-sidebar] "; } catch {} // PROBE
							if (!adoptSidebar(betterSidebarOf(scope))) return;
							sfMarkHost("tab-late");
							teardownStandaloneCard();
						});
					}
				} catch { /* 无 inject 能力：只用启动时的探测结果 */ }
			}

			// Initial paint
			setTimeout(() => { markDirty(); }, 300);

			selfHealRev();
			typeof ctx.effect === "function" && ctx.effect(() => () => {
				if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
				domObserver.disconnect();
				clearInlineIcons();
				if (es) { es.close(); es = null; }
				if (sfWriteTimer) { clearTimeout(sfWriteTimer); sfWriteTimer = null; }
				if (sfCollapseTimer) { clearTimeout(sfCollapseTimer); sfCollapseTimer = null; }
				if (disposeTab) { try { disposeTab(); } catch {} disposeTab = null; }
				teardownStandaloneCard();
			});
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
