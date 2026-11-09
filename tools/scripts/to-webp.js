#!/usr/bin/env node
// node tools/scripts/to-webp.js <maxWidth> <quality 0-1> in1=out1 [in2=out2 …]
// Resizes each image down to maxWidth (never up) and encodes it as WebP through headless Chromium (no native deps).
// Use D:/ paths, not /d/… — Git Bash rewrites /d/ inside a=b arguments into D:\d\….
// Split at the LAST "=": files saved by download-page.js keep their query in the name (…__v=123.png).
'use strict';
const fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const [mw,q,...pairs]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.setContent('<canvas id=c></canvas>');
for(const pr of pairs){const k=pr.lastIndexOf('=');const i=pr.slice(0,k),o=pr.slice(k+1);const buf=fs.readFileSync(i);const ext=path.extname(i).slice(1).toLowerCase();
 let mime={jpg:'jpeg',jpeg:'jpeg',png:'png',webp:'webp',avif:'avif',svg:'svg+xml',gif:'gif'}[ext];
 const tail=buf.slice(8,12).toString();const sniff=buf.slice(0,4).toString('hex')==='89504e47'?'png':tail==='WEBP'?'webp':/^avi[fs]$/.test(tail)?'avif':null;if(sniff)mime=sniff;else if(!mime)mime='jpeg';
 const url='data:image/'+mime+';base64,'+buf.toString('base64');
 const r=await p.evaluate(async([url,mw,q])=>{const im=new Image();im.src=url;await im.decode();let w=im.naturalWidth,h=im.naturalHeight;if(w>mw){h=Math.round(h*mw/w);w=mw}
  const c=document.getElementById('c');c.width=w;c.height=h;const x=c.getContext('2d');x.clearRect(0,0,w,h);x.drawImage(im,0,0,w,h);return [c.toDataURL('image/webp',q),w,h]},[url,+mw,+q]);
 fs.mkdirSync(path.dirname(o),{recursive:true});fs.writeFileSync(o,Buffer.from(r[0].split(',')[1],'base64'));console.log(o,r[1]+'x'+r[2],fs.statSync(o).size)}
await b.close()})();
