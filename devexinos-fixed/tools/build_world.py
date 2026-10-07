"""
DEVEXINOS master world build
============================
Run:  python3 tools/build_world.py
Reads raw models (see RAW below), writes:
   assets/models/*.glb   baked into GAME coordinates (no runtime scaling needed)
   js/layout.js          collision grids + spawn / item / prop / waypoint positions
House layout (x east, z south, metres). Hall = x[-2,2], z[-14,10].  Basement = x ~ 60.
"""
import sys, os, json, base64, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bake import *
from scipy import ndimage

RAW = os.environ.get('DVX_RAW', 'tools/raw')                  # the ORIGINAL .glb files you downloaded (see README)
NEW = os.environ.get('DVX_NEW', 'tools/raw')
OUT = os.environ.get('DVX_OUT', 'assets/models')
os.makedirs(OUT, exist_ok=True)
CELL = 0.1
DOOR_H = 2.2; DOOR_W = 1.3

# ------------------------------------------------------------------ layout
HALL_X = (-1.95, 1.95)
DOORS = {   # hall wall doorways: centre z, side
    'kitchen': ('W', -8.2), 'study': ('W', -3.0), 'bedroom': ('W', 3.4),
    'amira': ('E', 3.4), 'gallery': ('E', -3.5), 'chapel': ('E', -10.9)}

def door_box(side, zc):
    x0, x1 = (-2.45, -1.55) if side == 'W' else (1.55, 2.45)
    return ([x0, 0.0, zc - DOOR_W / 2], [x1, DOOR_H, zc + DOOR_W / 2])

DOORBOXES = [door_box(s, z) for s, z in DOORS.values()]
# bridges across the hall wall so the walkable mask is continuous at each doorway
def bridge(side, zc):
    x0, x1 = (-2.6, -1.3) if side == 'W' else (1.3, 2.6)
    return (x0, zc - DOOR_W / 2 + 0.05, x1, zc + DOOR_W / 2 - 0.05)
BRIDGES = [bridge(s, z) for s, z in DOORS.values()]

def inside(b, p): return all(b[0][i] <= p[i] <= b[1][i] for i in range(3))
def doors_for(box):
    return [d for d in DOORBOXES if True]

results = {}     # name -> dict(soup, grid, S, F)

def bake(name, src, dst, placement, extra_cuts=None, **kw):
    soup = bake_model(src, os.path.join(OUT, dst), placement, doors=DOORBOXES + (extra_cuts or []), **kw)
    g, S, F = bake_collision(soup, cell=CELL, extra_floor=BRIDGES, margin=0.3)
    results[name] = dict(soup=soup, grid=g, S=S, F=F, file=dst)
    allp = np.concatenate([T[:, :, :3].reshape(-1, 3) for T in soup.values()])
    print(f'  {name:9} -> {dst:34} tris {sum(len(T) for T in soup.values()):6} bbox x[{allp[:,0].min():.1f},{allp[:,0].max():.1f}] z[{allp[:,2].min():.1f},{allp[:,2].max():.1f}] {os.path.getsize(os.path.join(OUT,dst))//1024} KB')

print('baking models ...')
# ---- hall (corridor strip rotated onto the N-S axis)
bake('hall', f'{RAW}/house_corridor_interior.glb', 'hall.glb',
     dict(scale=0.3162, rot=-90, floor_model_y=4.8, anchor_model=(82.2, -203.75), anchor_world=(0, -2)),
     select=lambda c: 27.0 <= c[0] <= 137.5 and -210.5 <= c[2] <= -197.0, keep=([-5, None, -14.0], [5, None, 10.0]))
# ---- west rooms (open side faces the hall = east): placed by their FLOOR rectangle
def floor_rect(src, pl, **kw):
    tmp = os.path.join(OUT, '_probe.glb')
    soup = bake_model(src, tmp, pl, tex_cap=32, **kw)
    g, S, F = bake_collision(soup, cell=CELL, margin=0.3)
    ys, xs = np.nonzero(F)
    r = (g['x0'] + xs.min() * CELL, g['z0'] + ys.min() * CELL, g['x0'] + (xs.max() + 1) * CELL, g['z0'] + (ys.max() + 1) * CELL)
    os.remove(tmp); return r          # (x0, z0, x1, z1)

def place_west(name, src, dst, scale, rot, fy, zc, edge=-2.1, **kw):
    pl = dict(scale=scale, rot=rot, floor_model_y=fy, anchor_model=(0.0, 0.0), anchor_world=(0.0, 0.0))
    x0, z0, x1, z1 = floor_rect(src, pl, **kw)
    pl['anchor_world'] = (edge - x1, zc - (z0 + z1) / 2)
    bake(name, src, dst, pl, **kw)

place_west('bedroom', f'{RAW}/old_room.glb', 'bedroom.glb', 0.0093, 0, 0.90, zc=3.4)
place_west('study', f'{RAW}/old_living_room.glb', 'study.glb', 0.02, 180, 1.91, zc=-3.0)
place_west('kitchen', f'{RAW}/horror_scene.glb', 'kitchen.glb', 0.003, 0, 66.7, zc=-8.2)
# ---- east rooms
bake('amira', f'{RAW}/an_old_cheap_room_in_chinatown.glb', 'amira.glb',
     dict(scale=1.0, rot=0, floor_model_y=0.01, anchor_model=(0.0, 0.0), anchor_world=(2.1 + 4.06, 3.4 - 0.055)))
bake('gallery', f'{NEW}/scary_interior.glb', 'gallery.glb',
     dict(scale=1.0, rot=0, floor_model_y=0.0, anchor_model=(0.0, 0.0), anchor_world=(6.2, -4.75)),
     select=lambda c: -4.3 <= c[0] <= 9.3 and -2.7 <= c[2] <= 5.2,
     extra_cuts=[([13.03, 0.0, -3.95], [14.2, 2.4, -3.2])])      # the swung-open hinged door leaf in the end room: removed so the room is walkable
bake('altar', f'{NEW}/altar.glb', 'altar.glb',
     dict(scale=0.01, rot=0, floor_model_y=0.0, anchor_model=(0.0, 0.0), anchor_world=(5.6, -12.7)))
bake('basement', f'{NEW}/basement.glb', 'basement.glb',
     dict(scale=1.0, rot=0, floor_model_y=-0.12, anchor_model=(0.0, 3.0), anchor_world=(60.0, 0.0)),
     select=lambda c: c[1] < 9.5)

# ------------------------------------------------------------------ global walkability (same rule as the runtime)
CHAPEL = {'x1': 2.1, 'z1': -13.9, 'x2': 9.1, 'z2': -7.9}
_yy, _xx = np.mgrid[-3:4, -3:4]; DISK = (_xx ** 2 + _yy ** 2) <= 3.2 ** 2     # player radius ~0.3 m
def build_global(region, claim_chapel=False):
    X0, Z0, X1, Z1 = region; nx = int((X1 - X0) / CELL); nz = int((Z1 - Z0) / CELL)
    solid = np.zeros((nz, nx), bool); floor = np.zeros((nz, nx), bool)
    for n, r in results.items():
        g = r['grid']
        if not (X0 <= g['x0'] < X1 and Z0 <= g['z0'] < Z1): continue
        i0 = int(round((g['x0'] - X0) / CELL)); j0 = int(round((g['z0'] - Z0) / CELL)); h, w = r['S'].shape
        hh = min(nz, j0 + h) - j0; ww = min(nx, i0 + w) - i0
        solid[j0:j0 + hh, i0:i0 + ww] |= r['S'][:hh, :ww]
        if n != 'altar': floor[j0:j0 + hh, i0:i0 + ww] |= r['F'][:hh, :ww]
    if claim_chapel:
        c = CHAPEL; floor[int((c['z1'] + .3 - Z0) / CELL):int((c['z2'] - .3 - Z0) / CELL), int((c['x1'] + .3 - X0) / CELL):int((c['x2'] - .3 - X0) / CELL)] = True
    return solid, floor, X0, Z0
def reach_map(region, seed=None, claim_chapel=False):
    solid, floor, X0, Z0 = build_global(region, claim_chapel)
    er = ndimage.binary_erosion(floor & ~solid, structure=DISK, border_value=0)
    lab, n = ndimage.label(er)
    if seed is None:
        sizes = ndimage.sum(er, lab, range(1, n + 1)); comp = 1 + int(np.argmax(sizes))
    else:
        comp = lab[int((seed[1] - Z0) / CELL), int((seed[0] - X0) / CELL)]
    return (lab == comp), X0, Z0
REACH_H, HX0, HZ0 = reach_map((-12, -16, 18, 12), seed=(0.0, 0.0), claim_chapel=True)
REACH_B, BX0, BZ0 = reach_map((44, -22, 76, 22))
print('reachable area house %.0f m2, basement %.0f m2' % (REACH_H.sum() * CELL * CELL, REACH_B.sum() * CELL * CELL))
def reachable_at(x, z):
    if x > 40: return bool(REACH_B[int((z - BZ0) / CELL), int((x - BX0) / CELL)])
    return bool(REACH_H[int((z - HZ0) / CELL), int((x - HX0) / CELL)])

# ------------------------------------------------------------------ analysis helpers
def world_free(name, clearance=0.35):
    """free-space mask (floor and not solid), eroded by clearance"""
    r = results[name]; g = r['grid']
    free = r['F'] & ~r['S']
    it = int(round(clearance / CELL))
    return ndimage.binary_erosion(free, iterations=it, border_value=0), g

def cells_to_world(g, js, is_):
    return (g['x0'] + (is_ + 0.5) * g['cs'], g['z0'] + (js + 0.5) * g['cs'])

def pick(name, count, min_sep=1.6, clearance=0.45, near=None, far_from=None, seed=1, region=None, wall_adjacent=False):
    """choose well-spread free spots in a model (deterministic)"""
    free, g = world_free(name, clearance)
    rng = np.random.RandomState(seed)
    js, is_ = np.nonzero(free)
    x, z = cells_to_world(g, js, is_)
    ok = np.ones(len(x), bool)
    ok &= np.array([reachable_at(a, b) for a, b in zip(x, z)])
    if region: ok &= (x >= region[0]) & (x <= region[2]) & (z >= region[1]) & (z <= region[3])
    # keep away from doorways (a 2 m disc around each door centre) so items never block entrances
    for s, zc in DOORS.values():
        xc = -2.0 if s == 'W' else 2.0
        ok &= (np.hypot(x - xc, z - zc) > 2.4)
    if wall_adjacent:
        r = results[name]; solid_d = ndimage.distance_transform_edt(~r['S']) * CELL
        ok &= solid_d[js, is_] < 0.9
    idx = np.nonzero(ok)[0]
    if len(idx) == 0: return []
    # score: connectivity to the door side => prefer cells in the biggest connected component
    chosen = []
    cand = list(idx); rng.shuffle(cand)
    for i in cand:
        p = (x[i], z[i])
        if all(math.hypot(p[0] - q[0], p[1] - q[1]) >= min_sep for q in chosen):
            chosen.append(p)
            if len(chosen) == count: break
    return chosen

def facing(name, p):
    """unit vector pointing AWAY from the nearest wall (so wall furniture faces the room)"""
    r = results[name]; g = r['grid']; S = r['S']; F = r['F']
    best = None
    for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        d = 0.0
        while d < 2.0:
            x = p[0] + dx * d; z = p[1] + dz * d
            i = int((x - g['x0']) / CELL); j = int((z - g['z0']) / CELL)
            if not (0 <= i < S.shape[1] and 0 <= j < S.shape[0]) or S[j, i] or not F[j, i]: break
            d += CELL
        if best is None or d < best[0]: best = (d, dx, dz)
    return [-best[1], -best[2]]

# ------------------------------------------------------------------ placements
layout = {'spawn': {}, 'items': {}, 'props': {}, 'grids': {}, 'models': {}, 'solidOnly': ['altar']}
def P2(p): return [round(float(p[0]), 2), round(float(p[1]), 2)]

# bedroom: spawn on the bed side (far from door), items scattered
bed = pick('bedroom', 6, min_sep=1.3, clearance=0.45, seed=11)
print('bedroom free spots', len(bed))
layout['spawn']['house'] = P2(bed[0])
layout['items']['passport'] = P2(bed[1]); layout['items']['id_card'] = P2(bed[2]); layout['items']['j1'] = P2(bed[3])
study = pick('study', 5, min_sep=1.3, seed=12)
layout['items']['j3'] = P2(study[0]); _sf = pick('study', 1, min_sep=1, clearance=0.4, seed=13, wall_adjacent=True)[0]; layout['props']['safe'] = P2(_sf) + facing('study', _sf)
kitchen = pick('kitchen', 5, min_sep=1.1, seed=14, clearance=0.4)
layout['items']['fuse1'] = P2(kitchen[0]); layout['items']['note'] = P2(kitchen[1])
layout['props']['chest'] = P2(kitchen[2]); layout['props']['basement_door'] = P2(pick('kitchen', 1, min_sep=1, clearance=0.4, seed=15, wall_adjacent=True)[0])
amira = pick('amira', 6, min_sep=1.2, seed=16, clearance=0.4)
layout['items']['music_box'] = P2(amira[0]); layout['items']['fuse2'] = P2(amira[1]); layout['items']['letter'] = P2(amira[2]); layout['items']['j2'] = P2(amira[3])

# gallery: corridor + east room (stealth zone)
gal = results['gallery']
free_g, gg = world_free('gallery', 0.4)
# patrol waypoints: along the corridor centre line + loop around the east room
layout['gallery'] = {}
gal_spots = pick('gallery', 8, min_sep=2.0, seed=17, clearance=0.45, region=(2.5, -8, 16, 3))
gal_spots = sorted(gal_spots, key=lambda p: p[0])
layout['items']['key1'] = P2(gal_spots[-1]); layout['items']['key2'] = P2(gal_spots[-2] if len(gal_spots) > 1 else gal_spots[-1])
layout['gallery']['waypoints'] = [P2(p) for p in gal_spots[:6]]
layout['props']['lockers'] = [P2(p) + facing('gallery', p) for p in pick('gallery', 2, min_sep=3.0, seed=18, clearance=0.35, wall_adjacent=True, region=(6, -8, 16, 3))]

# chapel (procedural shell) + altar model
layout['props']['altar'] = [5.6, -12.7]
layout['items']['legs'] = [5.6, -11.05]

# basement: big open hall - choose spots with generous clearance so the vault / ritual circle never touch solids
def best(name, clearance, seed, **kw):
    for c in (clearance, clearance * .8, clearance * .65, clearance * .5):
        r = pick(name, 1, min_sep=1, clearance=c, seed=seed, **kw)
        if r: return r[0], c
    raise SystemExit('no free spot found for %s' % kw)
st, _ = best('basement', 0.8, 19)
layout['spawn']['base'] = P2(st); layout['props']['stairs'] = P2(st)
fb, _ = best('basement', 0.5, 20, wall_adjacent=True); layout['props']['fusebox'] = P2(fb) + facing('basement', fb)
rt, c1 = best('basement', 2.3, 21); layout['props']['ritual'] = P2(rt)
vt, c2 = best('basement', 1.7, 22); layout['props']['vault'] = P2(vt)
ht, c3 = best('basement', 1.0, 23); layout['props']['hatch'] = P2(ht)
print('basement clearances used: ritual %.2f vault %.2f hatch %.2f' % (c1, c2, c3))
layout['items']['torso'] = layout['props']['vault']
for a_, b_ in (('stairs', 'ritual'), ('ritual', 'vault'), ('vault', 'hatch'), ('stairs', 'vault'), ('ritual', 'hatch')):
    pa, pb = layout['props'][a_], layout['props'][b_]; print('  dist', a_, b_, round(math.hypot(pa[0] - pb[0], pa[1] - pb[1]), 1), 'm')

# ------------------------------------------------------------------ chapel procedural shell collision (kept procedural: no chapel model)
layout['chapel'] = {'x1': 2.1, 'z1': -13.9, 'x2': 9.1, 'z2': -7.9}

# ------------------------------------------------------------------ write layout.js
for n, r in results.items():
    layout['grids'][n] = r['grid']
    layout['models'][n] = r['file']
js_out = '/* AUTO-GENERATED by tools/build_world.py - do not edit by hand */\nconst LAYOUT=' + json.dumps(layout, separators=(',', ':')) + ';\n'
open(os.path.join(os.path.dirname(OUT), '..', 'js', 'layout.js'), 'w').write(js_out)
os.makedirs('tools/_build', exist_ok=True)
np.savez('tools/_build/masks.npz', **{f'{n}_S': r['S'] for n, r in results.items()}, **{f'{n}_F': r['F'] for n, r in results.items()})
json.dump(layout, open('tools/_build/layout.json', 'w'), indent=1)
print('layout.js written; items:', {k: v for k, v in layout['items'].items()})
print('props:', layout['props']); print('spawn:', layout['spawn'])
