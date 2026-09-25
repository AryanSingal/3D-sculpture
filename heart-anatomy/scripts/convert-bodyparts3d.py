import glob, re, os, json, struct

SRC = "/home/claude/heart-src/data/Postnatal_anatomical_structure"
OUT_BIN = "/home/claude/heart-explorer/public/heart-anatomy.bin"
OUT_JSON = "/home/claude/heart-explorer/public/heart-anatomy.manifest.json"

# --- global bbox (computed previously) ---
Xc = (-35.3272 + 81.1026) / 2
Yc = (-177.219 + -70.6127) / 2
Zc = (1174.58 + 1292.65) / 2
SCALE = 4.0 / (1292.65 - 1174.58)  # ~4 scene units tall

def transform(x, y, z):
    tx = (x - Xc) * SCALE
    ty = (z - Zc) * SCALE
    tz = (Yc - y) * SCALE
    return tx, ty, tz

def parse_obj(path):
    verts = []
    norms = []
    faces = []  # list of (vi0,ni0, vi1,ni1, vi2,ni2) 0-based
    with open(path, "r") as f:
        for line in f:
            if line.startswith("v "):
                p = line.split()
                verts.append(transform(float(p[1]), float(p[2]), float(p[3])))
            elif line.startswith("vn "):
                p = line.split()
                norms.append((float(p[1]), float(p[2]), float(p[3])))
            elif line.startswith("f "):
                p = line.split()[1:]
                idx = []
                for tok in p:
                    parts = tok.split("/")
                    vi = int(parts[0])
                    ni = int(parts[2]) if len(parts) > 2 and parts[2] else vi
                    vi = vi - 1 if vi > 0 else len(verts) + vi
                    ni = ni - 1 if ni > 0 else len(norms) + ni
                    idx.append((vi, ni))
                # fan-triangulate in case of polygons > 3 verts
                for k in range(1, len(idx) - 1):
                    faces.append((idx[0], idx[k], idx[k + 1]))
    return verts, norms, faces

# --- group files by canonical name ---
groups = {}  # canonical -> list of file paths
for path in glob.glob(os.path.join(SRC, "*.obj")):
    base = os.path.basename(path)
    canonical = re.sub(r'^MM\d+_BP\d+_FMA\d+_', '', base)[:-4]
    groups.setdefault(canonical, []).append(path)

print(f"{len(groups)} canonical structures from {sum(len(v) for v in groups.values())} files")

manifest = {"groups": [], "scale": SCALE, "center": [Xc, Yc, Zc]}
bin_chunks = []
byte_offset = 0

for canonical in sorted(groups.keys()):
    all_pos = []
    all_norm = []
    all_idx = []
    vertex_base = 0
    cx = cy = cz = 0.0
    n_total = 0
    for path in groups[canonical]:
        verts, norms, faces = parse_obj(path)
        # local re-index: build a per-file local vertex list matching (vi,ni) pairs used,
        # since v and vn arrays are parallel/same length in this dataset we can just use vi directly
        for (x, y, z) in verts:
            all_pos.extend([x, y, z])
            cx += x; cy += y; cz += z
            n_total += 1
        if len(norms) == len(verts):
            for (nx, ny, nz) in norms:
                all_norm.extend([nx, ny, nz])
        else:
            # fallback: flat zero normals, will be recomputed in JS if needed
            all_norm.extend([0.0, 1.0, 0.0] * len(verts))
        for (a, b, c) in faces:
            all_idx.extend([a[0] + vertex_base, b[0] + vertex_base, c[0] + vertex_base])
        vertex_base += len(verts)

    vertex_count = len(all_pos) // 3
    index_count = len(all_idx)
    if vertex_count == 0:
        continue

    pos_bytes = struct.pack(f"<{len(all_pos)}f", *all_pos)
    norm_bytes = struct.pack(f"<{len(all_norm)}f", *all_norm)
    idx_bytes = struct.pack(f"<{len(all_idx)}I", *all_idx)

    entry = {
        "name": canonical,
        "vertexCount": vertex_count,
        "indexCount": index_count,
        "posByteOffset": byte_offset,
        "posByteLength": len(pos_bytes),
        "normByteOffset": byte_offset + len(pos_bytes),
        "normByteLength": len(norm_bytes),
        "idxByteOffset": byte_offset + len(pos_bytes) + len(norm_bytes),
        "idxByteLength": len(idx_bytes),
        "centroid": [cx / n_total, cy / n_total, cz / n_total],
        "islands": len(groups[canonical]),
    }
    manifest["groups"].append(entry)
    bin_chunks.append(pos_bytes)
    bin_chunks.append(norm_bytes)
    bin_chunks.append(idx_bytes)
    byte_offset += len(pos_bytes) + len(norm_bytes) + len(idx_bytes)

with open(OUT_BIN, "wb") as f:
    for chunk in bin_chunks:
        f.write(chunk)

with open(OUT_JSON, "w") as f:
    json.dump(manifest, f)

print(f"Wrote {OUT_BIN} ({byte_offset/1e6:.2f} MB) and {OUT_JSON}")
print(f"Total groups: {len(manifest['groups'])}")
