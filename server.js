// server.js

// 引入 http 模块
const http = require('http');
const fs = require('fs');
const path = require('path');

// 设置主机名和端口号
const hostname = '127.0.0.1';
const port = 3002;

const server = http.createServer((req, res) => {
  // 获取请求的文件路径
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // 获取文件扩展名
  const extname = path.extname(filePath);

  // 设置默认的内容类型
  let contentType = 'text/html';

  // 根据文件扩展名设置内容类型
  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
    case '.ico':
      contentType = 'image/x-icon';
      break;
    case '.svg':
      contentType = 'image/svg+xml';
      break;
  }

  // 读取文件
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // 如果文件不存在，返回 404 错误
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Not Found');
      } else {
        // 其他错误，返回 500 错误
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Server Error');
      }
    } else {
      // 成功读取文件，返回文件内容
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.end(data);
    }
  });
});

// 服务器监听指定的端口和主机名
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});