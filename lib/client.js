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
		let react_dom_client = require("react-dom/client");

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

		function connectSSE() {
			if (es) return;
			try {
				debug.connCount++;
				es = new EventSource("/searchflow/events");
				es.onmessage = (e) => {
					try {
						const evt = JSON.parse(e.data);
						debug.msgCount++;
						debug.lastMsg = evt.type + ":" + (evt.data && evt.data.phase);
						allEvents.push(evt);
						if (allEvents.length > MAX_EVENTS) allEvents.shift();
						processEvent(evt);
						applyInlineIcons();
					} catch (err) { debug.lastErr = String(err && err.message || err); }
				};
				es.onerror = () => { connected = false; es = null; setTimeout(connectSSE, 3000); };
				es.onopen = () => { connected = true; };
			} catch { setTimeout(connectSSE, 3000); }
		}

		function processEvent(evt) {
			const { type, data } = evt;
			const phase = data.phase;
			if (!phase) return;
			if (type === "tool:start") {
				PHASE_STATE[phase] = "running";
				PHASE_COUNT[phase] = (PHASE_COUNT[phase] || 0) + 1;
			} else if (type === "tool:completed") {
				PHASE_STATE[phase] = "done";
			} else if (type === "tool:error") {
				PHASE_STATE[phase] = "error";
			}
		}

		function getPhaseState(phase) { return PHASE_STATE[phase] ?? "idle"; }

		// Clear all flow state on a real session switch (flow A → flow B):
		// rows of the new session must start clean and stock.
		function resetFlow() {
			for (const k of Object.keys(PHASE_STATE)) delete PHASE_STATE[k];
			for (const k of Object.keys(PHASE_COUNT)) delete PHASE_COUNT[k];
			allEvents.length = 0;
		}


		// ═══════════════════════════════════════════════════════
		// Icon Farm — every phase × state icon rendered once off-screen;
		// inline row enhancement clones nodes from here.
		// ═══════════════════════════════════════════════════════

		function IconFarm() {
			return cx("div", null,
				PHASES.map(p =>
					["running", "done", "error"].map(st =>
						cx("span", {
							key: p.id + ":" + st,
							"data-sf-icon": p.id + ":" + st,
							style: { display: "inline-flex" },
						},
							cx(p.Icon, { state: st, size: 22 })
						)
					)
				)
			);
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
			["web_exa_search", "search"],
			["github_issue_list", "search"],
			["web_search", "search"],
			["web_fetch_pro", "fetch"],
			["web_exa_contents", "fetch"],
			["web_fetch", "fetch"],
			["web_snapshot", "snapshot"],
			["browser_screenshot", "snapshot"],
			["browser_recipe_run", "click"],
			["browser_script_run_builtin", "read"],
			["browser_userscript_run", "read"],
			["github_issue_read", "read"],
			["browser_click", "click"],
			["browser_scroll", "click"],
			["browser_type", "click"],
			["browser_open", "click"],
			["browser_read", "read"],
			["web_rule", "read"],
			["web_history", "read"],
		];

		var farmRoot = null;
		var farmHost = null;

		function iconFromFarm(phase, state) {
			if (!farmRoot) return null;
			const src = farmHost && farmHost.querySelector("[data-sf-icon='" + phase + ":" + state + "']");
			if (!src || !src.firstElementChild) return null;
			const clone = src.firstElementChild.cloneNode(true);
			clone.setAttribute("data-sf-state", phase + ":" + state);
			return clone;
		}

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
							const h = ov.parentElement;
							// Restore whatever we hid: the host (icon holder or
							// StateDot dot) and the stock svg inside it.
							if (h) h.style.visibility = "";
							const s = h && h.querySelector("svg:not([data-sf-state])");
							if (s) s.style.visibility = "";
							ov.remove();
						}
					}
					continue;
				}
				// Locate the STOCK icon precisely: only a leading-slot svg that
				// is NOT ours (:not([data-sf-state])) and NOT the chevron (it
				// also lives inside _leading_ and would otherwise win on rows
				// whose stock icon is a StateDot span — error rows).
				const leading = row.querySelector('[class*="_leading_"]');
				if (!leading) continue;
				const stockSvg = leading.querySelector('svg:not([data-sf-state]):not([class*="chevron"])');
				let holder;
				if (stockSvg) {
					holder = stockSvg.parentElement;
					if (stockSvg.style.visibility !== "hidden") stockSvg.style.visibility = "hidden";
				} else {
					// No stock svg (e.g. error rows show a StateDot span) —
					// host the overlay on the leading slot's first element and
					// hide that stock dot instead.
					const dot = leading.firstElementChild;
					if (!dot) continue;
					holder = dot;
					if (dot.getAttribute("data-sf-inline") === null && dot.style.visibility !== "hidden") dot.style.visibility = "hidden";
				}
				// Un-clip the row: DSH hides overflow for its sweep animation,
				// which would shear the 22px icon protruding from the 14px slot.
				if (row.style.overflow !== "visible") row.style.overflow = "visible";
				if (getComputedStyle(holder).position === "static" && holder.style.position !== "relative") holder.style.position = "relative";
				if (holder.style.overflow !== "visible") holder.style.overflow = "visible";
				let overlay = holder.querySelector("[data-sf-inline]");
				if (!overlay) {
					overlay = document.createElement("span");
					overlay.setAttribute("data-sf-inline", "1");
					// visibility:visible — a hidden stock host (StateDot row)
					// would otherwise cascade and hide our icon too.
					overlay.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;visibility:visible;";
					holder.appendChild(overlay);
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
				// Pulsing halo: 30px ring sits a clear 4px outside the 22px
				// icon so the stroke never overlaps the icon artwork; faint
				// enough to read as ambient, not as a mask.
				if (st === "running") {
					const halo = document.createElement("span");
					halo.setAttribute("data-sf-halo", "1");
					halo.style.cssText = "position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:1.5px solid rgba(96,165,250,.35);animation:sfPulseRing 1.5s ease-out infinite;pointer-events:none;";
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
				restoreRowText(row);
			});
			document.querySelectorAll("[data-sf-inline]").forEach(el => {
				const holder = el.parentElement;
				el.remove();
				if (holder) {
					// Restore host visibility (StateDot case) and stock svg.
					holder.style.visibility = "";
					const svg = holder.querySelector("svg:not([data-sf-state])");
					if (svg) svg.style.visibility = "";
				}
			});
		}

		function apply(ctx) {
			ensureKF();
			if (typeof document === "undefined") return;

			// Icon farm: render every phase×state icon once off-screen, then
			// clone nodes from it into tool-call rows. One React root for the
			// whole page, independent of conversation DOM churn.
			farmHost = document.createElement("div");
			farmHost.id = "sf-iconfarm";
			farmHost.setAttribute("data-dsh-plugin", "dsh-searchflow");
			farmHost.style.cssText = "position:fixed;left:-9999px;top:0;width:0;height:0;overflow:hidden;";
			document.body.appendChild(farmHost);
			farmRoot = react_dom_client.createRoot(farmHost);
			farmRoot.render(cx(IconFarm));

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

			// Sweep tool-call rows as the conversation DOM changes (streaming
			// re-renders, new rows appearing). Debounced; SSE events also
			// sweep directly so start/finish shows up instantly.
			let sweepTimer = null;
			const sessionObserver = new MutationObserver(() => {
				if (sweepTimer) return;
				sweepTimer = setTimeout(() => {
					sweepTimer = null;
					trackSessionFlow();
					applyInlineIcons();
				}, 200);
			});
			sessionObserver.observe(document.body, { childList: true, subtree: true });

			// Live pre-paint sweep: when React re-creates the leading slot
			// (expand/collapse, streaming), this observer fires in the same
			// microtask tick — BEFORE the browser paints — and re-applies the
			// overlay, so the stock sparkle never becomes visible.
			// applyInlineIcons() is fully idempotent (guarded writes), so an
			// unchanged sweep mutates nothing and cannot loop.
			const liveObserver = new MutationObserver((muts) => {
				for (const m of muts) {
					const t = m.target;
					if (t && t.closest && t.closest("[data-sf-row]")) {
						applyInlineIcons();
						return;
					}
				}
			});
			liveObserver.observe(document.body, { childList: true, subtree: true });

			setTimeout(() => { trackSessionFlow(); applyInlineIcons(); }, 300);

			// Self-heal sweep: React re-renders (expand/collapse, streaming)
			// can restore stock icons between observer ticks; this bounded
			// recursive timer re-applies the enhancement no matter what.
			let healTick = null;
			function healLoop() {
				applyInlineIcons();
				healTick = setTimeout(healLoop, 2000);
			}
			healTick = setTimeout(healLoop, 2000);

			selfHealRev();
			typeof ctx.effect === "function" && ctx.effect(() => () => {
				if (sweepTimer) { clearTimeout(sweepTimer); sweepTimer = null; }
				if (healTick) { clearTimeout(healTick); healTick = null; }
				sessionObserver.disconnect();
				liveObserver.disconnect();
				if (farmRoot) { try { farmRoot.unmount(); } catch {} farmRoot = null; }
				if (farmHost) { farmHost.remove(); farmHost = null; }
				clearInlineIcons();
				if (es) { es.close(); es = null; }
			});
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
