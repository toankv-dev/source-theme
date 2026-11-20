"""Re-encode an animated WebP smaller (size, quality, every Nth frame), keeping the animation.

  python -I _src/anim-webp.py <in.webp> <out.webp> [--size 556] [--quality 60] [--step 1]

The originals (_work/images/...) are untrusted downloads: they are only decoded as images here.
Frame durations are summed when frames are dropped, so the loop keeps its speed.
"""
import sys
from PIL import Image, ImageSequence

args = sys.argv[1:]
def opt(name, default):
    return type(default)(args[args.index('--' + name) + 1]) if '--' + name in args else default

src, out = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or not args[i - 1].startswith('--'))][:2]
size, quality, step = opt('size', 556), opt('quality', 60), opt('step', 1)

im = Image.open(src)
frames, durations = [], []
for i, f in enumerate(ImageSequence.Iterator(im)):
    d = f.info.get('duration', 80) or 80
    if i % step == 0:
        g = f.convert('RGB')
        g.thumbnail((size, size), Image.LANCZOS)
        frames.append(g)
        durations.append(d)
    else:
        durations[-1] += d
frames[0].save(out, 'WEBP', save_all=True, append_images=frames[1:], duration=durations, loop=0,
               quality=quality, method=6)
print(out, len(frames), 'frames', frames[0].size, sum(durations), 'ms')
