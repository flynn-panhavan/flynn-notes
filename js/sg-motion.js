/* Soft Glass Motion: tiny controller for sg-motion.css (no dependencies).
   window.SGM = { setOpen, swapText, button, ping, bar, setStage, renderSteps, glide } */
(function () {
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");

  // Open/close a .sg-collapse block. "settled" lets focus rings spill out afterwards.
  function setOpen(el, open) {
    if (!el) return;
    open = !!open;
    if (el.classList.contains("open") === open) return;
    clearTimeout(el._settle);
    el.classList.remove("settled");
    el.classList.toggle("open", open);
    el.inert = !open;
    if (open) el._settle = setTimeout(() => el.classList.add("settled"), 560);
  }
  document.querySelectorAll(".sg-collapse:not(.open)").forEach((el) => { el.inert = true; });

  // Change text with a small slide-in, only if it really changed.
  function swapText(el, text) {
    if (!el || el.textContent === text) return;
    el.textContent = text;
    if (REDUCED.matches) return;
    el.classList.remove("sg-swap");
    void el.offsetWidth;
    el.classList.add("sg-swap");
  }

  // Download button: idle -> busy -> done -> idle   (or error -> idle)
  // btn: .sg-dlbtn  |  labels: { idle, busy, done, error }
  function button(btn, labels) {
    const L = Object.assign({ idle: "Download", busy: "Downloading…", done: "Saved!", error: "Try again" }, labels);
    const label = btn.querySelector(".sg-dlbtn-label");
    let timer = 0;
    return {
      set(state, override) {
        clearTimeout(timer);
        btn.dataset.state = state;
        btn.disabled = state === "busy";
        swapText(label, override || L[state]);
        if (state === "done")  timer = setTimeout(() => this.set("idle"), 2600);
        if (state === "error") timer = setTimeout(() => this.set("idle"), 1800);
      },
      chip(text) { swapText(btn.querySelector(".sg-dlbtn-chip"), text); },
    };
  }

  // One soft ring pulse: "ready"
  function ping(btn) {
    if (REDUCED.matches || btn.dataset.state !== "idle") return;
    btn.classList.remove("ping");
    void btn.offsetWidth;
    btn.classList.add("ping");
    setTimeout(() => btn.classList.remove("ping"), 1000);
  }

  // Progress bar eased on the UI side, so it glides between slow progress updates.
  // const b = SGM.bar(fillEl, pctEl);  b.set(37);  b.set(100, true /* snap */)
  function bar(fill, pct) {
    const s = { disp: 0, target: 0, raf: 0, last: 0 };
    const paint = () => {
      fill.style.setProperty("--p", s.disp.toFixed(2));
      if (pct) pct.textContent = Math.round(s.disp) + "%";
    };
    const step = (ts) => {
      const dt = Math.min(80, ts - (s.last || ts));
      s.last = ts;
      const diff = s.target - s.disp;
      if (Math.abs(diff) < 0.08) { s.disp = s.target; paint(); s.raf = 0; s.last = 0; return; }
      const k = Math.min(Math.abs(diff), Math.max(Math.abs(diff) * (1 - Math.exp(-dt / 260)), 0.012 * dt));
      s.disp += Math.sign(diff) * k;
      paint();
      s.raf = requestAnimationFrame(step);
    };
    return {
      set(target, snap) {
        s.target = Math.max(0, Math.min(100, target || 0));
        if (snap || REDUCED.matches || document.hidden) {
          cancelAnimationFrame(s.raf); s.raf = 0; s.last = 0; s.disp = s.target; paint(); return;
        }
        if (!s.raf) { s.last = 0; s.raf = requestAnimationFrame(step); }
      },
      reset() { this.set(0, true); },
    };
  }

  // Progress card: stage = starting|video|audio|convert|merge|subs|done
  //                mode  = indeterminate|working|determinate
  function setStage(card, stage, mode, title, meta) {
    card.dataset.stage = stage;
    if (mode) card.dataset.bar = mode;
    if (title != null) swapText(card.querySelector(".sg-dl-title"), title);
    if (meta != null)  swapText(card.querySelector(".sg-dl-meta"), meta);
  }

  // Stepper. defs = [["video","Video"],["audio","Audio"],["merge","Merge"]]
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  function renderSteps(ol, defs, activeKey, allDone) {
    ol.hidden = defs.length === 0;
    const key = defs.map((d) => d[0]).join();
    if (ol._key !== key) {
      ol._key = key; ol.innerHTML = ""; ol._steps = []; ol._lines = [];
      defs.forEach(([, label], i) => {
        const li = document.createElement("li");
        li.className = "sg-step"; li.dataset.state = "todo";
        li.innerHTML = '<span class="dot">' + CHECK + '</span><span class="lbl"></span>';
        li.querySelector(".lbl").textContent = label;
        ol.appendChild(li); ol._steps.push(li);
        if (i < defs.length - 1) {
          const ln = document.createElement("li");
          ln.className = "sg-step-line"; ln.setAttribute("aria-hidden", "true");
          ol.appendChild(ln); ol._lines.push(ln);
        }
      });
    }
    const idx = allDone ? defs.length : defs.findIndex((d) => d[0] === activeKey);
    ol._steps.forEach((li, i) => { li.dataset.state = i < idx ? "done" : i === idx ? "active" : "todo"; });
    ol._lines.forEach((ln, i) => { ln.dataset.state = i < idx ? "done" : "todo"; });
  }

  // Gliding segmented control: buttons inside .sg-glide
  function glide(root, onChange) {
    const btns = [...root.querySelectorAll("button")];
    root.style.setProperty("--n", btns.length);
    const select = (i) => {
      btns.forEach((b, j) => b.classList.toggle("active", j === i));
      root.style.setProperty("--i", i);
      if (onChange) onChange(i, btns[i]);
    };
    btns.forEach((b, i) => b.addEventListener("click", () => select(i)));
    select(Math.max(0, btns.findIndex((b) => b.classList.contains("active"))));
  }

  window.SGM = { setOpen, swapText, button, ping, bar, setStage, renderSteps, glide, REDUCED };
})();
