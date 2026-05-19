"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * PixelCat — High-performance 60 FPS Canvas-based desktop mascot.
 * 
 * Redesign Enhancements:
 *  1. Completely removed the biting/chomp asset and shrieking mouth states.
 *  2. Loads clean transparent v2 assets: cat_sleeping.png, cat_walk_sprites.png, cat_jump_sprites.png, cat_sit.png, cat_roll_sprites.png, and yarn_ball.png.
 *  3. Dynamic state machine driving Walk, Run (Chase), Jump, Climb, Wrap, Rub (head scent-marking), and Roll (attention-begging belly roll).
 *  4. High-performance physics-based ground-walking and parabolic jumping pathfinder (eliminates diagonal air-floating).
 *  5. Cute wiggling paw animations, tail-swaying cycles, and rotating belly-rolls.
 *  6. Smart text avoidance: searches empty screen margins and avoids overlap with important blocks.
 */

type CatState = 
  | "idle" 
  | "walk" 
  | "sleep" 
  | "pet" 
  | "follow" 
  | "climb" 
  | "wrap" 
  | "peek" 
  | "pounce" 
  | "chase"
  | "jump"
  | "exit" 
  | "enter"
  | "roll"
  | "rub";

type Facing = "left" | "right";

// 140x140 bounding box keeps the cat centered and anchored to the floor at Y=135
const CAT_W = 140; 
const CAT_H = 140;

const NORMAL_SPEED = 1.35;
const CHASE_SPEED = 2.6;
const CLIMB_SPEED = 0.95;
const SPRINT_SPEED = 3.6;
const GRAVITY = 0.45;

const C = {
  outline: "#3a2e2a",
  body: "#ffffff",
  bodyShade: "#e6dfd2",
  cheek: "#f5b8c6",
  nose: "#e08aa3",
};

interface CardRect {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface YarnBall {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vangle: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  isHeart?: boolean;
  isZ?: boolean;
  text?: string;
}

export function PixelCat() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<CatState>("enter");
  const [facing, setFacing] = useState<Facing>("right");
  const [pets, setPets] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [followCursor, setFollowCursor] = useState(false);
  
  // Yarn ball state
  const [yarn, setYarn] = useState<YarnBall>({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    vangle: 0,
  });

  const posRef = useRef({ x: -CAT_W - 50, y: 250 });
  const velRef = useRef({ x: 0, y: 0 });
  const cursorRef = useRef({ x: 0, y: 0, t: 0 });
  const stateTimerRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const catRef = useRef<HTMLDivElement | null>(null);
  const lastPathRef = useRef<string | null>(null);
  
  // Canvas refs
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Image assets
  const catSleepingImgRef = useRef<HTMLImageElement | null>(null);
  const catWalkImgRef = useRef<HTMLImageElement | null>(null);
  const catJumpImgRef = useRef<HTMLImageElement | null>(null);
  const catSitImgRef = useRef<HTMLImageElement | null>(null);
  const catRollImgRef = useRef<HTMLImageElement | null>(null);
  const heartImgRef = useRef<HTMLImageElement | null>(null);
  
  // Environment scanning refs
  const cardsRef = useRef<CardRect[]>([]);
  const avoidanceZonesRef = useRef<{ left: number; top: number; right: number; bottom: number }[]>([]);
  const activeCardRef = useRef<CardRect | null>(null);
  const isDraggingYarnRef = useRef(false);
  const yarnRef = useRef<YarnBall>({ active: false, x: 0, y: 0, vx: 0, vy: 0, angle: 0, vangle: 0 });
  
  // Waypoint pathfinding refs
  const pathRef = useRef<{ x: number; y: number; type: "walk" | "jump" }[]>([]);
  const activeWaypointRef = useRef<{ x: number; y: number; type: "walk" | "jump" } | null>(null);
  const isJumpingRef = useRef(false);

  // Particle system
  const particlesRef = useRef<Particle[]>([]);

  // 3D fold states
  const [bendAngle, setBendAngle] = useState(0); 
  const [wrapSide, setWrapSide] = useState<"left" | "right">("left");
  const [tilt3D, setTilt3D] = useState({ rx: 0, ry: 0, rz: 0 });

  /* ── Environment and Text Scanner ─────────────────────── */
  const scanEnvironment = useCallback(() => {
    if (typeof window === "undefined") return;
    
    // 1. Scan interactive cards/panels
    const cardElements = Array.from(
      document.querySelectorAll(".job-card-v2, [data-cat-perch], .glare-card, input, button")
    );
    const results: CardRect[] = cardElements.map((el, i) => {
      const rect = el.getBoundingClientRect();
      if (!el.id) {
        el.id = `card-shake-${i}`;
      }
      return {
        id: el.id,
        left: rect.left + window.scrollX,
        right: rect.right + window.scrollX,
        top: rect.top + window.scrollY,
        bottom: rect.bottom + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
    });
    cardsRef.current = results.filter((c) => c.width > 80 && c.height > 40);

    // 2. Scan text avoidance zones
    const textElements = Array.from(
      document.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, li, blockquote")
    );
    const textZones: { left: number; top: number; right: number; bottom: number }[] = [];
    textElements.forEach((el) => {
      if (el.textContent && el.textContent.trim().length > 15) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          textZones.push({
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
            right: rect.right + window.scrollX,
            bottom: rect.bottom + window.scrollY,
          });
        }
      }
    });
    avoidanceZonesRef.current = textZones;
  }, []);

  /* ── Get target point in empty space ─────────────────── */
  const getSafeTarget = useCallback((leftMargin: boolean) => {
    const wWidth = window.innerWidth;
    const wHeight = window.innerHeight;
    const leftMarginMax = 220; 
    const rightMarginMin = wWidth - 220;
    
    let bestX = 0;
    let bestY = 0;
    let minOverlapCount = Infinity;
    
    // Generate up to 40 candidate positions to find a perfect spot
    for (let i = 0; i < 40; i++) {
      let x = 0;
      if (leftMargin) {
        x = 20 + Math.random() * (leftMarginMax - 140);
      } else {
        x = rightMarginMin + Math.random() * (220 - 140);
      }
      let y = 100 + Math.random() * (wHeight - CAT_H - 150);
      
      let overlapCount = 0;
      const catRect = { left: x + 20, top: y + 60, right: x + 120, bottom: y + 135 };
      
      avoidanceZonesRef.current.forEach((zone) => {
        if (
          catRect.left < zone.right &&
          catRect.right > zone.left &&
          catRect.top < zone.bottom &&
          catRect.bottom > zone.top
        ) {
          overlapCount += 5; // Heavy overlap penalty
        }
      });
      
      if (overlapCount < minOverlapCount) {
        minOverlapCount = overlapCount;
        bestX = x;
        bestY = y;
        if (overlapCount === 0) break;
      }
    }
    
    return { x: bestX, y: bestY };
  }, []);

  /* ── Waypoint Path Generator ─────────────────────────── */
  const navigateTo = useCallback((tx: number, ty: number) => {
    const cx = posRef.current.x;
    const cy = posRef.current.y;
    
    const waypoints: { x: number; y: number; type: "walk" | "jump" }[] = [];
    
    // Lock movements strictly to horizontal walking or vertical/parabolic jumps
    if (Math.abs(cy - ty) > 15) {
      // Step 1: Walk horizontally to line up with the target horizontally
      waypoints.push({ x: tx, y: cy, type: "walk" });
      // Step 2: Jump vertically/parabolically onto the target height level
      waypoints.push({ x: tx, y: ty, type: "jump" });
    } else {
      // Just walk horizontally on the current level
      waypoints.push({ x: tx, y: ty, type: "walk" });
    }
    
    pathRef.current = waypoints;
    activeWaypointRef.current = null;
    isJumpingRef.current = false;
  }, []);

  /* ── Load Image Assets ────────────────────────────────── */
  useEffect(() => {
    setMounted(true);
    
    const catSleepingImg = new Image();
    catSleepingImg.src = "/cat_sleeping.png";
    catSleepingImg.onload = () => {
      catSleepingImgRef.current = catSleepingImg;
    };
    
    const catWalkImg = new Image();
    catWalkImg.src = "/cat_walk_sprites.png";
    catWalkImg.onload = () => {
      catWalkImgRef.current = catWalkImg;
    };
    
    const catJumpImg = new Image();
    catJumpImg.src = "/cat_jump_sprites.png";
    catJumpImg.onload = () => {
      catJumpImgRef.current = catJumpImg;
    };
    
    const catSitImg = new Image();
    catSitImg.src = "/cat_sit.png";
    catSitImg.onload = () => {
      catSitImgRef.current = catSitImg;
    };
    
    const catRollImg = new Image();
    catRollImg.src = "/cat_roll_sprites.png";
    catRollImg.onload = () => {
      catRollImgRef.current = catRollImg;
    };
    
    const heartImg = new Image();
    heartImg.src = "/heart_pixel.png";
    heartImg.onload = () => {
      heartImgRef.current = heartImg;
    };

    const stored = Number(localStorage.getItem("nx-cat-pets") || 0);
    setPets(stored);

    scanEnvironment();
    window.addEventListener("resize", scanEnvironment);
    window.addEventListener("scroll", scanEnvironment, { passive: true });

    // Leap in from left
    posRef.current = { x: -CAT_W - 20, y: window.innerHeight / 2 - 100 };
    velRef.current = { x: 8.5, y: -7.5 };
    setState("enter");
    stateTimerRef.current = 3000;

    return () => {
      window.removeEventListener("resize", scanEnvironment);
      window.removeEventListener("scroll", scanEnvironment);
    };
  }, [scanEnvironment]);

  /* ── Route change -> Jump-exit and re-enter ───────────── */
  useEffect(() => {
    if (!mounted) return;
    if (lastPathRef.current == null) {
      lastPathRef.current = pathname;
      return;
    }
    if (lastPathRef.current !== pathname) {
      // Trigger jump-enter from left on new route
      posRef.current = { x: -CAT_W - 40, y: window.innerHeight / 2 - 100 };
      velRef.current = { x: 9.5, y: -7.5 };
      setFacing("right");
      setState("enter");
      stateTimerRef.current = 3000;
      lastPathRef.current = pathname;
      setTimeout(scanEnvironment, 400);
    }
  }, [pathname, mounted, scanEnvironment]);

  /* ── Intercept internal link clicks for Jump-exit ───────── */
  useEffect(() => {
    if (!mounted) return;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (anchor.target === "_blank") return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
      } catch {
        return;
      }

      // Leap off-screen to the right
      setState("exit");
      pathRef.current = [];
      activeWaypointRef.current = null;
      velRef.current = { x: 13, y: -10 };
      setFacing("right");
      stateTimerRef.current = 1500;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [mounted]);

  /* ── Track Cursor ─────────────────────────────────────── */
  useEffect(() => {
    if (!mounted) return;
    const onMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mounted]);

  /* ── Spawn/Toss Yarn Ball ────────────────────────────── */
  const tossYarn = useCallback((x?: number, y?: number) => {
    if (typeof window === "undefined") return;
    const spawnX = x ?? posRef.current.x + (facing === "right" ? 160 : -80);
    const spawnY = y ?? Math.min(posRef.current.y + 40, window.innerHeight - 200);
    const newYarn = {
      active: true,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 11,
      vy: -8,
      angle: 0,
      vangle: Math.random() * 14 - 7,
    };
    setYarn(newYarn);
    yarnRef.current = newYarn;
    setState("chase");
    pathRef.current = [];
    activeWaypointRef.current = null;
    isJumpingRef.current = false;
    stateTimerRef.current = 12000;
  }, [facing]);

  /* Double click spawns yarn ball */
  useEffect(() => {
    if (!mounted) return;
    const onDblClick = (e: MouseEvent) => {
      if (catRef.current?.contains(e.target as Node)) return;
      tossYarn(e.clientX, e.clientY);
    };
    window.addEventListener("dblclick", onDblClick);
    return () => window.removeEventListener("dblclick", onDblClick);
  }, [mounted, tossYarn]);

  /* ── Canvas Drawing Logic ────────────────────────────── */
  const drawCatToCanvas = (ctx: CanvasRenderingContext2D, time: number, scaleY: number) => {
    ctx.clearRect(0, 0, CAT_W, CAT_H);
    
    let img: HTMLImageElement | null = null;
    let sx = 0, sy = 0, sw = 0, sh = 0;
    let dx = 0, dy = 0, dw = 0, dh = 0;
    
    const groundY = 135;
    
    if (state === "sleep") {
      img = catSleepingImgRef.current;
      if (img) {
        sw = 773;
        sh = 360;
        dw = 120;
        dh = 56;
        dx = (CAT_W - dw) / 2;
        dy = groundY - dh;
      }
    } 
    else if (state === "walk" || state === "chase" || state === "follow") {
      img = catWalkImgRef.current;
      if (img) {
        const frameIndex = Math.floor(time / 130) % 4; // 4-frame walk
        sw = 445;
        sh = 383;
        sx = frameIndex * 445;
        sy = 0;
        dw = 100;
        dh = 86; 
        dx = (CAT_W - dw) / 2;
        dy = groundY - dh;
      }
    } 
    else if (state === "jump" || state === "exit" || state === "enter") {
      img = catJumpImgRef.current;
      if (img) {
        let frameIndex = 0;
        if (state === "jump" || state === "exit") {
          frameIndex = Math.abs(velRef.current.x) > 2 ? 1 : 0;
        } else if (state === "enter") {
          frameIndex = velRef.current.y > 0 ? 1 : 0;
        }
        sw = 584;
        sh = 414;
        sx = frameIndex * 584;
        sy = 0;
        dw = 110;
        dh = 78; 
        dx = (CAT_W - dw) / 2;
        dy = groundY - dh;
      }
    } 
    else if (state === "idle" || state === "pet" || state === "rub") {
      img = catSitImgRef.current;
      if (img) {
        sw = 744;
        sh = 941;
        dw = 75;
        dh = 95; 
        dx = (CAT_W - dw) / 2;
        dy = groundY - dh;
        
        if (state === "rub") {
          const rubOffset = Math.sin(time / 120) * 5;
          dx += rubOffset;
        }
      }
    }
    else if (state === "roll") {
      img = catRollImgRef.current;
      if (img) {
        const frameIndex = Math.floor(time / 180) % 4; // 4-frame roll onto back
        sw = 629;
        sh = 507;
        sx = frameIndex * 629;
        sy = 0;
        dw = 110;
        dh = 88; 
        dx = (CAT_W - dw) / 2;
        dy = groundY - dh;
      }
    }
    
    if (!img) return;
    
    ctx.save();
    
    // 1. Flip if facing left (except when rolling/lying on back)
    if (facing === "left" && state !== "roll") {
      ctx.translate(CAT_W, 0);
      ctx.scale(-1, 1);
    }
    
    // 2. Breathing scale relative to base center
    const centerX = dx + dw / 2;
    const centerY = dy + dh;
    ctx.translate(centerX, centerY);
    ctx.scale(1, scaleY);
    ctx.translate(-centerX, -centerY);
    
    // 3. Draw image frame
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    
    ctx.restore();
  };

  /* ── Main Physics & Particle loop ────────────────────── */
  useEffect(() => {
    if (!mounted) return;

    let last = performance.now();
    let zzzTimer = 0;
    let heartTimer = 0;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 32); 
      last = now;

      stateTimerRef.current -= dt;
      if (stateTimerRef.current <= 0 && !["pet", "exit", "enter", "chase", "roll", "rub"].includes(state)) {
        decideNextState(now);
      }

      /* ── 1. Update Yarn Ball Physics ── */
      if (yarnRef.current.active && !isDraggingYarnRef.current) {
        let b = { ...yarnRef.current };
        b.vy += GRAVITY * (dt / 16.6);
        b.x += b.vx * (dt / 16.6);
        b.y += b.vy * (dt / 16.6);
        b.angle += b.vangle * (dt / 16.6);
        b.vx *= 0.985;
        b.vy *= 0.985;
        b.vangle *= 0.98;

        const r = 18; 
        if (b.x - r < 0) {
          b.x = r;
          b.vx = -b.vx * 0.7;
          b.vangle = -b.vangle * 0.7 + (Math.random() - 0.5) * 4;
        } else if (b.x + r > window.innerWidth) {
          b.x = window.innerWidth - r;
          b.vx = -b.vx * 0.7;
          b.vangle = -b.vangle * 0.7 + (Math.random() - 0.5) * 4;
        }
        if (b.y - r < 0) {
          b.y = r;
          b.vy = -b.vy * 0.7;
        } else if (b.y + r > window.innerHeight) {
          b.y = window.innerHeight - r;
          b.vy = -b.vy * 0.65;
          b.vx *= 0.95;
          b.vangle = b.vx * 1.5;
        }

        // Card collision
        cardsRef.current.forEach((card) => {
          if (
            b.x + r > card.left &&
            b.x - r < card.right &&
            b.y + r > card.top &&
            b.y - r < card.bottom
          ) {
            const overlapL = (b.x + r) - card.left;
            const overlapR = card.right - (b.x - r);
            const overlapT = (b.y + r) - card.top;
            const overlapB = card.bottom - (b.y - r);
            const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);

            if (minOverlap === overlapT) {
              b.y = card.top - r;
              b.vy = -b.vy * 0.7;
              b.vx *= 0.96;
            } else if (minOverlap === overlapB) {
              b.y = card.bottom + r;
              b.vy = -b.vy * 0.7;
            } else if (minOverlap === overlapL) {
              b.x = card.left - r;
              b.vx = -b.vx * 0.7;
            } else if (minOverlap === overlapR) {
              b.x = card.right + r;
              b.vx = -b.vx * 0.7;
            }
          }
        });

        if (Math.abs(b.vx) < 0.05 && Math.abs(b.vy) < 0.05 && b.y >= window.innerHeight - r - 2) {
          b.vx = 0;
          b.vy = 0;
          b.vangle = 0;
        }

        yarnRef.current = b;
        setYarn(b);
      }

      /* ── 2. Cat Physics & Waypoint Processing ── */
      if (state === "exit") {
        velRef.current.y += GRAVITY * (dt / 16.6);
        posRef.current.x += velRef.current.x * (dt / 16.6);
        posRef.current.y += velRef.current.y * (dt / 16.6);
      } 
      else if (state === "enter") {
        velRef.current.y += GRAVITY * (dt / 16.6);
        posRef.current.x += velRef.current.x * (dt / 16.6);
        posRef.current.y += velRef.current.y * (dt / 16.6);

        if (velRef.current.y > 0 && posRef.current.y >= window.innerHeight - CAT_H - 10) {
          posRef.current.y = window.innerHeight - CAT_H - 10;
          velRef.current = { x: 0, y: 0 };
          setState("idle");
          stateTimerRef.current = 1500;
        }
      } 
      else if (state === "chase" && yarnRef.current.active) {
        const dx = yarnRef.current.x - (posRef.current.x + CAT_W / 2);
        const dy = yarnRef.current.y - (posRef.current.y + 110);
        const dist = Math.hypot(dx, dy);

        if (dist < 45) {
          // SWAT! Play swat physics impulse
          const swatForceX = (facing === "right" ? 1 : -1) * (8.5 + Math.random() * 8.5);
          const swatForceY = -(6 + Math.random() * 6);
          yarnRef.current.vx = swatForceX;
          yarnRef.current.vy = swatForceY;
          yarnRef.current.vangle = swatForceX * 2.8;
          setYarn({ ...yarnRef.current });
          
          for (let i = 0; i < 6; i++) {
            particlesRef.current.push({
              x: yarnRef.current.x,
              y: yarnRef.current.y,
              vx: (Math.random() - 0.5) * 7,
              vy: (Math.random() - 0.5) * 7,
              color: i % 2 === 0 ? "#ff5e7e" : "#ff8da4",
              size: 3.5 + Math.random() * 3.5,
              life: 550,
              maxLife: 550,
            });
          }
          
          setState("idle");
          stateTimerRef.current = 800;
        } else {
          const ux = dx / dist;
          const uy = dy / dist;
          
          if (Math.abs(dy) > 30 && !isJumpingRef.current && Math.random() < 0.05) {
            setState("jump");
            isJumpingRef.current = true;
            velRef.current = { x: ux * 6, y: -7.5 };
          } 
          
          if (isJumpingRef.current) {
            velRef.current.y += GRAVITY * (dt / 16.6);
            posRef.current.x += velRef.current.x * (dt / 16.6);
            posRef.current.y += velRef.current.y * (dt / 16.6);
            if (posRef.current.y >= window.innerHeight - CAT_H - 10) {
              posRef.current.y = window.innerHeight - CAT_H - 10;
              isJumpingRef.current = false;
              setState("chase");
            }
          } else {
            posRef.current.x += ux * CHASE_SPEED * (dt / 16.6);
            posRef.current.y += uy * CHASE_SPEED * (dt / 16.6);
            setFacing(ux >= 0 ? "right" : "left");
          }
        }
      }
      else if (state === "follow" && followCursor) {
        const dx = cursorRef.current.x - (posRef.current.x + CAT_W / 2);
        const dy = cursorRef.current.y - (posRef.current.y + 100);
        const dist = Math.hypot(dx, dy);
        if (dist > 65) {
          const ux = dx / dist;
          const uy = dy / dist;
          posRef.current.x += ux * NORMAL_SPEED * 1.6 * (dt / 16.6);
          posRef.current.y += uy * NORMAL_SPEED * 1.6 * (dt / 16.6);
          setFacing(ux >= 0 ? "right" : "left");
        } else {
          setState("idle");
          stateTimerRef.current = 1000;
        }
      }
      else if (state === "climb") {
        if (pathRef.current.length === 0 && !activeWaypointRef.current) {
          setState("wrap");
          setBendAngle(0);
          stateTimerRef.current = 3500 + Math.random() * 3000;
        }
      }
      else if (state === "wrap") {
        setBendAngle((a) => Math.min(a + 2.5 * (dt / 16.6), 72));
      }
      else if (state === "rub" && activeCardRef.current) {
        const card = document.getElementById(activeCardRef.current.id);
        if (card && Math.random() < 0.25) {
          // Cards tilt/shake slightly when rubbed against
          const tilt = Math.sin(now / 100) * 1.2;
          card.style.transform = `skewX(${tilt}deg)`;
          card.style.transition = "transform 0.15s ease";
        }
        
        if (stateTimerRef.current <= 0) {
          const card = document.getElementById(activeCardRef.current.id);
          if (card) {
            card.style.transform = "";
          }
          activeCardRef.current = null;
          setState("idle");
          stateTimerRef.current = 1500;
        }
      }

      // Process Waypoint Pathing for all normal roaming/jumping
      if (pathRef.current.length > 0 || activeWaypointRef.current) {
        if (!activeWaypointRef.current) {
          activeWaypointRef.current = pathRef.current.shift() || null;
          if (activeWaypointRef.current?.type === "jump") {
            const x0 = posRef.current.x;
            const y0 = posRef.current.y;
            const x1 = activeWaypointRef.current.x;
            const y1 = activeWaypointRef.current.y;
            const dx = x1 - x0;
            const dy = y1 - y0;
            
            setState("jump");
            isJumpingRef.current = true;
            
            if (dy < -10) {
              // Jumping up. Target peak is 45px above y1
              const peakHeight = Math.abs(dy) + 45;
              const vy = -Math.sqrt(2 * GRAVITY * peakHeight);
              const tUp = -vy / GRAVITY;
              const tDown = Math.sqrt(2 * 45 / GRAVITY);
              const tTotal = tUp + tDown;
              const vx = dx / tTotal;
              velRef.current = { x: vx, y: vy };
            } else {
              // Jumping down. Upward hop, then fall
              const tTotal = 25;
              const vy = -3;
              const vx = dx / tTotal;
              const adjustedVy = (dy - 0.5 * GRAVITY * tTotal * tTotal) / tTotal;
              velRef.current = { x: vx, y: adjustedVy };
            }
          } else {
            // Horizontal walking
            setState("walk");
            isJumpingRef.current = false;
          }
        }
        
        const wp = activeWaypointRef.current;
        if (wp) {
          if (wp.type === "jump") {
            // Apply gravity in tick
            velRef.current.y += GRAVITY * (dt / 16.6);
            posRef.current.x += velRef.current.x * (dt / 16.6);
            posRef.current.y += velRef.current.y * (dt / 16.6);
            
            const dy = wp.y - posRef.current.y;
            if (velRef.current.y > 0 && dy <= 5) {
              posRef.current.y = wp.y;
              posRef.current.x = wp.x;
              velRef.current = { x: 0, y: 0 };
              activeWaypointRef.current = null;
              isJumpingRef.current = false;
              setState("idle");
            }
          } else {
            // Walk strictly horizontally
            const dx = wp.x - posRef.current.x;
            const dist = Math.abs(dx);
            
            if (dist < 4) {
              posRef.current.x = wp.x;
              activeWaypointRef.current = null;
              setState("idle");
            } else {
              const sign = dx > 0 ? 1 : -1;
              posRef.current.x += sign * NORMAL_SPEED * (dt / 16.6);
              setFacing(sign > 0 ? "right" : "left");
            }
          }
        }
      }

      /* ── 3. Viewport Boundary Clamp ── */
      if (state !== "exit" && state !== "enter") {
        const padX = 12;
        const padY = 72; 
        const minX = padX;
        const maxX = window.innerWidth - CAT_W - padX;
        const minY = padY;
        const maxY = window.innerHeight - CAT_H - padX;

        if (posRef.current.x < minX) posRef.current.x = minX;
        if (posRef.current.x > maxX) posRef.current.x = maxX;
        if (posRef.current.y < minY) posRef.current.y = minY;
        if (posRef.current.y > maxY) posRef.current.y = maxY;
      }

      // Sync position of DOM mascot
      if (catRef.current) {
        catRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
      }

      /* ── 4. Particle Generation ── */
      if (state === "sleep") {
        zzzTimer += dt;
        if (zzzTimer > 1800) {
          zzzTimer = 0;
          const zX = posRef.current.x + 70 + (facing === "right" ? 30 : -30);
          const zY = posRef.current.y + 60;
          particlesRef.current.push({
            x: zX,
            y: zY,
            vx: 0.3 + Math.random() * 0.5,
            vy: -0.6 - Math.random() * 0.8,
            color: C.nose,
            size: 16,
            life: 2000,
            maxLife: 2000,
            isZ: true,
            text: Math.random() < 0.4 ? "Z" : "z",
          });
        }
      }
      
      if (state === "pet" || state === "roll") {
        heartTimer += dt;
        if (heartTimer > 350) {
          heartTimer = 0;
          const heartX = posRef.current.x + 70 + (Math.random() - 0.5) * 30;
          const heartY = posRef.current.y + 40;
          particlesRef.current.push({
            x: heartX,
            y: heartY,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -1.4 - Math.random() * 1.4,
            color: C.cheek,
            size: 26, 
            life: 1500,
            maxLife: 1500,
            isHeart: true,
          });
        }
      }

      /* ── 5. Render Canvas loop (both left and right canvases) ── */
      const scaleY = 1 + 0.015 * Math.sin(now / 220);
      
      [leftCanvasRef.current, rightCanvasRef.current].forEach((canvas) => {
        if (!canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== CAT_W * dpr || canvas.height !== CAT_H * dpr) {
          canvas.width = CAT_W * dpr;
          canvas.height = CAT_H * dpr;
          canvas.style.width = `${CAT_W}px`;
          canvas.style.height = `${CAT_H}px`;
          const cCtx = canvas.getContext("2d");
          if (cCtx) {
            cCtx.scale(dpr, dpr);
            cCtx.imageSmoothingEnabled = false;
          }
        }
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawCatToCanvas(ctx, now, scaleY);
          
          particlesRef.current.forEach((p) => {
            const relX = p.x - posRef.current.x;
            const relY = p.y - posRef.current.y;
            
            if (!p.isHeart && !p.isZ) {
              ctx.fillStyle = p.color;
              ctx.fillRect(relX, relY, p.size, p.size);
            }
            
            if (p.isHeart && heartImgRef.current) {
              const alpha = Math.max(0, p.life / p.maxLife);
              ctx.save();
              ctx.globalAlpha = alpha;
              ctx.drawImage(heartImgRef.current, relX - 13, relY - 11, 26, 22);
              ctx.restore();
            }
            
            if (p.isZ) {
              const alpha = Math.max(0, p.life / p.maxLife);
              ctx.save();
              ctx.globalAlpha = alpha;
              ctx.font = "bold 16px Courier New, monospace";
              ctx.fillStyle = p.color;
              ctx.fillText(p.text || "z", relX, relY);
              ctx.restore();
            }
          });
        }
      });

      /* ── 6. Update and filter particles ── */
      particlesRef.current = particlesRef.current
          .map((p) => {
            if (!p.isHeart && !p.isZ) {
              p.vy += GRAVITY * 0.4 * (dt / 16.6);
            }
            p.x += p.vx * (dt / 16.6);
            p.y += p.vy * (dt / 16.6);
            p.life -= dt;
            return p;
          })
          .filter((p) => p.life > 0);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, state, facing, followCursor, scanEnvironment]);

  /* ── Margin pathfinding & Avoidance AI Decision ──────── */
  const decideNextState = useCallback((now: number) => {
    const r = Math.random();
    setBendAngle(0);
    setTilt3D({ rx: 0, ry: 0, rz: 0 });
    
    // Reset card tilt
    if (activeCardRef.current) {
      const card = document.getElementById(activeCardRef.current.id);
      if (card) {
        card.style.transform = "";
      }
      activeCardRef.current = null;
    }

    if (yarnRef.current.active) {
      setState("chase");
      return;
    }

    const cursorFresh = now - cursorRef.current.t < 2500;
    if (followCursor && cursorFresh) {
      setState("follow");
      return;
    }

    const wWidth = window.innerWidth;
    const onLeft = posRef.current.x < wWidth / 2;
    
    const crossOver = r < 0.22;
    const safeTarget = getSafeTarget(crossOver ? !onLeft : onLeft);

    if (crossOver) {
      navigateTo(safeTarget.x, safeTarget.y);
      stateTimerRef.current = 6500;
      return;
    }

    const localCards = cardsRef.current.filter((c) => {
      const isCardLeft = c.left < wWidth / 2;
      return isCardLeft === onLeft;
    });

    if (localCards.length > 0 && Math.random() < 0.50) {
      const card = localCards[Math.floor(Math.random() * localCards.length)];
      activeCardRef.current = card;

      const choice = Math.random();
      if (choice < 0.30) {
        // Climb & Wrap card side
        const edgeX = onLeft ? card.left - 70 : card.right - 70;
        const climbY = card.top + card.height * 0.2 - 110;
        setState("climb");
        setWrapSide(onLeft ? "left" : "right");
        setTilt3D({ rx: 0, ry: 0, rz: onLeft ? -90 : 90 });
        navigateTo(edgeX, climbY);
        stateTimerRef.current = 5000;
      } 
      else if (choice < 0.65) {
        // Walk and perch on top
        const topX = card.left + Math.random() * (card.width - 120);
        const topY = card.top - 135;
        navigateTo(topX, topY);
        stateTimerRef.current = 5500;
      } 
      else {
        // Rub head against edge
        const edgeX = onLeft ? card.left - 85 : card.right - 55;
        const edgeY = card.top + card.height * 0.3 - 110;
        navigateTo(edgeX, edgeY);
        stateTimerRef.current = 4500;
        
        setTimeout(() => {
          if (stateTimerRef.current > 0 && activeCardRef.current === card) {
            setState("rub");
            setFacing(onLeft ? "right" : "left");
            stateTimerRef.current = 3000 + Math.random() * 2000;
          }
        }, 3000);
      }
    } else {
      // Walk, sleep, or roll belly-up!
      const rand = Math.random();
      if (rand < 0.15) {
        setState("sleep");
        navigateTo(safeTarget.x, safeTarget.y);
      } else if (rand < 0.30) {
        // Play belly roll at destination
        navigateTo(safeTarget.x, safeTarget.y);
        setTimeout(() => {
          if (stateTimerRef.current > 0 && pathRef.current.length === 0) {
            setState("roll");
            stateTimerRef.current = 3500;
          }
        }, 3000);
      } else {
        setState("walk");
        navigateTo(safeTarget.x, safeTarget.y);
      }
      stateTimerRef.current = 4000 + Math.random() * 3000;
    }
  }, [followCursor, getSafeTarget, navigateTo]);

  /* ── Pet Handler (Begging for attention belly roll) ───── */
  const onPet = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setState("roll"); 
    stateTimerRef.current = 3500;
    setPets((p) => {
      const next = p + 1;
      try {
        localStorage.setItem("nx-cat-pets", String(next));
      } catch {}
      return next;
    });
    
    // Halt any active waypoint pathing
    pathRef.current = [];
    activeWaypointRef.current = null;
    
    setTimeout(() => {
      setState("idle");
      stateTimerRef.current = 1500;
    }, 3500);
  }, []);

  /* ── Dragging Yarn Ball ────────────────────────────────── */
  const onYarnMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    isDraggingYarnRef.current = true;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const nextYarn = {
        ...yarnRef.current,
        x: moveEvent.clientX,
        y: moveEvent.clientY,
        vx: (moveEvent.clientX - yarnRef.current.x) * 0.8,
        vy: (moveEvent.clientY - yarnRef.current.y) * 0.8,
      };
      yarnRef.current = nextYarn;
      setYarn(nextYarn);
    };

    const onMouseUp = () => {
      isDraggingYarnRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  if (!mounted) return null;

  // Split canvas angles for 3D wrap
  let leftHalfRot = 0;
  let rightHalfRot = 0;
  if (state === "wrap") {
    if (wrapSide === "left") {
      rightHalfRot = -bendAngle; 
    } else {
      leftHalfRot = bendAngle; 
    }
  }

  const finalTransform = `perspective(500px) rotateX(${tilt3D.rx}deg) rotateY(${tilt3D.ry}deg) rotateZ(${tilt3D.rz}deg)`;

  return (
    <>
      {/* Viewport Mascot Container */}
      <div
        ref={catRef}
        onClick={onPet}
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
        role="button"
        aria-label="Interactive canvas-based cat mascot"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: CAT_W,
          height: CAT_H,
          zIndex: 9999,
          cursor: "pointer",
          pointerEvents: "auto",
          userSelect: "none",
          transform: `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`,
          transition: "filter 0.25s ease",
          filter:
            state === "roll"
              ? "drop-shadow(0 0 20px rgba(245,184,198,0.95)) drop-shadow(0 6px 12px rgba(0,0,0,0.18))"
              : "drop-shadow(0 8px 12px rgba(0,0,0,0.15))",
        }}
      >
        {/* Quick Bubble Menu */}
        {menuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: -30,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 8,
              background: "rgba(34, 25, 20, 0.90)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 24,
              padding: "4px 8px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              zIndex: 100000,
            }}
          >
            <button
              onClick={onPet}
              title="Pet Cat"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
            >
              🐱
            </button>
            <button
              onClick={() => tossYarn()}
              title="Toss Yarn Ball"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
            >
              🧶
            </button>
            <button
              onClick={() => setState(state === "sleep" ? "idle" : "sleep")}
              title="Nap/Wake"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
            >
              💤
            </button>
            <button
              onClick={() => setFollowCursor((f) => !f)}
              title="Toggle Follow"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                filter: followCursor ? "none" : "grayscale(100%)",
              }}
            >
              🎯
            </button>
          </div>
        )}

        {/* 3D Split Wrapper for wrap-around borders */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transform: finalTransform,
            transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Left half of cat */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: CAT_W / 2,
              height: CAT_H,
              overflow: "hidden",
              transformOrigin: "right center",
              transformStyle: "preserve-3d",
              transform: `rotateY(${leftHalfRot}deg)`,
              transition: "transform 0.25s ease",
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, width: CAT_W, height: CAT_H }}>
              <canvas ref={leftCanvasRef} style={{ imageRendering: "pixelated" }} />
            </div>
          </div>

          {/* Right half of cat */}
          <div
            style={{
              position: "absolute",
              left: CAT_W / 2,
              top: 0,
              width: CAT_W / 2,
              height: CAT_H,
              overflow: "hidden",
              transformOrigin: "left center",
              transformStyle: "preserve-3d",
              transform: `rotateY(${rightHalfRot}deg)`,
              transition: "transform 0.25s ease",
            }}
          >
            <div style={{ position: "absolute", left: -CAT_W / 2, top: 0, width: CAT_W, height: CAT_H }}>
              <canvas ref={rightCanvasRef} style={{ imageRendering: "pixelated" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Physics-Based Woven Yarn Ball */}
      {yarn.active && (
        <div
          onMouseDown={onYarnMouseDown}
          style={{
            position: "fixed",
            left: yarn.x - 18,
            top: yarn.y - 18,
            width: 36,
            height: 36,
            zIndex: 9998,
            cursor: "grab",
            transform: `rotate(${yarn.angle}deg)`,
            filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.15))",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/yarn_ball.png"
            alt="Yarn Ball"
            style={{
              width: "100%",
              height: "100%",
              imageRendering: "pixelated",
              userSelect: "none",
              pointerEvents: "none"
            }}
          />
        </div>
      )}
    </>
  );
}
