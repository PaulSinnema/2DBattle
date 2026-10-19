// 2DBattle - 2D pixel platform shooter (Canvas 2D)
const W = 960, H = 540, PX = 3, BOSS_PX = 6;
const GRAVITY = 1500, MOVE_SPEED = 260, JUMP_V = 640, GROUND_Y = 500;
const MAX_LEVEL = 8, START_HP = 10, MEDKIT_HP = 3, MEDKIT_CHANCE = 0.35, MAX_CRATES = 3;

// Weapon stats: dmg = player damage, edmg = enemy damage to player
const WEAPONS = {
    pistol:  { name: 'Pistool', dmg: 1, edmg: 1, rate: 0.35, speed: 700, spread: 0.03, pellets: 1, ammo: Infinity, color: '#ffe066', size: 3, len: 4, gun: '#8a8a8a', life: 1.4 },
    smg:     { name: 'Uzi', dmg: 1, edmg: 1, rate: 0.09, speed: 760, spread: 0.08, pellets: 1, ammo: 60, color: '#ffd23f', size: 3, len: 5, gun: '#4a4a4a', life: 1.2 },
    shotgun: { name: 'Shotgun', dmg: 1, edmg: 1, rate: 0.8, speed: 650, spread: 0.22, pellets: 6, epellets: 3, ammo: 12, color: '#ff9f43', size: 3, len: 7, gun: '#8b5a2b', life: 0.45 },
    rifle:   { name: 'Geweer', dmg: 3, edmg: 2, rate: 0.7, speed: 1100, spread: 0, pellets: 1, ammo: 15, color: '#ffffff', size: 4, len: 9, gun: '#6b4a2b', life: 1.2 },
    laser:   { name: 'Laser', dmg: 2, edmg: 1, rate: 0.2, speed: 1300, spread: 0, pellets: 1, ammo: 30, color: '#4dfcff', size: 3, len: 6, gun: '#2bb5b5', life: 1, beam: true },
    rocket:  { name: 'Raketwerper', dmg: 4, edmg: 3, rate: 1.1, speed: 450, spread: 0, pellets: 1, ammo: 6, color: '#ff5a3c', size: 6, len: 8, gun: '#4a6b3a', life: 2.5, explode: 70 },
};
const CRATE_WEAPONS = ['smg', 'shotgun', 'rifle', 'laser', 'rocket'];
const ENEMY_WEAPONS = ['pistol', 'smg', 'shotgun', 'rifle', 'laser', 'rocket'];
const ENEMY_BODY = { pistol: '#8a3b3b', smg: '#8a6a2b', shotgun: '#6a3b8a', rifle: '#5a5a5a', laser: '#2b7a7a', rocket: '#b0502b' };

// Platform layouts: [x, y, width]
const LAYOUTS = [
    [[80, 400, 200], [380, 330, 200], [680, 400, 200], [230, 240, 160], [570, 240, 160], [400, 150, 160]],
    [[60, 410, 160], [300, 360, 140], [520, 410, 160], [760, 350, 160], [150, 270, 180], [450, 230, 160], [700, 200, 180]],
    [[0, 380, 180], [780, 380, 180], [300, 400, 360], [200, 260, 160], [600, 260, 160], [400, 160, 160]],
    [[100, 420, 140], [300, 350, 140], [500, 280, 140], [700, 210, 140], [120, 260, 160], [740, 400, 160]],
];
const BOSS_LAYOUT = [[60, 400, 180], [720, 400, 180], [330, 320, 300], [120, 230, 160], [680, 230, 160], [400, 150, 160]];

// Pixel sprites (facing right)
const HUMAN = [
    '...hhhh...',
    '..hhhhhhh.',
    '..ssssse..',
    '..sssssss.',
    '...ssss...',
    '..bbbbbb..',
    '.bbbbbbbb.',
    '.sbbbbbbs.',
    '.sbbbbbbs.',
    '..pppppp..',
];
const LEGS = [
    ['..pp..pp..', '..pp..pp..', '..pp..pp..', '.kkk..kkk.'],
    ['..pp..pp..', '.pp....pp.', '.pp....pp.', 'kkk....kkk'],
];
const BOSS = [
    '....hhhhhh....',
    '...hhhhhhhh...',
    '..hhhhhhhhhh..',
    '..ssssssssss..',
    '..sseesseess..',
    '..ssssssssss..',
    '..ssmmmmmmss..',
    '...ssssssss...',
    '.bbbbbbbbbbbb.',
    'bbbbaabbaabbbb',
    'bbbbbbbbbbbbbb',
    'ssbbbbbbbbbbss',
    '..pppppppppp..',
    '..ppp....ppp..',
    '..ppp....ppp..',
    '.kkkk....kkkk.',
];
const PLAYER_PAL = { h: '#2b6cb0', s: '#f2c18d', e: '#111', b: '#3c8d3c', p: '#2d3a4a', k: '#222' };
const ENEMY_PAL = { h: '#a83232', s: '#d9a066', e: '#111', p: '#3a2a2a', k: '#111' };
const BOSS_PAL = { h: '#3a1a4a', s: '#7a9a5a', e: '#ff2020', m: '#200', b: '#4a2a6a', a: '#c0a020', p: '#2a2a3a', k: '#111' };

let canvas, ctx, bg, dotnet, audio;
let state = 'start', level = 1, player;
let enemies = [], bullets = [], crates = [], pickups = [], particles = [], texts = [], platforms = [];
let toSpawn = 0, spawnTimer = 0, crateTimer = 0, levelTimer = 0, bossPending = false, bossTimer = 0, boss = null;
let shake = 0, lastTime = 0, lastStatus = '';
const keys = {};

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const center = e => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });

function sfx(type) {
    if (!audio) return;
    const cfg = {
        shoot: [880, 220, 0.08, 'square', 0.04], eshoot: [500, 150, 0.08, 'square', 0.02],
        hit: [200, 80, 0.1, 'square', 0.06], boom: [120, 30, 0.4, 'sawtooth', 0.12],
        jump: [300, 600, 0.12, 'square', 0.03], pick: [600, 1200, 0.15, 'triangle', 0.08],
        hurt: [160, 60, 0.2, 'sawtooth', 0.1], level: [400, 900, 0.4, 'triangle', 0.1],
    }[type];
    if (!cfg) return;
    try {
        const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
        o.type = cfg[3];
        o.frequency.setValueAtTime(cfg[0], t);
        o.frequency.exponentialRampToValueAtTime(cfg[1], t + cfg[2]);
        g.gain.setValueAtTime(cfg[4], t);
        g.gain.exponentialRampToValueAtTime(0.001, t + cfg[2]);
        o.connect(g).connect(audio.destination);
        o.start(t);
        o.stop(t + cfg[2]);
    } catch { }
}

function particle(x, y, color, speed, life, size) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, life, max: life, color, size });
}

function floatText(x, y, text, color) {
    texts.push({ x, y, text, color, life: 1.2 });
}

// ---------- entities ----------
function newPlayer() {
    return { x: 100, y: GROUND_Y - 14 * PX, w: 10 * PX, h: 14 * PX, vx: 0, vy: 0, face: 1, hp: START_HP,
        weapon: 'pistol', ammo: Infinity, cool: 0, inv: 0, dropTimer: 0, anim: 0, scale: PX, hand: 7,
        onGround: false, platform: null, jumpHeld: false };
}

function spawnEnemy() {
    const pool = ENEMY_WEAPONS.slice(0, Math.min(ENEMY_WEAPONS.length, level + 1));
    const weapon = pool[Math.floor(Math.random() * pool.length)];
    const leftSide = player.x > W / 2;
    const x = leftSide ? rand(20, 220) : rand(W - 250, W - 50);
    const hp = 2 + Math.floor(level / 2);
    enemies.push({ x, y: -60, w: 10 * PX, h: 14 * PX, vx: 0, vy: 0, face: -1, hp, maxHp: hp, weapon,
        cool: rand(1, 2), think: 0, flash: 0, dropTimer: 0, anim: 0, scale: PX, hand: 7,
        pal: { ...ENEMY_PAL, b: ENEMY_BODY[weapon] }, onGround: false, platform: null });
}

function spawnBoss() {
    const hp = 80;
    boss = { x: W - 160, y: -120, w: 14 * BOSS_PX, h: 16 * BOSS_PX, vx: 0, vy: 0, face: -1, hp, maxHp: hp,
        weapon: 'rocket', cool: 2, think: 0, flash: 0, dropTimer: 0, anim: 0, scale: BOSS_PX, hand: 10,
        pal: BOSS_PAL, boss: true, pattern: 0, burst: 0, burstTimer: 0, onGround: false, platform: null };
    enemies.push(boss);
    shake = 0.4;
    floatText(W / 2, 200, 'EINDBAAS!', '#ff4d4d');
}

function placeCrate() {
    const free = platforms.filter(p => !p.ground && !crates.some(c => c.p === p));
    if (!free.length) return;
    const p = free[Math.floor(Math.random() * free.length)];
    crates.push({ p, x: p.x + p.w / 2 - 12, y: p.y - 24, w: 24, h: 24, t: Math.random() * 6 });
}

function buildPlatforms(layout) {
    return [{ x: 0, y: GROUND_Y, w: W, h: H - GROUND_Y, ground: true },
        ...layout.map(([x, y, w]) => ({ x, y, w, h: 12, ground: false }))];
}

function setupLevel() {
    platforms = buildPlatforms(level === MAX_LEVEL ? BOSS_LAYOUT : LAYOUTS[(level - 1) % LAYOUTS.length]);
    enemies = []; bullets = []; pickups = []; crates = [];
    boss = null;
    toSpawn = level === MAX_LEVEL ? 6 : 2 + level * 2;
    bossPending = level === MAX_LEVEL;
    bossTimer = 2.5;
    spawnTimer = 1.5;
    crateTimer = 10;
    for (let i = 0; i < MAX_CRATES; i++) placeCrate();
    Object.assign(player, { x: 60, y: GROUND_Y - player.h, vx: 0, vy: 0, inv: 1 });
    state = 'playing';
}

// ---------- physics ----------
function physics(e, dt) {
    e.vy += GRAVITY * dt;
    e.x = clamp(e.x + e.vx * dt, 0, W - e.w);
    const prevBottom = e.y + e.h;
    e.y += e.vy * dt;
    e.onGround = false;
    if (e.vy >= 0) {
        for (const p of platforms) {
            if (e.dropTimer > 0 && !p.ground) continue;
            if (e.x + e.w > p.x && e.x < p.x + p.w && prevBottom <= p.y + 1 && e.y + e.h >= p.y) {
                e.y = p.y - e.h;
                e.vy = 0;
                e.onGround = true;
                e.platform = p;
                break;
            }
        }
    }
}

// ---------- weapons ----------
function muzzle(e) {
    const w = WEAPONS[e.weapon], s = e.scale, len = w.len * s;
    return { x: e.face > 0 ? e.x + e.w - s + len : e.x + s - len, y: e.y + e.hand * s + s };
}

function fire(e, isPlayer, angle) {
    const w = WEAPONS[e.weapon];
    const m = muzzle(e);
    const n = isPlayer ? w.pellets : (w.epellets ?? w.pellets);
    const speed = w.speed * (isPlayer ? 1 : 0.6);
    for (let i = 0; i < n; i++) {
        const a = angle + (Math.random() - 0.5) * 2 * w.spread;
        bullets.push({ x: m.x, y: m.y, vx: Math.cos(a) * speed * e.face, vy: Math.sin(a) * speed,
            life: w.life, dmg: isPlayer ? w.dmg : w.edmg, owner: isPlayer ? 'player' : 'enemy',
            color: w.color, size: w.size, explode: w.explode || 0, beam: !!w.beam });
    }
    for (let i = 0; i < 3; i++) particle(m.x, m.y, '#fff3a0', 80, 0.1, 3);
    sfx(isPlayer ? 'shoot' : 'eshoot');
    if (isPlayer && e.ammo !== Infinity) {
        e.ammo--;
        if (e.ammo <= 0) {
            e.weapon = 'pistol';
            e.ammo = Infinity;
            floatText(e.x + e.w / 2, e.y - 10, 'Leeg!', '#ff9f43');
        }
    }
}

function explode(x, y, r, dmg, owner) {
    sfx('boom');
    shake = Math.max(shake, 0.25);
    const colors = ['#ff5a3c', '#ffd23f', '#ffffff', '#ff9f43'];
    for (let i = 0; i < 30; i++) particle(x, y, colors[i % colors.length], 320, rand(0.3, 0.7), 4);
    if (owner === 'player') {
        for (const en of enemies) {
            const c = center(en);
            if (Math.hypot(c.x - x, c.y - y) < r + en.w / 2) hurtEnemy(en, dmg);
        }
    } else {
        const c = center(player);
        if (Math.hypot(c.x - x, c.y - y) < r + player.w / 2) hurtPlayer(dmg);
    }
}

function hurtPlayer(dmg) {
    if (player.inv > 0 || state !== 'playing') return;
    player.hp = Math.max(0, player.hp - dmg);
    player.inv = 0.4;
    shake = Math.max(shake, 0.2);
    sfx('hurt');
    floatText(player.x + player.w / 2, player.y - 8, '-' + dmg, '#ff4d4d');
    for (let i = 0; i < 10; i++) particle(player.x + player.w / 2, player.y + player.h / 2, '#c0392b', 160, 0.4, 3);
    if (player.hp <= 0) {
        state = 'gameover';
        for (let i = 0; i < 40; i++) particle(player.x + player.w / 2, player.y + player.h / 2, '#c0392b', 300, 0.8, 4);
    }
}

function hurtEnemy(en, dmg) {
    if (en.dead) return;
    en.hp -= dmg;
    en.flash = 0.1;
    sfx('hit');
    for (let i = 0; i < 5; i++) particle(en.x + en.w / 2, en.y + en.h / 2, '#c0392b', 140, 0.3, 3);
    if (en.hp > 0) return;
    en.dead = true;
    const c = center(en);
    for (let i = 0; i < (en.boss ? 80 : 25); i++) particle(c.x, c.y, i % 2 ? en.pal.b : '#c0392b', en.boss ? 420 : 240, rand(0.4, 0.9), 4);
    if (en.boss) {
        boss = null;
        shake = 0.6;
        sfx('boom');
        state = 'win';
        return;
    }
    if (Math.random() < MEDKIT_CHANCE)
        pickups.push({ x: c.x - 9, y: en.y + en.h - 16, w: 18, h: 16, vx: 0, vy: -250, dropTimer: 0, t: 0 });
}

function bossFire(b, angle) {
    const pattern = b.pattern++ % 3;
    if (pattern === 0) {
        b.weapon = 'rocket';
        fire(b, false, angle - 0.15);
        fire(b, false, angle);
        fire(b, false, angle + 0.15);
        b.cool = 1.8;
    } else if (pattern === 1) {
        b.weapon = 'shotgun';
        for (let i = 0; i < 3; i++) fire(b, false, angle + (i - 1) * 0.12);
        b.cool = 1.4;
    } else {
        b.weapon = 'smg';
        b.burst = 10;
        b.burstTimer = 0;
        b.cool = 2;
    }
}

// ---------- update ----------
function updatePlayer(dt) {
    const p = player;
    p.cool -= dt; p.inv -= dt; p.dropTimer -= dt;
    const left = keys.ArrowLeft || keys.KeyA, right = keys.ArrowRight || keys.KeyD;
    const jump = keys.ArrowUp || keys.KeyW, down = keys.ArrowDown || keys.KeyS;
    const shoot = keys.Space || keys.KeyJ || keys.KeyX || keys.Mouse;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir) p.face = dir;
    p.vx = dir * MOVE_SPEED;
    if (jump && !p.jumpHeld && p.onGround) { p.vy = -JUMP_V; sfx('jump'); }
    p.jumpHeld = jump;
    if (down && p.onGround && p.platform && !p.platform.ground) p.dropTimer = 0.25;
    physics(p, dt);
    p.anim = dir && p.onGround ? p.anim + dt : 0;

    if (shoot && p.cool <= 0 && state === 'playing') {
        const rate = WEAPONS[p.weapon].rate;
        fire(p, true, 0);
        p.cool = rate;
    }

    for (const c of crates) {
        if (!overlap(p, c)) continue;
        c.opened = true;
        const options = CRATE_WEAPONS.filter(k => k !== p.weapon);
        p.weapon = options[Math.floor(Math.random() * options.length)];
        p.ammo = WEAPONS[p.weapon].ammo;
        sfx('pick');
        floatText(c.x + 12, c.y - 6, WEAPONS[p.weapon].name + '!', '#ffd23f');
        for (let i = 0; i < 15; i++) particle(c.x + 12, c.y + 12, '#c8a063', 200, 0.5, 3);
    }
    crates = crates.filter(c => !c.opened);
}

function updateEnemy(en, dt) {
    en.cool -= dt; en.think -= dt; en.flash -= dt; en.dropTimer -= dt;
    const pc = center(player), ec = center(en);
    const dx = pc.x - ec.x, dy = pc.y - ec.y, adx = Math.abs(dx);

    if (en.think <= 0) {
        en.think = rand(0.5, 1.3);
        const spd = en.boss ? 110 : rand(90, 150) + level * 6;
        if (adx > 320) en.vx = Math.sign(dx) * spd;
        else if (adx < 110) en.vx = -Math.sign(dx) * spd * 0.7;
        else en.vx = Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1) * spd * 0.6;
        if (en.onGround && dy < -60 && Math.random() < 0.6) {
            en.vy = -JUMP_V * (en.boss ? 1.05 : 1);
            en.vx = Math.sign(dx) * spd;
        } else if (en.onGround && dy > 60 && en.platform && !en.platform.ground && Math.random() < 0.5) {
            en.dropTimer = 0.25;
        }
    }

    en.face = dx >= 0 ? 1 : -1;
    physics(en, dt);
    if (en.x <= 0 || en.x + en.w >= W) en.vx = -en.vx;
    if (Math.abs(en.vx) > 1 && en.onGround) en.anim += dt;

    if (state !== 'playing') return;
    const angle = clamp(Math.atan2(dy, adx), -0.35, 0.35);

    if (en.boss) {
        if (en.burst > 0) {
            en.burstTimer -= dt;
            if (en.burstTimer <= 0) { fire(en, false, angle); en.burst--; en.burstTimer = 0.09; }
        } else if (en.cool <= 0 && adx < 700) {
            bossFire(en, angle);
        }
        if (overlap(en, player)) hurtPlayer(2);
        return;
    }

    if (en.cool <= 0 && adx < 560 && Math.abs(dy) < 160) {
        fire(en, false, angle);
        en.cool = Math.max(0.5, WEAPONS[en.weapon].rate * 2.5 + rand(0.6, 1.4) - level * 0.05);
    }
}

function updateBullets(dt) {
    for (const b of bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H) { b.dead = true; continue; }
        if (b.explode && b.y >= GROUND_Y) { b.dead = true; explode(b.x, b.y, b.explode, b.dmg, b.owner); continue; }
        const hitBox = { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };
        if (b.owner === 'player') {
            for (const en of enemies) {
                if (en.dead || !overlap(hitBox, en)) continue;
                b.dead = true;
                if (b.explode) explode(b.x, b.y, b.explode, b.dmg, 'player');
                else hurtEnemy(en, b.dmg);
                break;
            }
        } else if (overlap(hitBox, player)) {
            b.dead = true;
            if (b.explode) explode(b.x, b.y, b.explode, b.dmg, 'enemy');
            else hurtPlayer(b.dmg);
        }
        if (!b.dead && b.life <= 0) {
            b.dead = true;
            if (b.explode) explode(b.x, b.y, b.explode, b.dmg, b.owner);
        }
    }
    bullets = bullets.filter(b => !b.dead);
}

function updatePickups(dt) {
    for (const m of pickups) {
        m.t += dt;
        physics(m, dt);
        if (state === 'playing' && overlap(m, player)) {
            m.taken = true;
            player.hp += MEDKIT_HP;
            sfx('pick');
            floatText(m.x + 9, m.y - 6, '+' + MEDKIT_HP + ' HP', '#4cff4c');
        }
    }
    pickups = pickups.filter(m => !m.taken);
}

function updateParticles(dt) {
    for (const p of particles) {
        p.vy += 600 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
    for (const t of texts) { t.y -= 30 * dt; t.life -= dt; }
    texts = texts.filter(t => t.life > 0);
}

function update(dt) {
    updatePlayer(dt);
    if (state === 'playing') {
        spawnTimer -= dt;
        const alive = enemies.filter(e => !e.boss).length;
        if (toSpawn > 0 && spawnTimer <= 0 && alive < Math.min(3 + level, 8)) {
            spawnEnemy();
            toSpawn--;
            spawnTimer = Math.max(0.6, 2 - level * 0.15);
        }
        if (bossPending) {
            bossTimer -= dt;
            if (bossTimer <= 0) { bossPending = false; spawnBoss(); }
        }
        crateTimer -= dt;
        if (crateTimer <= 0) {
            crateTimer = 10;
            if (crates.length < MAX_CRATES) placeCrate();
        }
    }
    for (const en of enemies) updateEnemy(en, dt);
    updateBullets(dt);
    enemies = enemies.filter(e => !e.dead);
    updatePickups(dt);

    if (state === 'playing' && level < MAX_LEVEL && toSpawn === 0 && enemies.length === 0) {
        state = 'levelup';
        levelTimer = 2.5;
        sfx('level');
    }
    if (state === 'levelup') {
        levelTimer -= dt;
        if (levelTimer <= 0) { level++; setupLevel(); }
    }
}

function notify() {
    if (!dotnet || !player) return;
    const left = toSpawn + enemies.length + (bossPending ? 1 : 0);
    const ammo = player.ammo === Infinity ? '∞' : String(player.ammo);
    const name = WEAPONS[player.weapon].name;
    const key = [state, level, left, player.hp, name, ammo].join('|');
    if (key === lastStatus) return;
    lastStatus = key;
    dotnet.invokeMethodAsync('OnStatus', state, level, left, player.hp, name, ammo);
}

// ---------- render ----------
function drawSprite(rows, pal, x, y, s, flip) {
    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        for (let c = 0; c < row.length; c++) {
            const ch = row[c];
            if (ch === '.') continue;
            ctx.fillStyle = pal[ch];
            const cx = flip ? row.length - 1 - c : c;
            ctx.fillRect(Math.round(x + cx * s), Math.round(y + r * s), s, s);
        }
    }
}

function drawGun(e) {
    const w = WEAPONS[e.weapon], s = e.scale, len = w.len * s;
    const gx = e.face > 0 ? e.x + e.w - s : e.x + s - len;
    ctx.fillStyle = w.gun;
    ctx.fillRect(Math.round(gx), Math.round(e.y + e.hand * s), len, (e.weapon === 'rocket' ? 3 : 2) * s);
}

function drawHuman(e, pal) {
    const frame = e.onGround ? Math.floor(e.anim * 8) % 2 : 1;
    const flip = e.face < 0;
    drawSprite(HUMAN, pal, e.x, e.y, e.scale, flip);
    drawSprite(LEGS[frame], pal, e.x, e.y + HUMAN.length * e.scale, e.scale, flip);
    drawGun(e);
}

function drawPlatforms() {
    for (const p of platforms) {
        if (p.ground) {
            ctx.fillStyle = '#4a3424';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = '#3d8b3d';
            ctx.fillRect(p.x, p.y, p.w, 6);
            ctx.fillStyle = '#5a4030';
            for (let x = 6; x < p.w; x += 24) ctx.fillRect(x, p.y + 14 + (x % 3) * 6, 6, 3);
        } else {
            ctx.fillStyle = '#6b6b7b';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = '#9a9aaa';
            ctx.fillRect(p.x, p.y, p.w, 3);
            ctx.fillStyle = '#3f3f4f';
            ctx.fillRect(p.x, p.y + p.h - 3, p.w, 3);
            for (let x = p.x + 24; x < p.x + p.w; x += 24) ctx.fillRect(x, p.y + 3, 3, p.h - 6);
        }
    }
}

function drawCrate(c, time) {
    const y = Math.round(c.y + Math.sin(time * 3 + c.t) * 2);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(c.x, y, c.w, c.h);
    ctx.fillStyle = '#c8a063';
    ctx.fillRect(c.x + 3, y + 3, c.w - 6, c.h - 6);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(c.x + 3, y + 10, c.w - 6, 3);
    ctx.fillRect(c.x + 10, y + 3, 3, c.h - 6);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(c.x + 9, y - 6, 6, 3);
}

function drawMedkit(m) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(m.x, m.y, m.w, m.h);
    ctx.fillStyle = '#d42a2a';
    ctx.fillRect(m.x + 7, m.y + 3, 4, 10);
    ctx.fillRect(m.x + 4, m.y + 6, 10, 4);
}

function drawBullet(b) {
    ctx.fillStyle = b.color;
    if (b.beam) {
        const len = 30, dir = Math.sign(b.vx) || 1;
        ctx.fillRect(Math.round(dir > 0 ? b.x - len : b.x), Math.round(b.y - 1), len, 3);
    } else {
        ctx.fillRect(Math.round(b.x - b.size / 2), Math.round(b.y - b.size / 2), b.size, b.size);
        if (b.explode) {
            ctx.fillStyle = '#ffd23f';
            ctx.fillRect(Math.round(b.x - Math.sign(b.vx) * 6 - 2), Math.round(b.y - 2), 4, 4);
        }
    }
}

function drawBossBar() {
    if (!boss) return;
    const w = 400, x = (W - w) / 2, y = 16;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 3, y - 3, w + 6, 18);
    ctx.fillStyle = '#5a1a1a';
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = '#ff3a3a';
    ctx.fillRect(x, y, w * Math.max(0, boss.hp) / boss.maxHp, 12);
    ctx.fillStyle = '#fff';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EINDBAAS', W / 2, y + 30);
}

function render(time) {
    ctx.save();
    if (shake > 0) ctx.translate(Math.round(rand(-6, 6) * shake * 3), Math.round(rand(-6, 6) * shake * 3));
    ctx.drawImage(bg, 0, 0);
    drawPlatforms();
    for (const c of crates) drawCrate(c, time);
    for (const m of pickups) drawMedkit(m);

    for (const en of enemies) {
        if (en.boss) {
            drawSprite(BOSS, en.flash > 0 ? whitePal(BOSS_PAL) : en.pal, en.x, en.y, en.scale, en.face < 0);
            drawGun(en);
        } else {
            drawHuman(en, en.flash > 0 ? whitePal(en.pal) : en.pal);
            ctx.fillStyle = '#000';
            ctx.fillRect(en.x, en.y - 8, en.w, 4);
            ctx.fillStyle = '#ff4d4d';
            ctx.fillRect(en.x, en.y - 8, en.w * en.hp / en.maxHp, 4);
        }
    }

    if (player && state !== 'gameover' && !(player.inv > 0 && Math.floor(player.inv * 20) % 2)) drawHuman(player, PLAYER_PAL);
    for (const b of bullets) drawBullet(b);
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    for (const t of texts) {
        ctx.globalAlpha = Math.min(1, t.life);
        ctx.fillStyle = '#000';
        ctx.fillText(t.text, Math.round(t.x) + 2, Math.round(t.y) + 2);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, Math.round(t.x), Math.round(t.y));
    }
    ctx.globalAlpha = 1;
    drawBossBar();
    ctx.restore();
}

const whiteCache = new Map();
function whitePal(pal) {
    let w = whiteCache.get(pal);
    if (!w) {
        w = {};
        for (const k in pal) w[k] = '#ffffff';
        whiteCache.set(pal, w);
    }
    return w;
}

function buildBackground() {
    bg = document.createElement('canvas');
    bg.width = W;
    bg.height = H;
    const b = bg.getContext('2d');
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#141432');
    g.addColorStop(1, '#4a2d5a');
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);

    // Deterministic pseudo-random for stable scenery
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) {
        b.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`;
        b.fillRect(Math.floor(rnd() * W / 3) * 3, Math.floor(rnd() * 90) * 3, 3, 3);
    }
    b.fillStyle = '#f4f0c8';
    for (let y = -30; y <= 30; y += 3)
        for (let x = -30; x <= 30; x += 3)
            if (x * x + y * y < 900) b.fillRect(820 + x, 80 + y, 3, 3);

    const layers = [['#2a1f45', 440, 80, 220, true], ['#1c1530', 490, 40, 140, false]];
    for (const [col, base, hmin, hmax, windows] of layers) {
        let x = 0;
        while (x < W) {
            const bw = 30 + Math.floor(rnd() * 4) * 15;
            const bh = hmin + Math.floor(rnd() * (hmax - hmin) / 6) * 6;
            b.fillStyle = col;
            b.fillRect(x, base - bh, bw, bh + 100);
            if (windows) {
                b.fillStyle = 'rgba(255,220,120,0.35)';
                for (let wy = base - bh + 9; wy < base - 6; wy += 12)
                    for (let wx = x + 6; wx < x + bw - 6; wx += 9)
                        if (rnd() < 0.35) b.fillRect(wx, wy, 3, 3);
            }
            x += bw + 3;
        }
    }
}

// ---------- loop / input ----------
function loop(t) {
    const dt = lastTime ? Math.min(0.033, (t - lastTime) / 1000) : 0;
    lastTime = t;
    if (state === 'playing' || state === 'levelup') update(dt);
    updateParticles(dt);
    shake = Math.max(0, shake - dt);
    notify();
    render(t / 1000);
    requestAnimationFrame(loop);
}

function onResize() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width = Math.floor(W * s) + 'px';
    canvas.style.height = Math.floor(H * s) + 'px';
}

function bindInput() {
    const block = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (block.includes(e.code) && state !== 'start') e.preventDefault();
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') keys.Mouse = true; });
    window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') keys.Mouse = false; });
    document.querySelectorAll('[data-key]').forEach(btn => {
        const k = btn.dataset.key;
        const on = e => { e.preventDefault(); keys[k] = true; };
        const off = e => { e.preventDefault(); keys[k] = false; };
        btn.addEventListener('pointerdown', on);
        btn.addEventListener('pointerup', off);
        btn.addEventListener('pointercancel', off);
        btn.addEventListener('pointerleave', off);
        btn.addEventListener('contextmenu', e => e.preventDefault());
    });
}

export function init(sceneId, ref) {
    dotnet = ref;
    const host = document.getElementById(sceneId);
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    host.appendChild(canvas);
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    buildBackground();
    player = newPlayer();
    platforms = buildPlatforms(LAYOUTS[0]);
    onResize();
    window.addEventListener('resize', onResize);
    bindInput();
    requestAnimationFrame(loop);
}

export function startGame() {
    if (!audio) {
        try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch { }
    }
    audio?.resume?.();
    level = 1;
    player = newPlayer();
    particles = [];
    texts = [];
    lastStatus = '';
    setupLevel();
}
