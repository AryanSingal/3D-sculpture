// Minimal, deterministic 3D Perlin-style value noise with no external
// dependency. Used only to add organic surface irregularity (bumps, mottling)
// to geometry that would otherwise look like a perfect, "toy" primitive.

const PERM_SIZE = 256;
const perm = new Uint8Array(PERM_SIZE * 2);

(function seedPermutation() {
  const table = new Uint8Array(PERM_SIZE);
  for (let i = 0; i < PERM_SIZE; i++) table[i] = i;

  // Small deterministic LCG so the same "random" surface detail appears
  // every run (no external seeded-random dependency needed).
  let state = 1337;
  const rand = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };

  for (let i = PERM_SIZE - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = table[i];
    table[i] = table[j];
    table[j] = tmp;
  }
  for (let i = 0; i < PERM_SIZE * 2; i++) perm[i] = table[i & 255];
})();

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + t * (b - a);
}

function grad(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/** Classic Perlin noise, roughly in the range [-1, 1]. */
export function noise3(x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const A = perm[X] + Y;
  const AA = perm[A] + Z;
  const AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y;
  const BA = perm[B] + Z;
  const BB = perm[B + 1] + Z;

  return lerp(
    lerp(
      lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
      lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u),
      v
    ),
    lerp(
      lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
      lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u),
      v
    ),
    w
  );
}

/** Fractal Brownian motion: several octaves of noise3 layered together. */
export function fbm3(x, y, z, octaves = 4, lacunarity = 2.0, gain = 0.5) {
  let amplitude = 0.5;
  let frequency = 1.0;
  let sum = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise3(x * frequency, y * frequency, z * frequency);
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return sum;
}
