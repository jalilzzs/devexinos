"""
DEVEXINOS world baker
=====================
Takes raw .glb room models and bakes them into final GAME COORDINATES:
  * applies scale / rotation / translation (so the runtime needs no guessing)
  * optionally keeps only part of a model (select box), drops meshes by name
  * cuts doorway holes through walls (door boxes)
  * merges meshes by material (far fewer draw calls)
  * shrinks textures
  * bakes a collision grid (solid + floor masks) next to the model
"""
import struct, json, io, base64, math, re
import numpy as np
from PIL import Image, ImageDraw

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

# ------------------------------------------------------------------ glb io
def read_glb(p):
    b = open(p, 'rb').read(); off = 12; js = None; bn = b''
    while off < len(b):
        cl, ct = struct.unpack('<II', b[off:off + 8]); d = b[off + 8:off + 8 + cl]
        if ct == 0x4E4F534A: js = json.loads(d.decode())
        elif ct == 0x004E4942: bn = d
        off += 8 + cl
    return js, bn

def write_glb(p, js, bn):
    j = json.dumps(js, separators=(',', ':')).encode(); j += b' ' * ((4 - len(j) % 4) % 4)
    bn = bn + b'\0' * ((4 - len(bn) % 4) % 4)
    total = 12 + 8 + len(j) + 8 + len(bn)
    open(p, 'wb').write(struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<II', len(j), 0x4E4F534A) + j + struct.pack('<II', len(bn), 0x004E4942) + bn)

def accessor(js, bn, i):
    a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']] if 'bufferView' in a else None
    dt = CT[a['componentType']]; n = NC[a['type']]; cnt = a['count']
    if bv is None: return np.zeros((cnt, n))
    stride = bv.get('byteStride', 0) or dt().itemsize * n
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    if stride == dt().itemsize * n:
        arr = np.frombuffer(bn, dtype=dt, count=cnt * n, offset=base).reshape(cnt, n).astype(np.float64)
    else:
        raw = np.frombuffer(bn, dtype=np.uint8, count=stride * cnt, offset=base).reshape(cnt, stride)[:, :dt().itemsize * n].copy()
        arr = raw.view(dt).reshape(cnt, n).astype(np.float64)
    if a.get('normalized'):
        arr = arr / float(np.iinfo(dt).max if dt != np.float32 else 1)
    return arr

def local_matrix(n):
    if 'matrix' in n: return np.array(n['matrix']).reshape(4, 4).T
    T = np.eye(4); T[:3, 3] = n.get('translation', [0, 0, 0])
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R @ np.diag(n.get('scale', [1, 1, 1]))
    return T @ M

def rot_y(deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    M = np.eye(4); M[0, 0] = c; M[0, 2] = s; M[2, 0] = -s; M[2, 2] = c; return M

# ------------------------------------------------------------------ load static meshes
def load_prims(path):
    """flatten the node tree; returns glb json, bin and primitives with model-space (node-transformed) data"""
    js, bn = read_glb(path); prims = []
    def walk(i, P):
        n = js['nodes'][i]; M = P @ local_matrix(n)
        if 'mesh' in n and 'skin' not in n:
            mesh = js['meshes'][n['mesh']]
            for pr in mesh['primitives']:
                if pr.get('mode', 4) != 4 or 'POSITION' not in pr['attributes']: continue
                pos = accessor(js, bn, pr['attributes']['POSITION'])
                nrm = accessor(js, bn, pr['attributes']['NORMAL']) if 'NORMAL' in pr['attributes'] else None
                uv = accessor(js, bn, pr['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in pr['attributes'] else np.zeros((len(pos), 2))
                idx = accessor(js, bn, pr['indices']).astype(np.int64).ravel() if 'indices' in pr else np.arange(len(pos))
                pw = (M[:3, :3] @ pos.T).T + M[:3, 3]
                if nrm is not None:
                    nm = np.linalg.inv(M[:3, :3]).T; nw = (nm @ nrm.T).T; nw /= (np.linalg.norm(nw, axis=1)[:, None] + 1e-12)
                else:
                    nw = None
                prims.append(dict(name=(n.get('name') or mesh.get('name') or ''), mat=pr.get('material', -1), pos=pw, nrm=nw, uv=uv, idx=idx))
        for c in n.get('children', []): walk(c, M)
    for r in js['scenes'][js.get('scene', 0)]['nodes']: walk(r, np.eye(4))
    return js, bn, prims

def to_soup(prims):
    """-> dict mat -> array (T,3,8) of [pos3 nrm3 uv2] per triangle corner; plus names"""
    soup = {}
    for p in prims:
        tri = p['idx'].reshape(-1, 3)
        pos = p['pos'][tri]
        if p['nrm'] is None:
            e1 = pos[:, 1] - pos[:, 0]; e2 = pos[:, 2] - pos[:, 0]; fn = np.cross(e1, e2); fn /= (np.linalg.norm(fn, axis=1)[:, None] + 1e-12)
            nrm = np.repeat(fn[:, None, :], 3, axis=1)
        else:
            nrm = p['nrm'][tri]
        uv = p['uv'][tri]
        arr = np.concatenate([pos, nrm, uv], axis=2)
        soup.setdefault(p['mat'], []).append((p['name'], arr))
    return soup

# ------------------------------------------------------------------ triangle clipping (attribute-preserving)
def clip_poly(poly, axis, val, keep_greater):
    """Sutherland-Hodgman against axis-aligned plane. poly: list of 8-float vertices."""
    out = []; n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        da = (a[axis] - val) * (1 if keep_greater else -1); db = (b[axis] - val) * (1 if keep_greater else -1)
        if da >= 0: out.append(a)
        if (da >= 0) != (db >= 0):
            t = da / (da - db); out.append(a + (b - a) * t)
    return out

def fan(poly):
    return [np.array([poly[0], poly[i], poly[i + 1]]) for i in range(1, len(poly) - 1)] if len(poly) >= 3 else []

def keep_box(tris, lo, hi):
    """keep only the parts of triangles inside the axis box (any axis may be None to skip)."""
    res = []
    for t in tris:
        polys = [list(t)]
        for ax in range(3):
            if lo[ax] is not None:
                polys = [clip_poly(p, ax, lo[ax], True) for p in polys]
            if hi[ax] is not None:
                polys = [clip_poly(p, ax, hi[ax], False) for p in polys]
        for p in polys: res += fan(p)
    return res

def cut_box(tris, lo, hi):
    """remove everything inside the axis box [lo,hi] (a doorway hole). Walls are cut exactly along the box edges."""
    lo = np.array(lo); hi = np.array(hi); out = []
    for t in tris:
        tb0 = t[:, :3].min(axis=0); tb1 = t[:, :3].max(axis=0)
        if np.any(tb1 < lo - 1e-6) or np.any(tb0 > hi + 1e-6):
            out.append(t); continue
        frags = [t]
        for ax in range(3):
            for val in (lo[ax], hi[ax]):
                nf = []
                for f in frags:
                    mn = f[:, ax].min(); mx = f[:, ax].max()
                    if mn < val - 1e-6 and mx > val + 1e-6:
                        a = clip_poly(list(f), ax, val, False); b = clip_poly(list(f), ax, val, True)
                        nf += fan(a) + fan(b)
                    else:
                        nf.append(f)
                frags = nf
        for f in frags:
            c = f[:, :3].mean(axis=0)
            if np.all(c > lo + 1e-6) and np.all(c < hi - 1e-6): continue
            out.append(f)
    return out

# ------------------------------------------------------------------ bake one model
def bake_model(src, dst, placement, select=None, drop=None, doors=None, keep=None, tex_cap=1024, quality=80, flip_uv=False):
    """
    placement: dict(scale=, rot=deg about Y, floor_model_y=, anchor_model=(x,z), anchor_world=(x,z))
               world = Ry(rot) * scale * (p - [ax, floor_y, az]) + [wx, 0, wz]
    select : fn(tri_centroid_model(3,)) -> bool   (keep triangle)  [applied in MODEL space, before placement]
    drop   : regex of mesh names to drop
    doors  : list of (lo,hi) boxes in WORLD space to cut out
    keep   : (lo,hi) world-space box that clips the final geometry (None entries allowed)
    returns dict with triangles (world) for collision baking.
    """
    js, bn, prims = load_prims(src)
    if drop: prims = [p for p in prims if not re.search(drop, p['name'], re.I)]
    soup = to_soup(prims)
    sc = placement['scale']; R = rot_y(placement.get('rot', 0)); fy = placement['floor_model_y']
    ax_, az_ = placement['anchor_model']; wx, wz = placement['anchor_world']
    out = {}
    for mat, lst in soup.items():
        allt = []
        for name, arr in lst:
            if select is not None:
                cen = arr[:, :, :3].mean(axis=1)
                m = np.array([select(c) for c in cen]); arr = arr[m]
            if len(arr): allt.append(arr)
        if not allt: continue
        T = np.concatenate(allt, axis=0).copy()
        # model -> world
        p = T[:, :, :3].reshape(-1, 3) - np.array([ax_, fy, az_])
        p = (R[:3, :3] @ (p * sc).T).T + np.array([wx, 0, wz])
        n = (R[:3, :3] @ T[:, :, 3:6].reshape(-1, 3).T).T
        T[:, :, :3] = p.reshape(-1, 3, 3); T[:, :, 3:6] = n.reshape(-1, 3, 3)
        tris = list(T)
        if keep: tris = keep_box(tris, keep[0], keep[1])
        for lo, hi in (doors or []): tris = cut_box(tris, lo, hi)
        if tris: out[mat] = np.array(tris)
    write_baked(js, bn, out, dst, tex_cap, quality, flip_uv)
    return out

# ------------------------------------------------------------------ write baked glb
TEXKEY = re.compile(r'Texture$')
def remap_tex(obj, tmap):
    if isinstance(obj, dict):
        for k, v in list(obj.items()):
            if TEXKEY.search(k) and isinstance(v, dict) and 'index' in v:
                v['index'] = tmap[v['index']]
            else:
                remap_tex(v, tmap)
    elif isinstance(obj, list):
        for v in obj: remap_tex(v, tmap)

def used_textures(obj, acc_set):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if TEXKEY.search(k) and isinstance(v, dict) and 'index' in v: acc_set.add(v['index'])
            else: used_textures(v, acc_set)
    elif isinstance(obj, list):
        for v in obj: used_textures(v, acc_set)

def write_baked(js, bn, soup, dst, tex_cap, quality, flip_uv=False):
    mats_used = [m for m in soup if m >= 0]
    newmats = []; mmap = {}
    for m in mats_used:
        mm = json.loads(json.dumps(js['materials'][m])); mm['doubleSided'] = True; mm.pop('alphaCutoff', None) if mm.get('alphaMode') != 'MASK' else None
        mmap[m] = len(newmats); newmats.append(mm)
    texs = set()
    for mm in newmats: used_textures(mm, texs)
    texs = sorted(texs); tmap = {t: i for i, t in enumerate(texs)}
    for mm in newmats: remap_tex(mm, tmap)
    newtex = []; newimg = []; imap = {}; newsamp = []; smap = {}
    buf = bytearray(); bviews = []
    def add_view(data, target=None):
        pad = (4 - len(buf) % 4) % 4; buf.extend(b'\0' * pad)
        bv = {'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(data)}
        if target: bv['target'] = target
        buf.extend(data); bviews.append(bv); return len(bviews) - 1
    for t in texs:
        tx = json.loads(json.dumps(js['textures'][t]))
        src = tx.get('source')
        if src is None:
            for ex in (tx.get('extensions') or {}).values():
                if isinstance(ex, dict) and 'source' in ex: src = ex['source']
            tx.pop('extensions', None)
        if src not in imap:
            im = js['images'][src]; bv = js['bufferViews'][im['bufferView']]
            data = bn[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
            img = Image.open(io.BytesIO(data)); img.load(); w, h = img.size; s = min(1.0, tex_cap / max(w, h))
            if s < 1: img = img.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
            alpha = img.mode in ('RGBA', 'LA') and img.getchannel('A').getextrema()[0] < 250
            o = io.BytesIO()
            if alpha: img.convert('RGBA').save(o, 'PNG', optimize=True); mime = 'image/png'
            else: img.convert('RGB').save(o, 'JPEG', quality=quality, optimize=True); mime = 'image/jpeg'
            imap[src] = len(newimg); newimg.append({'bufferView': add_view(o.getvalue()), 'mimeType': mime})
        tx['source'] = imap[src]
        if 'sampler' in tx:
            sk = json.dumps(js['samplers'][tx['sampler']], sort_keys=True)
            if sk not in smap: smap[sk] = len(newsamp); newsamp.append(js['samplers'][tx['sampler']])
            tx['sampler'] = smap[sk]
        newtex.append(tx)
    accs = []; meshes = []; nodes = []
    for m, T in soup.items():
        T = T.reshape(-1, 8).astype(np.float32); nt = len(T) // 3
        pos = np.ascontiguousarray(T[:, 0:3]); nrm = np.ascontiguousarray(T[:, 3:6]); uv = np.ascontiguousarray(T[:, 6:8])
        # weld identical vertices to keep files small
        key = np.round(T * 1e4).astype(np.int64)
        _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
        pos = pos[first]; nrm = nrm[first]; uv = uv[first]; idx = inv.astype(np.uint32).reshape(-1)
        base = len(accs)
        accs.append({'bufferView': add_view(pos.tobytes(), 34962), 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': pos.min(0).tolist(), 'max': pos.max(0).tolist()})
        accs.append({'bufferView': add_view(nrm.tobytes(), 34962), 'componentType': 5126, 'count': len(nrm), 'type': 'VEC3'})
        accs.append({'bufferView': add_view(uv.tobytes(), 34962), 'componentType': 5126, 'count': len(uv), 'type': 'VEC2'})
        accs.append({'bufferView': add_view(idx.tobytes(), 34963), 'componentType': 5125, 'count': len(idx), 'type': 'SCALAR'})
        prim = {'attributes': {'POSITION': base, 'NORMAL': base + 1, 'TEXCOORD_0': base + 2}, 'indices': base + 3, 'mode': 4}
        if m in mmap: prim['material'] = mmap[m]
        meshes.append({'primitives': [prim]}); nodes.append({'mesh': len(meshes) - 1})
    out = {'asset': {'version': '2.0', 'generator': 'devexinos-bake'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}],
           'nodes': nodes, 'meshes': meshes, 'accessors': accs, 'bufferViews': bviews, 'buffers': [{'byteLength': len(buf)}],
           'materials': newmats}
    if newtex: out['textures'] = newtex
    if newimg: out['images'] = newimg
    if newsamp: out['samplers'] = newsamp
    exts = set()
    for mm in newmats:
        exts |= set((mm.get('extensions') or {}).keys())
    if exts: out['extensionsUsed'] = sorted(exts)
    write_glb(dst, out, bytes(buf))

# ------------------------------------------------------------------ collision bake
def bake_collision(soup, cell=0.1, band=(0.25, 1.75), floor_h=0.22, extra_floor=None, margin=0.3):
    """returns dict(x0,z0,cs,nx,nz,solid(b64 bits),floor(b64 bits)) from baked world triangles"""
    tris = np.concatenate([T[:, :, :3] for T in soup.values()], axis=0)
    nrm_t = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0]); nl = np.linalg.norm(nrm_t, axis=1) + 1e-12; ny = np.abs(nrm_t[:, 1]) / nl
    ymin = tris[:, :, 1].min(axis=1); ymax = tris[:, :, 1].max(axis=1)
    x0 = tris[:, :, 0].min() - margin; x1 = tris[:, :, 0].max() + margin; z0 = tris[:, :, 2].min() - margin; z1 = tris[:, :, 2].max() + margin
    nx = int((x1 - x0) / cell) + 1; nz = int((z1 - z0) / cell) + 1
    solid = Image.new('L', (nx, nz), 0); floor = Image.new('L', (nx, nz), 0)
    ds = ImageDraw.Draw(solid); df = ImageDraw.Draw(floor)
    def pts(t): return [((p[0] - x0) / cell, (p[2] - z0) / cell) for p in t]
    s_mask = (ymax > band[0]) & (ymin < band[1]) & ~((ny > 0.9) & (ymax < band[0] + 0.0))
    f_mask = (ny > 0.8) & (ymax < floor_h) & (ymin > -0.3)
    for t in tris[s_mask]:
        q = pts(t); ds.polygon(q, fill=255); ds.line(q + [q[0]], fill=255, width=1)
    for t in tris[f_mask]:
        df.polygon(pts(t), fill=255)
    for (ex0, ez0, ex1, ez1) in (extra_floor or []):
        df.rectangle([(ex0 - x0) / cell, (ez0 - z0) / cell, (ex1 - x0) / cell, (ez1 - z0) / cell], fill=255)
    S = np.array(solid) > 0; F = np.array(floor) > 0
    for (ex0, ez0, ex1, ez1) in (extra_floor or []):
        i0 = int((ex0 - x0) / cell); i1 = int((ex1 - x0) / cell) + 1; j0 = int((ez0 - z0) / cell); j1 = int((ez1 - z0) / cell) + 1
        S[max(0, j0):j1, max(0, i0):i1] = False
    return dict(x0=round(float(x0), 3), z0=round(float(z0), 3), cs=cell, nx=nx, nz=nz,
                solid=base64.b64encode(np.packbits(S).tobytes()).decode(), floor=base64.b64encode(np.packbits(F).tobytes()).decode()), S, F
