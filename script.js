const REQUIRED_IDS = [
    "toast", "cv", "stage", "ro", "tp1", "tp", "fr", "ly", "pal", "cp",
    "hx", "cr", "cg", "cb", "tools", "fl", "pos", "undo", "redo", "fa",
    "fd", "fx", "la", "lx", "lu", "ld", "gr", "pl", "fps",
    "fpv", "sd", "sm", "sk", "tr", "bgc", "sc", "sp", "si", "ef",
    "es", "ej", "sz", "cn", "cw", "ch", "bs", "dt", "zo", "zi",
    "zf", "sfh", "sfv", "srt", "scp", "scx", "spt", "sdl", "rf", "rff",
    "rc", "tg", "tadd", "ta", "tb", "tf", "tn", "im", "imf", "iw",
    "ih", "imr", "is", "pi", "pif", "pe", "pg", "eg", "pa", "pr",
    "mx", "my", "fml", "fmr", "ps", "po", "pf",
    "lname", "lop", "lopv", "lblend", "llock", "ldup", "lmerge", "lclr", "lsel", "lsolo", "lall"
];
const missingIds = REQUIRED_IDS.filter(id => !document.getElementById(id));
if (missingIds.length) {
    const msg = 'Missing elements in the HTML: #' + missingIds.join(', #');
    document.body.insertAdjacentHTML('afterbegin', '<p style="margin:0;padding:10px;background:#a63d62;color:#fff;font:16px monospace">' + msg + '</p>');
    throw new Error(msg);
}

const $ = s => document.querySelector(s);
const mk = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
};

const PAL = [
    '#1a0e14', '#3a1a2a', '#6b2a45', '#a63d62', '#e8899f', '#f7d4dc', '#fff3ea', '#d8b36a',
    '#8a5a3c', '#4a3a5c', '#2a2440', '#6c5a8c', '#9fb4a0', '#2f4a44', '#0f0a10', '#7a1f33'
];
let W;
let H;
let layers;
let frames;
let lc = 1;
let cf = 0;
let cl = 0;
let tool = 'pencil';
let color = PAL[4];
let grid = true;
let timer = null;
let fps = 8;
let undo = [];
let redo = [];
let drag = null;
let tt;
let st;
const K = 'sprite-loft-v1';
const pack = h => {
    const n = parseInt(h.slice(1), 16);
    return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
};

const hex = v => '#' + [v & 255, (v >> 8) & 255, (v >> 16) & 255].map(x => x.toString(16).padStart(2, '0')).join('');
const cel = () => frames[cf].c[cl];

function toast(m) {
    const t = $('#toast');
    t.textContent = m;
    t.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => t.classList.remove('show'), 2200);
}

function comp(fi) {
    const o = mk(W, H);
    const oc = o.getContext('2d');
    const t = mk(W, H);
    const tc = t.getContext('2d');
    layers.forEach((L, i) => {
        if (!L.v) {
            return;
        }
        tc.putImageData(new ImageData(new Uint8ClampedArray(frames[fi].c[i].buffer.slice(0)), W, H), 0, 0);
        oc.globalAlpha = (L.o ?? 100) / 100;
        oc.globalCompositeOperation = L.m || 'source-over';
        oc.drawImage(t, 0, 0);
        oc.globalAlpha = 1;
        oc.globalCompositeOperation = 'source-over';
    });
    return o;
}

function draw() {
    const cv = $('#cv');
    const st = $('#stage');
    // Fit the canvas to the space available: limited by the stage width and by the window height minus the toolbars
    const zf = Math.max(2, Math.floor(Math.min(st.clientWidth, Math.max(240, window.innerHeight - 260)) / Math.max(W, H)));
    const z = Math.max(1, Math.round(zf * zm));
    cv.width = W * z;
    cv.height = H * z;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    if (ref) {
        const r = Math.min(W * z / ref.width, H * z / ref.height);
        c.globalAlpha = $('#ro').value / 100;
        c.drawImage(ref, (W * z - ref.width * r) / 2, (H * z - ref.height * r) / 2, ref.width * r, ref.height * r);
        c.globalAlpha = 1;
    }
    c.drawImage(comp(cf), 0, 0, W * z, H * z);
    if (grid && z >= 6) {
        c.strokeStyle = 'rgba(128,128,128,.3)';
        c.lineWidth = 1;
        c.beginPath();
        for (let i = 1; i < W; i++) {
            c.moveTo(i * z + .5, 0);
            c.lineTo(i * z + .5, H * z);
        }
        for (let j = 1; j < H; j++) {
            c.moveTo(0, j * z + .5);
            c.lineTo(W * z, j * z + .5);
        }
        c.stroke();
    }
    if (sel) {
        c.strokeStyle = '#e8899f';
        c.lineWidth = 2;
        c.setLineDash([5, 4]);
        c.strokeRect(sel.x * z + 1, sel.y * z + 1, sel.w * z - 2, sel.h * z - 2);
        c.setLineDash([]);
    }
    if ($('#tp1').checked) {
        const t = $('#tp');
        const k = t.getContext('2d');
        const f = comp(cf);
        t.width = W * 3;
        t.height = H * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                k.drawImage(f, i * W, j * H);
            }
        }
    }
}

function frs() {
    const el = $('#fr');
    el.innerHTML = '';
    frames.forEach((f, i) => {
        const b = document.createElement('button');
        b.className = 'th' + (i === cf ? ' on' : '');
        b.setAttribute('aria-label', 'Frame ' + (i + 1));
        const s = document.createElement('span');
        s.textContent = i + 1;
        b.append(comp(i), s);
        b.onclick = () => {
            cf = i;
            draw();
            frs();
        };
        el.appendChild(b);
    });
}

function lys() {
    const el = $('#ly');
    el.innerHTML = '';
    for (let i = layers.length - 1; i >= 0; i--) {
        const L = layers[i];
        const r = document.createElement('div');
        r.className = 'lr' + (i === cl ? ' on' : '');
        const n = document.createElement('button');
        n.className = 'b ln';
        n.textContent = L.n + (L.k ? ' (locked)' : '');
        n.onclick = () => {
            cl = i;
            lys();
        };
        const e = document.createElement('button');
        e.className = 'b';
        e.textContent = L.v ? 'Shown' : 'Hidden';
        e.onclick = () => {
            L.v = !L.v;
            draw();
            lys();
            frs();
            sv();
        };
        r.append(n, e);
        el.appendChild(r);
    }
    layerOpts();
}

function layerOpts() {
    const L = layers[cl];
    $('#lname').value = L.n;
    $('#lop').value = L.o ?? 100;
    $('#lopv').textContent = (L.o ?? 100) + '%';
    $('#lblend').value = L.m || 'source-over';
    $('#llock').checked = !!L.k;
}

function pal() {
    const el = $('#pal');
    el.innerHTML = '';
    PAL.forEach(h => {
        const b = document.createElement('button');
        b.className = 'sw' + (h === color ? ' on' : '');
        b.style.background = h;
        b.setAttribute('aria-label', 'Color ' + h);
        b.onclick = () => {
            if (tool === 'eraser') {
                setTool('pencil');
            }
            setColor(h);
        };
        el.appendChild(b);
    });
}

function setColor(h, skip) {
    color = h.toLowerCase();
    $('#cp').value = color;
    if (skip !== 'hx') {
        $('#hx').value = color;
    }
    if (skip !== 'rgb') {
        const n = parseInt(color.slice(1), 16);
        $('#cr').value = n >> 16;
        $('#cg').value = (n >> 8) & 255;
        $('#cb').value = n & 255;
    }
    pal();
}

const all = () => {
    draw();
    frs();
    lys();
    setColor(color);
    sheet();
    tgs();
};

function setTool(t) {
    tool = t;
    document.querySelectorAll('#tools .b').forEach(b => b.classList.toggle('on', b.dataset.t === t));
}

document.querySelectorAll('#tools .b').forEach(b => b.onclick = () => setTool(b.dataset.t));

let mx = false;
let my = false;

function stamp(x, y) {
    const v = tool === 'eraser' ? 0 : pack(color);
    const o = -((bsz - 1) >> 1);
    const p = (a, b) => {
        if (a >= 0 && b >= 0 && a < W && b < H && !(dt && (a + b) & 1)) {
            cel()[b * W + a] = v;
        }
    };
    for (let i = 0; i < bsz; i++) {
        for (let j = 0; j < bsz; j++) {
            const a = x + o + i;
            const b = y + o + j;
            p(a, b);
            if (mx) {
                p(W - 1 - a, b);
            }
            if (my) {
                p(a, H - 1 - b);
            }
            if (mx && my) {
                p(W - 1 - a, H - 1 - b);
            }
        }
    }
}

function shape(x0, y0, x1, y1) {
    const f = $('#fl').checked;
    if (tool === 'line') {
        return ln(x0, y0, x1, y1, stamp);
    }
    const a = Math.min(x0, x1);
    const b = Math.min(y0, y1);
    const c = Math.max(x0, x1);
    const d = Math.max(y0, y1);
    if (tool === 'rect') {
        if (f) {
            for (let y = b; y <= d; y++) {
                for (let x = a; x <= c; x++) {
                    stamp(x, y);
                }
            }
        }
        else {
            ln(a, b, c, b, stamp);
            ln(c, b, c, d, stamp);
            ln(c, d, a, d, stamp);
            ln(a, d, a, b, stamp);
        }
        return;
    }
    const cx = (a + c) / 2;
    const cy = (b + d) / 2;
    const rx = (c - a) / 2 + .5;
    const ry = (d - b) / 2 + .5;
    const ins = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    for (let y = b; y <= d; y++) {
        for (let x = a; x <= c; x++) {
            if (ins(x, y) && (f || !(ins(x + 1, y) && ins(x - 1, y) && ins(x, y + 1) && ins(x, y - 1)))) {
                stamp(x, y);
            }
        }
    }
}

function ln(a, b, c, d, f) {
    const dx = Math.abs(c - a);
    const dy = -Math.abs(d - b);
    const sx = a < c ? 1 : -1;
    const sy = b < d ? 1 : -1;
    let er = dx + dy;
    for (;;) {
        f(a, b);
        if (a === c && b === d) {
            break;
        }
        const e2 = 2 * er;
        if (e2 >= dy) {
            er += dy;
            a += sx;
        }
        if (e2 <= dx) {
            er += dx;
            b += sy;
        }
    }
}

function fill(x, y, v) {
    const c = cel();
    const t = c[y * W + x];
    if (t === v) {
        return;
    }
    const s = [[x, y]];
    while (s.length) {
        const [a, b] = s.pop();
        if (a < 0 || b < 0 || a >= W || b >= H || c[b * W + a] !== t) {
            continue;
        }
        c[b * W + a] = v;
        s.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
    }
}

const cv = $('#cv');
const ptrs = new Map();
let pm = null;
const xy = e => {
    const r = cv.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)];
};

const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const pinfo = () => {
    const a = [...ptrs.values()];
    return { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
};

function zoomBy(f) {
    const st = $('#stage');
    const ow = st.scrollWidth;
    const oh = st.scrollHeight;
    const cx = (st.scrollLeft + st.clientWidth / 2) / ow;
    const cy = (st.scrollTop + st.clientHeight / 2) / oh;
    zm = Math.max(.5, Math.min(16, zm * f));
    draw();
    st.scrollLeft = cx * st.scrollWidth - st.clientWidth / 2;
    st.scrollTop = cy * st.scrollHeight - st.clientHeight / 2;
}

const reg = () => sel || {
    x: 0, y: 0, w: W, h: H
};

function getReg(c, r) {
    const d = new Uint32Array(r.w * r.h);
    for (let j = 0; j < r.h; j++) {
        for (let i = 0; i < r.w; i++) {
            d[j * r.w + i] = c[(r.y + j) * W + r.x + i];
        }
    }
    return d;
}

function putReg(c, r, d, all) {
    for (let j = 0; j < r.h; j++) {
        for (let i = 0; i < r.w; i++) {
            const x = r.x + i;
            const y = r.y + j;
            if (x < 0 || y < 0 || x >= W || y >= H) {
                continue;
            }
            const v = d[j * r.w + i];
            if (v || all) {
                c[y * W + x] = v;
            }
        }
    }
}

const pushU = () => {
    undo.push({ f: cf, l: cl, d: cel().slice() });
    if (undo.length > 60) {
        undo.shift();
    }
    redo = [];
};

cv.onpointerdown = e => {
    e.preventDefault();
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cv.setPointerCapture(e.pointerId);
    if (ptrs.size === 2) {
        if (drag) {
            if (drag.snap) {
                cel().set(drag.snap);
                undo.pop();
            }
            drag = null;
            draw();
        }
        pm = pinfo();
        return;
    }
    if (ptrs.size > 2) {
        return;
    }
    if (timer) {
        setPlay(false);
    }
    if (!layers[cl].v) {
        toast('This layer is hidden');
        return;
    }
    let [x, y] = xy(e);
    if (!inb(x, y)) {
        return;
    }
    const c = cel();
    if (tool === 'pick') {
        const v = c[y * W + x];
        if (v >>> 24) {
            setColor(hex(v));
        }
        return;
    }
    if (tool === 'select') {
        drag = { sel: 1, x0: x, y0: y };
        sel = null;
        return;
    }
    if (layers[cl].k) {
        toast('This layer is locked');
        return;
    }
    if (tool === 'move') {
        if (!sel || x < sel.x || y < sel.y || x >= sel.x + sel.w || y >= sel.y + sel.h) {
            toast('Select an area, then drag inside it');
            return;
        }
        pushU();
        const base = c.slice();
        putReg(base, sel, new Uint32Array(sel.w * sel.h), true);
        drag = {
            mv: 1, x0: x, y0: y, r0: { ...sel }, buf: getReg(c, sel), base, snap: c.slice()
        };
        return;
    }
    pushU();
    if (tool === 'fill') {
        fill(x, y, pack(color));
        draw();
        frs();
        sheet();
        sv();
        return;
    }
    drag = {
        x0: x, y0: y, lx: x, ly: y, snap: c.slice()
    };
    stamp(x, y);
    draw();
};

cv.onpointermove = e => {
    if (ptrs.has(e.pointerId)) {
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (ptrs.size >= 2 && pm) {
        const n = pinfo();
        const st = $('#stage');
        zoomBy(n.d / pm.d);
        st.scrollLeft -= n.x - pm.x;
        st.scrollTop -= n.y - pm.y;
        pm = n;
        return;
    }
    const [x, y] = xy(e);
    $('#pos').textContent = inb(x, y) ? x + ', ' + y : '';
    if (!drag) {
        return;
    }
    if (drag.sel) {
        const cx = Math.max(0, Math.min(W - 1, x));
        const cy = Math.max(0, Math.min(H - 1, y));
        sel = {
            x: Math.min(drag.x0, cx), y: Math.min(drag.y0, cy), w: Math.abs(cx - drag.x0) + 1, h: Math.abs(cy - drag.y0) + 1
        };
    }
    else if (drag.mv) {
        const c = cel();
        const r = {
            x: drag.r0.x + x - drag.x0, y: drag.r0.y + y - drag.y0, w: drag.r0.w, h: drag.r0.h
        };
        c.set(drag.base);
        putReg(c, r, drag.buf, false);
        sel = r;
    }
    else if (tool === 'pencil' || tool === 'eraser') {
        ln(drag.lx, drag.ly, x, y, stamp);
        drag.lx = x;
        drag.ly = y;
    }
    else {
        cel().set(drag.snap);
        shape(drag.x0, drag.y0, x, y);
    }
    draw();
};

cv.onpointerup = cv.onpointercancel = e => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) {
        pm = null;
    }
    if (drag) {
        if (drag.sel && sel && sel.w * sel.h <= 1) {
            sel = null;
        }
        drag = null;
        frs();
        sheet();
        sv();
        draw();
    }
};

function ur(a, b) {
    const s = a.pop();
    if (!s || !frames[s.f] || !frames[s.f].c[s.l]) {
        return;
    }
    const c = frames[s.f].c[s.l];
    b.push({ f: s.f, l: s.l, d: c.slice() });
    c.set(s.d);
    cf = s.f;
    cl = s.l;
    all();
    sv();
}

$('#undo').onclick = () => ur(undo, redo);
$('#redo').onclick = () => ur(redo, undo);
const struct = () => {
    undo = [];
    redo = [];
    all();
    sv();
};

$('#fa').onclick = () => {
    frames.splice(cf + 1, 0, { c: layers.map(() => new Uint32Array(W * H)) });
    cf++;
    struct();
};

$('#fd').onclick = () => {
    frames.splice(cf + 1, 0, { c: frames[cf].c.map(a => a.slice()) });
    cf++;
    struct();
};

$('#fx').onclick = () => {
    if (frames.length < 2) {
        return toast('Keep at least one frame');
    }
    frames.splice(cf, 1);
    cf = Math.min(cf, frames.length - 1);
    struct();
};

$('#la').onclick = () => {
    layers.push({ n: 'Layer ' + (++lc), v: true });
    frames.forEach(f => f.c.push(new Uint32Array(W * H)));
    cl = layers.length - 1;
    struct();
};

$('#lx').onclick = () => {
    if (layers.length < 2) {
        return toast('Keep at least one layer');
    }
    layers.splice(cl, 1);
    frames.forEach(f => f.c.splice(cl, 1));
    cl = Math.min(cl, layers.length - 1);
    struct();
};

function mv(d) {
    const j = cl + d;
    if (j < 0 || j >= layers.length) {
        return;
    }
    [layers[cl], layers[j]] = [layers[j], layers[cl]];
    frames.forEach(f => [f.c[cl], f.c[j]] = [f.c[j], f.c[cl]]);
    cl = j;
    struct();
}

$('#lu').onclick = () => mv(1);
$('#ld').onclick = () => mv(-1);
$('#gr').onchange = e => {
    grid = e.target.checked;
    draw();
};

function setPlay(on, r) {
    clearInterval(timer);
    timer = null;
    if (on) {
        const a = r ? r[0] : 0;
        const b = r ? r[1] : frames.length - 1;
        if (b <= a) {
            toast('Add a frame to preview animation');
        }
        else {
            if (cf < a || cf > b) {
                cf = a;
            }
            timer = setInterval(() => {
                cf = cf >= b ? a : cf + 1;
                draw();
                frs();
            }, 1000 / ((r && r[2]) || fps));
        }
    }
    $('#pl').textContent = timer ? 'Stop' : 'Play';
    $('#pl').classList.toggle('on', !!timer);
}

$('#pl').onclick = () => setPlay(!timer);
$('#fps').oninput = e => {
    fps = +e.target.value;
    $('#fpv').textContent = fps + ' fps';
    if (timer) {
        setPlay(true);
    }
    sv();
};

function save(name, data) {
    const b = data instanceof Blob ? data : new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Saved ' + name);
}

const png = c => new Promise(r => c.toBlob(r, 'image/png'));

const num = id => Math.max(0, Math.min(64, Math.round(+$(id).value) || 0));

function lay(s, p = num('#sd'), m = num('#sm')) {
    const n = frames.length;
    const k = num('#sk');
    const cols = k ? Math.min(k, n) : n;
    const rows = Math.ceil(n / cols);
    const fw = W * s;
    const fh = H * s;
    return {
        n, cols, rows, p, m, fw, fh, w: m * 2 + cols * fw + (cols - 1) * p, h: m * 2 + rows * fh + (rows - 1) * p
    };
}

const fx = (L, i) => ({ x: L.m + (i % L.cols) * (L.fw + L.p), y: L.m + Math.floor(i / L.cols) * (L.fh + L.p) });

function bg(c, w, h) {
    if (!$('#tr').checked) {
        c.fillStyle = $('#bgc').value;
        c.fillRect(0, 0, w, h);
    }
}

function sheetC(s, p, m) {
    const L = lay(s, p, m);
    const o = mk(L.w, L.h);
    const c = o.getContext('2d');
    c.imageSmoothingEnabled = false;
    bg(c, L.w, L.h);
    frames.forEach((_, i) => {
        const q = fx(L, i);
        c.drawImage(comp(i), q.x, q.y, L.fw, L.fh);
    });
    return o;
}

function sheet() {
    const s = +$('#sc').value;
    const o = sheetC(1, Math.round(num('#sd') / s), Math.round(num('#sm') / s));
    const sp = $('#sp');
    const L = lay(s);
    sp.width = o.width;
    sp.height = o.height;
    sp.getContext('2d').drawImage(o, 0, 0);
    $('#si').textContent = L.cols + ' × ' + L.rows + ' grid, ' + L.w + ' × ' + L.h + ' px';
}

$('#ef').onclick = async () => {
    const s = +$('#sc').value;
    const o = mk(W * s, H * s);
    const c = o.getContext('2d');
    c.imageSmoothingEnabled = false;
    bg(c, o.width, o.height);
    c.drawImage(comp(cf), 0, 0, o.width, o.height);
    save('sprite-frame-' + (cf + 1) + '.png', await png(o));
};

$('#es').onclick = async () => save('spritesheet.png', await png(sheetC(+$('#sc').value, num('#sd'), num('#sm'))));
$('#ej').onclick = () => {
    const L = lay(+$('#sc').value);
    save('spritesheet.json', JSON.stringify({
        image: 'spritesheet.png', frameWidth: L.fw, frameHeight: L.fh, frameCount: L.n, columns: L.cols, rows: L.rows, padding: L.p, margin: L.m, sheetWidth: L.w, sheetHeight: L.h, fps, frames: frames.map((_, i) => ({ ...fx(L, i), w: L.fw, h: L.fh })), animations: tags.map(t => ({
            name: t.n, start: t.a, end: t.b, fps: t.f || fps
        })), godot: { hframes: L.cols, vframes: L.rows }
    }, null, 2));
};

['#sk', '#sd', '#sm', '#sc', '#tr', '#bgc'].forEach(i => $(i).addEventListener('input', () => {
    $('#bgc').disabled = $('#tr').checked;
    sheet();
}));


function ser() {
    const e = a => {
        let s = '';
        const u = new Uint8Array(a.buffer);
        for (let i = 0; i < u.length; i += 8192) {
            s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
        }
        return btoa(s);
    };
    return JSON.stringify({
        W, H, fps, lc, pal: PAL, tags, layers, frames: frames.map(f => f.c.map(e))
    });
}

function des(j) {
    const o = JSON.parse(j);
    if (!o.W || !o.layers.length || !o.frames.length) {
        throw 0;
    }
    W = o.W;
    H = o.H || o.W;
    tags = o.tags || [];
    sel = null;
    fps = o.fps || 8;
    if (o.pal && o.pal.length) {
        PAL.splice(0, PAL.length, ...o.pal);
    }
    lc = o.lc || o.layers.length;
    layers = o.layers;
    frames = o.frames.map(f => ({ c: f.map(s => {
            const b = atob(s);
            const u = new Uint8Array(b.length);
            for (let i = 0; i < b.length; i++) {
                u[i] = b.charCodeAt(i);
            }
            return new Uint32Array(u.buffer);
        }) }));
    cf = cl = 0;
}

function sv() {
    clearTimeout(st);
    st = setTimeout(() => {
        try {
            localStorage.setItem(K, ser());
        }
        catch (e) { }
    }, 400);
}

function fresh(w, h) {
    try {
        if (frames) {
            localStorage.setItem(K + '-prev', ser());
        }
    }
    catch (e) { }
    W = w;
    H = h;
    layers = [{ n: 'Layer 1', v: true }];
    lc = 1;
    frames = [{ c: [new Uint32Array(W * H)] }];
    tags = [];
    sel = null;
    zm = 1;
    cf = cl = 0;
    undo = [];
    redo = [];
    setPlay(false);
    all();
    sv();
}

document.querySelectorAll('#sz .b').forEach(b => b.onclick = () => {
    fresh(+b.dataset.n, +b.dataset.n);
    toast('New ' + b.dataset.n + '×' + b.dataset.n + ' sprite');
});

$('#cn').onclick = () => {
    const w = Math.max(1, Math.min(256, +$('#cw').value | 0));
    const h = Math.max(1, Math.min(256, +$('#ch').value | 0));
    fresh(w, h);
    toast('New ' + w + '×' + h + ' sprite');
};

let ref = null;
let zm = 1;
let sel = null;
let clip = null;
let tags = [];
let bsz = 1;
let dt = false;
let imp = null;
$('#bs').onchange = e => bsz = +e.target.value;
$('#dt').onchange = e => dt = e.target.checked;
$('#zo').onclick = () => zoomBy(1 / 1.25);
$('#zi').onclick = () => zoomBy(1.25);
$('#zf').onclick = () => {
    zm = 1;
    draw();
};

$('#stage').addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    }
}, { passive: false });

const done = () => {
    draw();
    frs();
    sheet();
    sv();
};

const hid = () => {
    const L = layers[cl];
    if (!L.v || L.k) {
        toast(L.k ? 'This layer is locked' : 'This layer is hidden');
        return true;
    }
    return false;
};

function xf(k) {
    if (hid()) {
        return;
    }
    const r = reg();
    if (k === 'r' && !sel && W !== H) {
        return toast('Select an area to rotate');
    }
    pushU();
    const c = cel();
    const d = getReg(c, r);
    const o = new Uint32Array(d.length);
    const n = { ...r };
    for (let j = 0; j < r.h; j++) {
        for (let i = 0; i < r.w; i++) {
            const v = d[j * r.w + i];
            if (k === 'h') {
                o[j * r.w + (r.w - 1 - i)] = v;
            }
            else if (k === 'v') {
                o[(r.h - 1 - j) * r.w + i] = v;
            }
            else {
                o[i * r.h + (r.h - 1 - j)] = v;
            }
        }
    }
    if (k === 'r') {
        n.w = r.h;
        n.h = r.w;
    }
    putReg(c, r, new Uint32Array(d.length), true);
    putReg(c, n, o, true);
    if (sel) {
        sel = n;
    }
    done();
}

$('#sfh').onclick = () => xf('h');
$('#sfv').onclick = () => xf('v');
$('#srt').onclick = () => xf('r');
const cp = () => {
    const r = reg();
    clip = { w: r.w, h: r.h, d: getReg(cel(), r) };
    toast('Copied');
};

$('#scp').onclick = cp;
$('#scx').onclick = () => {
    if (hid()) {
        return;
    }
    cp();
    pushU();
    putReg(cel(), reg(), new Uint32Array(clip.d.length), true);
    done();
};

$('#spt').onclick = () => {
    if (!clip) {
        return toast('Copy something first');
    }
    if (hid()) {
        return;
    }
    pushU();
    const n = {
        x: sel ? sel.x : 0, y: sel ? sel.y : 0, w: clip.w, h: clip.h
    };
    putReg(cel(), n, clip.d, false);
    sel = n;
    done();
};

$('#sdl').onclick = () => {
    if (hid()) {
        return;
    }
    pushU();
    putReg(cel(), reg(), new Uint32Array(reg().w * reg().h), true);
    done();
};

$('#rf').onclick = () => $('#rff').click();
$('#rff').onchange = e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) {
        return;
    }
    const i = new Image();
    i.onload = () => {
        ref = i;
        draw();
    };
    i.src = URL.createObjectURL(f);
};

$('#ro').oninput = draw;
$('#rc').onclick = () => {
    ref = null;
    draw();
};

$('#tp1').onchange = () => {
    $('#tp').hidden = !$('#tp1').checked;
    draw();
};

function tgs() {
    tags = tags.filter(t => t.a < frames.length);
    tags.forEach(t => t.b = Math.min(t.b, frames.length - 1));
    const el = $('#tg');
    el.innerHTML = '';
    tags.forEach((t, i) => {
        const r = document.createElement('div');
        r.className = 'lr';
        const p = document.createElement('button');
        p.className = 'b ln';
        p.textContent = '▶ ' + t.n + ' (' + (t.a + 1) + '–' + (t.b + 1) + ', ' + (t.f || fps) + ' fps)';
        p.onclick = () => {
            cf = t.a;
            setPlay(true, [t.a, t.b, t.f]);
            frs();
        };
        const x = document.createElement('button');
        x.className = 'b';
        x.textContent = 'Delete';
        x.onclick = () => {
            tags.splice(i, 1);
            tgs();
            sv();
        };
        r.append(p, x);
        el.appendChild(r);
    });
}

$('#tadd').onclick = () => {
    const n = frames.length;
    const a = Math.max(1, Math.min(n, +$('#ta').value | 0 || 1));
    const b = Math.max(a, Math.min(n, +$('#tb').value | 0 || n));
    const f = Math.max(0, Math.min(60, +$('#tf').value | 0));
    tags.push({
        n: $('#tn').value.trim() || 'anim' + (tags.length + 1), a: a - 1, b: b - 1, f
    });
    $('#tn').value = '';
    tgs();
    sv();
};

$('#im').onclick = () => $('#imf').click();
$('#imf').onchange = e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) {
        return;
    }
    const i = new Image();
    i.onload = () => {
        imp = i;
        $('#iw').value = Math.min(256, i.width);
        $('#ih').value = Math.min(256, i.height);
        $('#imr').hidden = false;
        toast('Set the frame size, then slice');
    };
    i.onerror = () => toast("Couldn't read that image");
    i.src = URL.createObjectURL(f);
};

$('#is').onclick = () => {
    if (!imp) {
        return;
    }
    const fw = Math.max(1, Math.min(256, +$('#iw').value | 0 || 1));
    const fh = Math.max(1, Math.min(256, +$('#ih').value | 0 || 1));
    const p = num('#sd');
    const m = num('#sm');
    const cols = Math.max(1, Math.floor((imp.width - m * 2 + p) / (fw + p)));
    const rows = Math.max(1, Math.floor((imp.height - m * 2 + p) / (fh + p)));
    if (cols * rows > 300) {
        return toast('That would make over 300 frames');
    }
    const t = mk(imp.width, imp.height);
    const tc = t.getContext('2d');
    tc.drawImage(imp, 0, 0);
    try {
        localStorage.setItem(K + '-prev', ser());
    }
    catch (_) { }
    W = fw;
    H = fh;
    layers = [{ n: 'Layer 1', v: true }];
    lc = 1;
    frames = [];
    tags = [];
    sel = null;
    zm = 1;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            frames.push({ c: [new Uint32Array(tc.getImageData(m + c * (fw + p), m + r * (fh + p), fw, fh).data.buffer.slice(0))] });
        }
    }
    cf = cl = 0;
    undo = [];
    redo = [];
    setPlay(false);
    all();
    sv();
    $('#imr').hidden = true;
    toast('Sliced ' + frames.length + ' frames');
};

$('#pi').onclick = () => $('#pif').click();
$('#pif').onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) {
        return;
    }
    const out = [];
    for (const l of (await f.text()).split(/\r?\n/)) {
        let m = l.match(/^\s*#?([0-9a-f]{6})\s*$/i);
        if (m) {
            out.push('#' + m[1].toLowerCase());
        }
        else if (m = l.match(/^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/)) {
            out.push('#' + [1, 2, 3].map(i => Math.min(255, +m[i]).toString(16).padStart(2, '0')).join(''));
        }
    }
    if (!out.length) {
        return toast('No colors found in that file');
    }
    PAL.splice(0, PAL.length, ...[...new Set(out)].slice(0, 64));
    setColor(PAL[0]);
    sv();
    toast('Imported ' + PAL.length + ' colors');
};

$('#pe').onclick = () => save('palette.hex', PAL.map(h => h.slice(1)).join('\n'));
$('#pg').onclick = () => save('palette.gpl', 'GIMP Palette\nName: Sprite Loft\nColumns: 8\n#\n' + PAL.map(h => {
    const n = parseInt(h.slice(1), 16);
    return (n >> 16) + ' ' + ((n >> 8) & 255) + ' ' + (n & 255) + '\t' + h;
}).join('\n'));

function lzw(ix) {
    const o = [];
    let b = 0;
    let n = 0;
    let c = 0;
    const e = v => {
        b |= v << n;
        n += 9;
        while (n >= 8) {
            o.push(b & 255);
            b >>= 8;
            n -= 8;
        }
    };
    e(256);
    for (const p of ix) {
        e(p);
        if (++c === 250) {
            e(256);
            c = 0;
        }
    }
    e(257);
    if (n) {
        o.push(b & 255);
    }
    return o;
}

function gifB(fr, w, h, dl, tr) {
    const map = new Map();
    const pl = [[0, 0, 0]];
    let q = false;
    out: for (const d of fr) {
        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 128) {
                continue;
            }
            const k = d[i] << 16 | d[i + 1] << 8 | d[i + 2];
            if (!map.has(k)) {
                if (pl.length > 255) {
                    q = true;
                    break out;
                }
                map.set(k, pl.length);
                pl.push([d[i], d[i + 1], d[i + 2]]);
            }
        }
    }
    if (q) {
        pl.length = 1;
        for (let r = 0; r < 6; r++) {
            for (let g = 0; g < 7; g++) {
                for (let b = 0; b < 6; b++) {
                    pl.push([r * 51, Math.round(g * 255 / 6), b * 51]);
                }
            }
        }
    }
    const ix = d => {
        const o = new Uint8Array(d.length / 4);
        for (let i = 0, j = 0; i < d.length; i += 4, j++) {
            o[j] = d[i + 3] < 128 ? 0 : q ? 1 + Math.round(d[i] / 51) * 42 + Math.round(d[i + 1] * 6 / 255) * 6 + Math.round(d[i + 2] / 51) : map.get(d[i] << 16 | d[i + 1] << 8 | d[i + 2]);
        }
        return o;
    };
    const B = [];
    const u = v => B.push(v & 255, (v >> 8) & 255);
    B.push(71, 73, 70, 56, 57, 97);
    u(w);
    u(h);
    B.push(0xF7, 0, 0);
    for (let i = 0; i < 256; i++) {
        B.push(...(pl[i] || [0, 0, 0]));
    }
    B.push(0x21, 0xFF, 11, ...[...'NETSCAPE2.0'].map(c => c.charCodeAt(0)), 3, 1, 0, 0, 0);
    fr.forEach(d => {
        B.push(0x21, 0xF9, 4, tr ? 9 : 4, dl & 255, dl >> 8, 0, 0, 0x2C);
        u(0);
        u(0);
        u(w);
        u(h);
        B.push(0, 8);
        const z = lzw(ix(d));
        for (let i = 0; i < z.length; i += 255) {
            const p = z.slice(i, i + 255);
            B.push(p.length, ...p);
        }
        B.push(0);
    });
    B.push(0x3B);
    return new Uint8Array(B);
}

$('#eg').onclick = () => {
    const s = +$('#sc').value;
    const w = W * s;
    const h = H * s;
    const fr = frames.map((_, i) => {
        const o = mk(w, h);
        const c = o.getContext('2d');
        c.imageSmoothingEnabled = false;
        bg(c, w, h);
        c.drawImage(comp(i), 0, 0, w, h);
        return c.getImageData(0, 0, w, h).data;
    });
    save('sprite.gif', new Blob([gifB(fr, w, h, Math.max(2, Math.round(100 / fps)), $('#tr').checked)], { type: 'image/gif' }));
};

// ===== Color editor, project buttons =====
$('#hx').oninput = e => {
    let v = e.target.value.trim().replace(/^#?/, '#');
    if (/^#[0-9a-f]{3}$/i.test(v)) {
        v = '#' + [...v.slice(1)].map(c => c + c).join('');
    }
    if (/^#[0-9a-f]{6}$/i.test(v)) {
        setColor(v, 'hx');
    }
};

['#cr', '#cg', '#cb'].forEach(i => $(i).oninput = () => {
    const g = id => Math.max(0, Math.min(255, Math.round(+$(id).value) || 0));
    setColor('#' + [g('#cr'), g('#cg'), g('#cb')].map(x => x.toString(16).padStart(2, '0')).join(''), 'rgb');
});

$('#cp').oninput = e => setColor(e.target.value);
$('#pa').onclick = () => {
    if (!PAL.includes(color) && PAL.length < 48) {
        PAL.push(color);
    }
    pal();
    sv();
};

$('#pr').onclick = () => {
    const i = PAL.indexOf(color);
    if (i > -1 && PAL.length > 1) {
        PAL.splice(i, 1);
        pal();
        sv();
    }
};

$('#mx').onchange = e => mx = e.target.checked;
$('#my').onchange = e => my = e.target.checked;

function fm(d) {
    const j = cf + d;
    if (j < 0 || j >= frames.length) {
        return;
    }
    [frames[cf], frames[j]] = [frames[j], frames[cf]];
    cf = j;
    struct();
}

$('#fml').onclick = () => fm(-1);
$('#fmr').onclick = () => fm(1);
$('#ps').onclick = () => save('sprite-project.json', ser());
$('#po').onclick = () => $('#pf').click();
$('#pf').onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) {
        return;
    }
    const prev = ser();
    try {
        des(await f.text());
        setPlay(false);
        undo = [];
        redo = [];
        $('#fps').value = fps;
        $('#fpv').textContent = fps + ' fps';
        all();
        sv();
        toast('Opened ' + f.name);
    }
    catch (_) {
        try {
            des(prev);
        }
        catch (_2) { }
        all();
        toast("That file isn't a Sprite Loft project");
    }
};

const layerRefresh = () => {
    draw();
    frs();
    lys();
    sheet();
    sv();
};

$('#lname').onchange = e => {
    layers[cl].n = e.target.value.trim().slice(0, 24) || 'Layer ' + (cl + 1);
    lys();
    sv();
};

$('#lop').oninput = e => {
    layers[cl].o = +e.target.value;
    $('#lopv').textContent = e.target.value + '%';
    draw();
    frs();
    sheet();
    sv();
};

$('#lblend').onchange = e => {
    layers[cl].m = e.target.value;
    layerRefresh();
};

$('#llock').onchange = e => {
    layers[cl].k = e.target.checked;
    lys();
    sv();
};

$('#ldup').onclick = () => {
    const L = layers[cl];
    layers.splice(cl + 1, 0, { ...L, n: L.n + ' copy', k: false });
    frames.forEach(f => f.c.splice(cl + 1, 0, f.c[cl].slice()));
    cl++;
    struct();
};

$('#lmerge').onclick = () => {
    if (cl === 0) {
        return toast('There is no layer below to merge into');
    }
    const up = layers[cl];
    const img = a => new ImageData(new Uint8ClampedArray(a.buffer.slice(0)), W, H);
    frames.forEach(f => {
        const base = mk(W, H);
        const bx = base.getContext('2d');
        const tmp = mk(W, H);
        const tx = tmp.getContext('2d');
        tx.putImageData(img(f.c[cl - 1]), 0, 0);
        bx.drawImage(tmp, 0, 0);
        if (up.v) {
            tx.putImageData(img(f.c[cl]), 0, 0);
            bx.globalAlpha = (up.o ?? 100) / 100;
            bx.globalCompositeOperation = up.m || 'source-over';
            bx.drawImage(tmp, 0, 0);
        }
        f.c[cl - 1] = new Uint32Array(bx.getImageData(0, 0, W, H).data.buffer.slice(0));
        f.c.splice(cl, 1);
    });
    layers.splice(cl, 1);
    cl--;
    struct();
};

$('#lclr').onclick = () => {
    if (hid()) {
        return;
    }
    pushU();
    cel().fill(0);
    done();
};

$('#lsel').onclick = () => {
    const c = cel();
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (c[y * W + x] >>> 24) {
                x0 = Math.min(x0, x);
                x1 = Math.max(x1, x);
                y0 = Math.min(y0, y);
                y1 = Math.max(y1, y);
            }
        }
    }
    if (x1 < 0) {
        return toast('This layer is empty on this frame');
    }
    sel = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    draw();
    toast('Selected the layer pixels');
};

$('#lsolo').onclick = () => {
    layers.forEach((L, i) => L.v = i === cl);
    layerRefresh();
};

$('#lall').onclick = () => {
    layers.forEach(L => L.v = true);
    layerRefresh();
};

addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) {
        return;
    }
    const k = e.key.toLowerCase();
    const m = e.ctrlKey || e.metaKey;
    if (m && k === 'z') {
        e.preventDefault();
        e.shiftKey ? ur(redo, undo) : ur(undo, redo);
    }
    else if (m && k === 'y') {
        e.preventDefault();
        ur(redo, undo);
    }
    else if (m && k === 'c') {
        e.preventDefault();
        $('#scp').click();
    }
    else if (m && k === 'x') {
        e.preventDefault();
        $('#scx').click();
    }
    else if (m && k === 'v') {
        e.preventDefault();
        $('#spt').click();
    }
    else if (k === 'delete' || k === 'backspace') {
        $('#sdl').click();
    }
    else if (k === '+' || k === '=') {
        zoomBy(1.25);
    }
    else if (k === '-') {
        zoomBy(1 / 1.25);
    }
    else if (!m) {
        const t = {
            b: 'pencil', e: 'eraser', g: 'fill', i: 'pick', l: 'line', r: 'rect', c: 'circle', s: 'select', m: 'move'
        }[k];
        if (t) {
            setTool(t);
        }
        else if (k === ' ') {
            e.preventDefault();
            setPlay(!timer);
        }
    }
});

addEventListener('resize', draw);

try {
    des(localStorage.getItem(K));
    $('#fps').value = fps;
    $('#fpv').textContent = fps + ' fps';
    all();
}

catch (e) {
    fresh(32, 32);
}

if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
}