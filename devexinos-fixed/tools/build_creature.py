import sys; sys.path.insert(0,'tools')
from bake import *
import numpy as np, json, io, os
from PIL import Image
SRC='tools/raw/demonic_runner__free_animated_horror_creature_2.glb'
js,bn=read_glb(SRC)
# ---- gather all primitives of the skinned meshes
pos=[];nrm=[];uv=[];jnt=[];wgt=[];idx=[];off=0
for n in js['nodes']:
    if 'mesh' not in n: continue
    for pr in js['meshes'][n['mesh']]['primitives']:
        a=pr['attributes']; p=accessor(js,bn,a['POSITION']); pos.append(p); nrm.append(accessor(js,bn,a['NORMAL'])); uv.append(accessor(js,bn,a['TEXCOORD_0']))
        jnt.append(accessor(js,bn,a['JOINTS_0']).astype(np.uint16)); wgt.append(accessor(js,bn,a['WEIGHTS_0']))
        idx.append(accessor(js,bn,pr['indices']).astype(np.int64).ravel()+off); off+=len(p)
pos=np.vstack(pos);nrm=np.vstack(nrm);uv=np.vstack(uv);jnt=np.vstack(jnt);wgt=np.vstack(wgt);idx=np.concatenate(idx)
print('input verts',len(pos),'tris',len(idx)//3)
def decimate(cell):
    q=np.floor((pos-pos.min(0))/cell).astype(np.int64)
    key=q[:,0]*1000003+q[:,1]*1009+q[:,2]
    uk,inv=np.unique(key,return_inverse=True)
    n=len(uk)
    # representative = vertex closest to cluster mean
    mean=np.zeros((n,3)); cnt=np.bincount(inv,minlength=n)
    for k in range(3): mean[:,k]=np.bincount(inv,weights=pos[:,k],minlength=n)/cnt
    d=np.linalg.norm(pos-mean[inv],axis=1)
    order=np.lexsort((d,inv)); first=order[np.r_[0,np.flatnonzero(np.diff(inv[order]))+1]]
    tri=inv[idx].reshape(-1,3)
    ok=(tri[:,0]!=tri[:,1])&(tri[:,1]!=tri[:,2])&(tri[:,0]!=tri[:,2]); tri=tri[ok]
    s=np.sort(tri,axis=1); _,u=np.unique(s,axis=0,return_index=True); tri=tri[np.sort(u)]
    return first,mean,tri
lo,hi=0.004,0.08
for _ in range(14):
    mid=(lo+hi)/2; f,m,t=decimate(mid)
    if len(t)>14000: lo=mid
    else: hi=mid
f,m,t=decimate(hi); print('cell',round(hi,4),'-> verts',len(f),'tris',len(t))
P=m.astype(np.float32); N=nrm[f].astype(np.float32); U=uv[f].astype(np.float32); J=jnt[f]; Wt=wgt[f].astype(np.float32); Wt/= (Wt.sum(1,keepdims=True)+1e-9)
# remove unreferenced verts
used=np.unique(t); remap=-np.ones(len(P),dtype=np.int64); remap[used]=np.arange(len(used)); t=remap[t]; P=P[used];N=N[used];U=U[used];J=J[used];Wt=Wt[used]
print('final verts',len(P),'tris',len(t))
# ---- build new glb: keep skeleton nodes, skin, animation; replace meshes
skin=js['skins'][0]
meshnodes=[i for i,n in enumerate(js['nodes']) if 'mesh' in n]
buf=bytearray(); views=[]; accs=[]
def view(data,target=None):
    buf.extend(b'\0'*((4-len(buf)%4)%4)); bv={'buffer':0,'byteOffset':len(buf),'byteLength':len(data)}
    if target: bv['target']=target
    buf.extend(data); views.append(bv); return len(views)-1
def acc_add(arr,ct,typ,target=None,minmax=False):
    a={'bufferView':view(arr.tobytes(),target),'componentType':ct,'count':len(arr),'type':typ}
    if minmax: a['min']=arr.min(0).astype(float).tolist(); a['max']=arr.max(0).astype(float).tolist()
    accs.append(a); return len(accs)-1
ia=acc_add(t.astype(np.uint32).reshape(-1),5125,'SCALAR',34963)
pa=acc_add(P,5126,'VEC3',34962,True);na=acc_add(N,5126,'VEC3',34962);ua=acc_add(U,5126,'VEC2',34962);ja=acc_add(J.astype(np.uint16),5123,'VEC4',34962);wa=acc_add(Wt,5126,'VEC4',34962)
# copy skin IBM + animation accessors
def copy_acc(i):
    a=js['accessors'][i]; arr=accessor(js,bn,i)
    dt=CT[a['componentType']]; arr=arr.astype(dt)
    na_={'bufferView':view(arr.tobytes()),'componentType':a['componentType'],'count':a['count'],'type':a['type']}
    for k in ('min','max'):
        if k in a: na_[k]=a[k]
    accs.append(na_); return len(accs)-1
skin=json.loads(json.dumps(skin)); skin['inverseBindMatrices']=copy_acc(skin['inverseBindMatrices'])
anims=json.loads(json.dumps(js['animations']))
cache={}
for an in anims:
    for s in an['samplers']:
        for k in ('input','output'):
            if s[k] not in cache: cache[s[k]]=copy_acc(s[k])
            s[k]=cache[s[k]]
# texture (shrink)
im=js['images'][0]; bv=js['bufferViews'][im['bufferView']]; data=bn[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
img=Image.open(io.BytesIO(data)); img.load(); print('creature texture',img.size)
img=img.resize((1024,1024),Image.LANCZOS) if max(img.size)>1024 else img
o=io.BytesIO(); img.convert('RGB').save(o,'JPEG',quality=85,optimize=True)
images=[{'bufferView':view(o.getvalue()),'mimeType':'image/jpeg'}]
nodes=json.loads(json.dumps(js['nodes']))
for i in meshnodes:
    nodes[i].pop('mesh',None); nodes[i].pop('skin',None)
nodes[meshnodes[0]]['mesh']=0; nodes[meshnodes[0]]['skin']=0
mat=json.loads(json.dumps(js['materials'][0])); mat['doubleSided']=True
mat.get('extensions',{}).pop('KHR_materials_specular',None)
if not mat.get('extensions'): mat.pop('extensions',None)
out={'asset':{'version':'2.0','generator':'devexinos-bake'},'scene':js.get('scene',0),'scenes':js['scenes'],'nodes':nodes,
     'meshes':[{'primitives':[{'attributes':{'POSITION':pa,'NORMAL':na,'TEXCOORD_0':ua,'JOINTS_0':ja,'WEIGHTS_0':wa},'indices':ia,'material':0,'mode':4}]}],
     'skins':[skin],'animations':anims,'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':len(buf)}],
     'materials':[mat],'textures':[{'source':0,'sampler':0}],'images':images,'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]}
write_glb('assets/models/demonic_runner.glb',out,bytes(buf))
print('written %.2f MB'%(os.path.getsize('assets/models/demonic_runner.glb')/1e6))
