const http = require('http'), fs = require('fs'), path = require('path');
const port = +(process.argv[2] || 4970);
const root = path.resolve(process.argv[3] || __dirname);
const types = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript',
  '.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp',
  '.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.mp4':'video/mp4','.glb':'model/gltf-binary' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  let f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' });
    fs.createReadStream(f).pipe(res);
  });
}).listen(port, () => console.log('Solar Energy Enterprises on http://localhost:' + port));
