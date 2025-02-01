const net = require('net');

const clients = [];

// index.js
console.log('Aggregation Engine Agent is running.............................................................!');

// // 持续运行进程
// setInterval(() => {
//   console.log('>> Aggregation Engine Agent << running...');
// }, 1000);

// 创建TCP服务器
const server = net.createServer((socket) => {
  // the function will be run when a client connects to the server
  console.log('>>>>> >>>> >>> >> > ----------------- New client connected');
  
  // 将客户端连接保存到数组中
  clients.push(socket);

  // // 监听客户端发送的数据
  // socket.on('connect', (data) => {
  //   console.log('>>>>> >>>> >>> >> > connected data:', data.toString());
    
  //   // 你可以在这里处理客户端发来的数据
  // });

  // 监听客户端发送的数据
  socket.on('data', (data) => {
    console.log('Received data ######################################:', data.toString());
    
    // 你可以在这里处理客户端发来的数据
  });

  // 监听客户端关闭连接
  socket.on('end', () => {
    console.log('Client disconnected');
    
    // 从数组中删除已断开连接的客户端
    const index = clients.indexOf(socket);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  });

  // 监听错误事件
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

// 设置服务器监听的端口和主机
const PORT = 18760;
// const HOST = '127.0.0.1';
const HOST = '0.0.0.0'; // 局域网内允许所有客户端连接

server.listen(PORT, HOST, () => {
  console.log(`TCP server listening on ${HOST}:${PORT}`);
});