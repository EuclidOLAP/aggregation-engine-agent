const net = require('net');
const command = require('./command');

const fs = require('fs');
const path = require('path');

// 定义消息的数据结构
class Message {
  constructor(length, category, bytes) {
    this.length = length;      // 消息的总长度
    this.category = category;  // 消息类别
    this.bytes = bytes;        // 消息的字节流
  }
}

const clients = [];

function startTcpServer() {

  console.log('TCP Server is starting...');

  // 创建TCP服务器
  const server = net.createServer((socket) => {
    // 当客户端连接时执行的逻辑
    console.log('>>>>> >>>> >>> >> > ----------------- New client connected');

    // 将客户端连接保存到数组中
    clients.push(socket);

    let buffer = Buffer.alloc(0);

    // 监听客户端发送的数据
    socket.on('data', (data) => {
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
          else if (command.INTENT__AGGREGATE_TASK_RESULT === message.category) {
            // 获取 message.bytes
            const bytes = message.bytes;

            // 解析数据
            let offset = 0;

            // 4 bytes - data_package_capacity
            const dataPackageCapacity = bytes.readUInt32LE(offset);
            offset += 4;

            // 2 bytes - intention
            const intention = bytes.readUInt16LE(offset);
            offset += 2;

            // 8 bytes - cube_gid
            const cubeGid = bytes.readBigUInt64LE(offset);
            offset += 8;

            // 8 bytes - task_group_code
            const taskGroupCode = bytes.readBigUInt64LE(offset);
            offset += 8;

            // 4 bytes - max_task_group_number
            const maxTaskGroupNumber = bytes.readUInt32LE(offset);
            offset += 4;

            // 4 bytes - task_group_number
            const taskGroupNumber = bytes.readUInt32LE(offset);
            offset += 4;

            // 8 bytes - cog
            const cog = bytes.readBigUInt64LE(offset);
            offset += 8;

            // cog 个浮点数 (8 bytes each)
            const floatValues = [];
            for (let i = 0; i < cog; i++) {
              floatValues.push(bytes.readDoubleLE(offset)); // 8 bytes for each float
              offset += 8;
            }

            // cog 个整形标志 (1 byte each)
            const intFlags = [];
            for (let i = 0; i < cog; i++) {
              intFlags.push(bytes.readUInt8(offset)); // 1 byte for each int flag
              offset += 1;
            }

            // 打印解析结果
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            console.log('>>>>>> Data Package Capacity:', dataPackageCapacity);
            console.log('>>>>>> Intention:', intention);
            console.log('>>>>>> Cube GID:', cubeGid);
            console.log('>>>>>> Task Group Code:', taskGroupCode);
            console.log('>>>>>> Max Task Group Number:', maxTaskGroupNumber);
            console.log('>>>>>> Task Group Number:', taskGroupNumber);
            console.log('>>>>>> COG:', cog);
            console.log('>>>>>> Float Values:', floatValues);
            console.log('>>>>>> Int Flags:', intFlags);
            console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
          }


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
  const HOST = '0.0.0.0'; // 局域网内允许所有客户端连接

  server.listen(PORT, HOST, () => {
    console.log(`TCP server listening on ${HOST}:${PORT}`);
  });
}

function sendDataToVceCluster() {
  const directoryPath = path.join(process.cwd(), 'vce-inputs'); // 设定目录路径
  console.log('Sending binary data to VCE cluster from directory: ', directoryPath);

  // 读取目录下所有文件
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    // 遍历文件列表
    files.forEach((file) => {
      const filePath = path.join(directoryPath, file);

      // 读取文件的二进制数据
      fs.readFile(filePath, (err, data) => {
        if (err) {
          console.error(`Error reading file ${file}:`, err);
          return;
        }

        // 向所有连接的客户端发送文件的二进制数据
        clients.forEach((clientSocket) => {
          clientSocket.write(data, (err) => {
            if (err) {
              console.error(`Error sending data to client: ${err}`);
            } else {
              console.log(`Sent binary data for file ${file} to client`);
            }
          });
        });
      });
    });
  });
}

module.exports = { startTcpServer, sendDataToVceCluster, clients };
