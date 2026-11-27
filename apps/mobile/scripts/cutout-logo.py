"""Cuts the gift mascot (docs/ux/logo-regalo-original.jpg) out of its light
background. Run once when the source art changes:
  python3 apps/mobile/scripts/cutout-logo.py docs/ux/logo-regalo-original.jpg docs/ux
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
src = sys.argv[1]
im=Image.open(src).convert('RGB'); a=np.asarray(im).astype(int)
r,g,b=a[...,0],a[...,1],a[...,2]
mx=a.max(-1); mn=a.min(-1)
sat=mx-mn
bg=(mn>190)&(sat<40)   # light, low saturation
m=Image.fromarray(np.where(bg,0,255).astype(np.uint8)).copy()
# flood background from border: mark bg-connected regions as 128
for x,y in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1),(im.width//2,0)]:
    ImageDraw.floodfill(m,(x,y),128,thresh=0)
arr=np.asarray(m).copy()
fg=(arr!=128).astype(np.uint8)*255
f=Image.fromarray(fg).copy()
# keep component containing the gift (seed at box body)
ImageDraw.floodfill(f,(1000,1000),77,thresh=0)
k=np.asarray(f)==77
# the bow loops enclose background that the border flood can't reach
k=k&~(bg&(np.arange(k.shape[0])[:,None]<520))
mask=Image.fromarray((k*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
rgba=im.copy(); rgba.putalpha(mask)
bbox=mask.point(lambda v:255 if v>20 else 0).getbbox()

# Outputs (sources for generate-assets.mjs): the colour cut-out and a
# one-colour silhouette with the mask band cut out (themed icon/notification).
out_dir = sys.argv[2] if len(sys.argv) > 2 else 'docs/ux'
cut = rgba.crop(bbox)
cut.thumbnail((900, 900), Image.LANCZOS)
cut.save(f'{out_dir}/logo-regalo.png', optimize=True)
navy = Image.fromarray((((b > r) & (mx < 120)) * 255).astype(np.uint8))
# drop specks (pupils, shading) so only the mask band is cut out
navy = np.asarray(navy.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(13))) > 0
sil = np.asarray(mask).astype(float) * ~navy
s = Image.fromarray(sil.astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
white = Image.new('RGBA', im.size, (255, 255, 255, 0))
white.putalpha(s)
w = white.crop(bbox)
w.thumbnail((900, 900), Image.LANCZOS)
w.save(f'{out_dir}/logo-regalo-silueta.png', optimize=True)
print('ok', cut.size)
