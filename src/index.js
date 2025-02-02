const net = require('net');
const command = require('./command');

const { startGrpcServer } = require('./aggService');

const clients = [];

// 定义消息的数据结构
class Message {
  constructor(length, category, bytes) {
    this.length = length;      // 消息的总长度
    this.category = category;  // 消息类别
    this.bytes = bytes;        // 消息的字节流
  }
}

console.log('Aggregation Engine Agent is running.............................................................!');

// 创建TCP服务器
const server = net.createServer((socket) => {
  // the function will be run when a client connects to the server
  console.log('>>>>> >>>> >>> >> > ----------------- New client connected');

  // 将客户端连接保存到数组中
  clients.push(socket);

  let buffer = Buffer.alloc(0);

  // 监听客户端发送的数据
  socket.on('data', (data) => {

    // 你可以在这里处理客户端发来的数据
    buffer = Buffer.concat([buffer, data]);  // 将新接收到的数据附加到缓冲区

    while (buffer.length >= 6) {  // 至少需要6个字节来读取消息的长度和类别字段

      const messageLength = buffer.readUInt32LE(0);  // 读取消息长度（4字节）
      const messageCategory = buffer.readUInt16LE(4);  // 读取消息类别（2字节）

      // 如果缓冲区的长度足够包含整个消息（包括长度、类别和消息内容）
      if (buffer.length >= messageLength) {
        // 提取完整的消息字节
        const messageBytes = buffer.slice(0, messageLength);

        // 创建消息数据结构
        const message = new Message(messageLength, messageCategory, messageBytes);

        // 打印消息的长度和类别
        console.log(`Received message with length: ${message.length} and category: ${message.category}`);

        if (command.INTENT__WORKER_JOINS_CLUSTER === message.category) {
          // 新的 VCE Worked 节点加入集群，需要返回一个 INTENT__ALLOW 类型的消息
          // 在这里返回一个响应数据，按照要求的格式
          const response = Buffer.alloc(6); // 创建一个6字节的缓冲区
          response.writeUInt32LE(6, 0);  // 4字节：表示数字6的无符号int（小端模式）
          response.writeUInt16LE(command.INTENT__ALLOW, 4);  // 2字节：表示数字2的无符号int（小端模式）

          // 发送响应给客户端
          socket.write(response, (err) => {
            if (err) {
              console.error('Error sending data:', err);
            } else {
              console.log('::::::::::::::>>>>>>>>>>>>>>>>>> Response sent to client --------------------');
            }
          });
        }

        // // 打印消息内容（如果是文本数据，可以转换为字符串）
        // console.log('Message bytes:', message.bytes.toString());

        // 更新缓冲区，移除已处理的消息
        buffer = buffer.slice(messageLength);
      } else {
        // 如果数据不完整，等待更多数据
        break;
      }
    }
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

/*
 * 启动 Aggregation Engine GRPC 服务
 */

// // 监听端口
// const agg_service_grpc_port = 50051;
// agg_server.bindAsync(`0.0.0.0:${agg_service_grpc_port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
//   if (err) {
//       console.error('Failed to bind server:', err);
//       return;
//   }
//   console.log(`Server is listening on port ${agg_service_grpc_port}`);
//   agg_server.start();
// });

console.log('Starting Node.js project...');
startGrpcServer();