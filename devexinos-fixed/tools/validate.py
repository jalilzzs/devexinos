import json, numpy as np, sys
from scipy import ndimage
L=json.load(open('tools/_build/layout.json')); M=np.load('tools/_build/masks.npz'); cs=0.1
def build(region):
    X0,Z0,X1,Z1=region; nx=int((X1-X0)/cs); nz=int((Z1-Z0)/cs)
    solid=np.zeros((nz,nx),bool); floor=np.zeros((nz,nx),bool)
    for n,g in L['grids'].items():
        S=M[n+'_S']; F=M[n+'_F']
        if not (X0<=g['x0']<X1 and Z0<=g['z0']<Z1): continue
        i0=int(round((g['x0']-X0)/cs)); j0=int(round((g['z0']-Z0)/cs)); h,w=S.shape
        sl=(slice(j0,min(nz,j0+h)),slice(i0,min(nx,i0+w))); sub=(slice(0,min(nz,j0+h)-j0),slice(0,min(nx,i0+w)-i0))
        solid[sl]|=S[sub]
        if n not in L['solidOnly']: floor[sl]|=F[sub]
    return solid,floor,X0,Z0,nx,nz
def idx(X0,Z0,x,z): return int((z-Z0)/cs),int((x-X0)/cs)
ok=True
# ---------------- house
solid,floor,X0,Z0,nx,nz=build((-12,-16,18,12))
c=L['chapel']
i0=int((c['x1']+0.3-X0)/cs);i1=int((c['x2']-0.3-X0)/cs);j0=int((c['z1']+0.3-Z0)/cs);j1=int((c['z2']-0.3-Z0)/cs)
floor[j0:j1,i0:i1]=True
walk=floor&~solid
yy,xx=np.mgrid[-3:4,-3:4]; er=ndimage.binary_erosion(walk,structure=(xx**2+yy**2)<=3.2**2)       # player radius 0.3 m
lab,n=ndimage.label(er)
sp=L['spawn']['house']; j,i=idx(X0,Z0,*sp); print('house: spawn cell walkable',bool(er[j,i]),'| components',n)
comp=lab[j,i]
def chk(name,p):
    p=list(p)[:2]
    global ok
    j,i=idx(X0,Z0,*p); good=bool(er[j,i]) and lab[j,i]==comp
    if not good:
        # nearest walkable cell within 0.5 m?
        r=5; sub=lab[max(0,j-r):j+r+1,max(0,i-r):i+r+1]; near=(sub==comp).any()
        print(f'  {"OK~" if near else "FAIL"} {name} at {p}: cell walkable={bool(er[j,i])} reachable={lab[j,i]==comp} (reachable within 0.5m: {near})'); ok&=near
    else: print(f'  OK   {name} at {p}')
for k,v in L['items'].items():
    if k in ('torso',): continue
    chk('item '+k,v)
for k in ('safe','chest','basement_door'): chk('prop '+k,L['props'][k])
for k,v in enumerate(L['props']['lockers']): chk(f'locker{k+1}',v)
for z in (-10.9,-8.2,-3.0,3.4,-3.5):                      # doorways both sides
    for x in (-1.0,1.0): chk(f'hall near door z={z}',[x,z])
for k,wp in enumerate(L['gallery']['waypoints']): chk(f'waypoint{k}',wp)
chk('altar front',[5.6,-10.6])
# every room reachable from spawn through its doorway?
for name,(x,z) in {'kitchen':(-4.5,-8.2),'study':(-4.5,-3.0),'bedroom':(-4.5,3.4),'amira':(4.5,3.4),'gallery':(4.5,-3.5),'chapel':(4.5,-10.9)}.items(): chk('room interior '+name,[x,z])
# ---------------- basement
solid,floor,X0,Z0,nx,nz=build((44,-22,76,22)); walk=floor&~solid; yy,xx=np.mgrid[-3:4,-3:4]; er=ndimage.binary_erosion(walk,structure=(xx**2+yy**2)<=3.2**2); lab,n=ndimage.label(er)
sp=L['spawn']['base']; j,i=idx(X0,Z0,*sp); comp=lab[j,i]; print('basement: components',n,'spawn walkable',bool(er[j,i]))
for k in ('stairs','fusebox','ritual','vault','hatch'):
    j,i=idx(X0,Z0,*L['props'][k][:2]); r=6; sub=lab[max(0,j-r):j+r+1,max(0,i-r):i+r+1]
    g=(sub==comp).any(); print(f'  {"OK  " if g else "FAIL"} basement {k} {L["props"][k]} (reachable within 0.6m: {g})'); ok&=g
print('ALL REACHABLE' if ok else 'PROBLEMS FOUND')
