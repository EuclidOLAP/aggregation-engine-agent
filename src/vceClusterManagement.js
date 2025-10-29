const net = require("net");
const OSS = require("ali-oss");
const command = require("./command");

const fs = require("fs");
const path = require("path");
const { assert } = require("console");

// 定义消息的数据结构
class Message {
  constructor(length, category, bytes) {
    this.length = length; // 消息的总长度
    this.category = category; // 消息类别
    this.bytes = bytes; // 消息的字节流
  }
}

const clients = [];

function startTcpServer() {
  console.log("TCP Server is starting...");

  // 创建TCP服务器
  const server = net.createServer((socket) => {
    // 当客户端连接时执行的逻辑
    console.log(">>>>> >>>> >>> >> > ----------------- New client connected");

    // 将客户端连接保存到数组中
    clients.push(socket);

    let buffer = Buffer.alloc(0);

    // 监听客户端发送的数据
    socket.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]); // 将新接收到的数据附加到缓冲区

      while (buffer.length >= 6) {
        // 至少需要6个字节来读取消息的长度和类别字段

        const messageLength = buffer.readUInt32LE(0); // 读取消息长度（4字节）
        const messageCategory = buffer.readUInt16LE(4); // 读取消息类别（2字节）

        // 如果缓冲区的长度足够包含整个消息（包括长度、类别和消息内容）
        if (buffer.length >= messageLength) {
          // 提取完整的消息字节
          const messageBytes = buffer.slice(0, messageLength);
          // 移除已处理的消息
          buffer = buffer.slice(messageLength);

          // 创建消息数据结构
          const message = new Message(
            messageLength,
            messageCategory,
            messageBytes
          );

          // 打印消息的长度和类别
          console.log(
            `Received message with length: ${message.length} and category: ${message.category}`
          );

          if (command.INTENT__WORKER_JOINS_CLUSTER === message.category) {
            // 新的 VCE Worked 节点加入集群，需要返回一个 INTENT__ALLOW 类型的消息
            const response = Buffer.alloc(6); // 创建一个6字节的缓冲区
            response.writeUInt32LE(6, 0); // 4字节：表示数字6的无符号int（小端模式）
            response.writeUInt16LE(command.INTENT__ALLOW, 4); // 2字节：表示数字2的无符号int（小端模式）

            // 发送响应给客户端
            socket.write(response, (err) => {
              if (err) {
                console.error("Error sending data:", err);
              } else {
                console.log(
                  "::::::::::::::>>>>>>>>>>>>>>>>>> Response sent to client --------------------"
                );
              }
            });
          } else if (
            command.INTENT__AGGREGATE_TASK_RESULT === message.category
          ) {
            const group_id = message.bytes.readBigUInt64LE(4 + 2 + 8);
            AGG_LISTENERS[group_id].processTaskResult(message);
          }
        } else {
          // 如果数据不完整，等待更多数据
          break;
        }
      }
    });

    // 监听客户端关闭连接
    socket.on("end", () => {
      console.log("Client disconnected");

      // 从数组中删除已断开连接的客户端
      const index = clients.indexOf(socket);
      if (index !== -1) {
        clients.splice(index, 1);
      }
    });

    // 监听错误事件
    socket.on("error", (err) => {
      console.error("Socket error:", err);
    });
  });

  // 设置服务器监听的端口和主机
  const PORT = 18760;
  const HOST = "0.0.0.0"; // 局域网内允许所有客户端连接

  server.listen(PORT, HOST, () => {
    console.log(`TCP server listening on ${HOST}:${PORT}`);
  });
}

/*
export OSSTBM_BUCKET_REGION=oss-cn-beijing
export OSSTBM_BUCKET_NAME=:::bucket_name:::
export OSSTBM_ACCESS_KEY_ID=:::ACCESS_KEY_ID:::
export OSSTBM_ACCESS_KEY_SECRET=:::ACCESS_KEY_SECRET:::
export OSSTBM_CUBE_GID=500000000000004
export OSSTBM_RANGE_PATHS=0_100000000,100000000_100000000,200000000_100000000,300000000_100000000
 */
async function sendOssSlicesToVceCluster() {
  console.log(
    "[oss->vce] beginning !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  );

  // 获取环境变量
  const bucket_region = process.env.OSSTBM_BUCKET_REGION;
  const bucket_name = process.env.OSSTBM_BUCKET_NAME;
  const access_key_id = process.env.OSSTBM_ACCESS_KEY_ID;
  const access_key_secret = process.env.OSSTBM_ACCESS_KEY_SECRET;
  const cube_gid = parseInt(process.env.OSSTBM_CUBE_GID || "0");
  const range_paths = process.env.OSSTBM_RANGE_PATHS.split(",");

  // 创建oss cli
  let oss_cli = new OSS({
    region: bucket_region,
    accessKeyId: access_key_id,
    accessKeySecret: access_key_secret,
    // authorizationV4: true,
    secure: true,
    bucket: bucket_name,
  });

  // for range_paths
  for (let i = 0; i < range_paths.length; i++) {
    console.log(
      `[oss->vce] >>>>>>>>>>>>>>>>>>>>>>> !!!!!!!!!!!!!!!!!!!!!!!!!!!! range_paths[${i}] = ${range_paths[i]}`
    );
    const range_path = range_paths[i];

    let buff_num = 0;
    range_loop: while (true) {
      const file_part = `/measures${cube_gid}/${range_path}/part-${buff_num}`;

      // 无限循环，直到此次操作成功
      while (true) {
        try {
          // 获取OSS文件的二进制数据
          const oss_part_result = await oss_cli.get(file_part);
          const fileBuffer = oss_part_result.content; // 文件的二进制数据

          clients.forEach((clientSocket) => {
            clientSocket.write(fileBuffer, (err) => {
              if (err) {
                console.error(
                  `[oss->vce Error] sending data to client: ${err}`
                );
              } else {
                console.log(
                  `[oss->vce] Sent binary data for file ${file_part} to client`
                );
              }
            });
          });

          // print file_part
          console.log(`[oss->vce] > ^^^ file_part = ${file_part}`);
          break;
        } catch (e) {
          // 如果是找不到文件，说明该结束了
          if (`${e}` === "NoSuchKeyError: The specified key does not exist.") {
            console.log(`[oss->vce] > break range_loop;`);
            break range_loop;
          }

          console.error(
            `[oss->vce Error] getting file ${file_part} from OSS: >>>>>>>>>${e}<<<<<<<<<`
          );
          await new Promise((resolve) => setTimeout(resolve, 3000));
          oss_cli = new OSS({
            region: bucket_region,
            accessKeyId: access_key_id,
            accessKeySecret: access_key_secret,
            authorizationV4: true,
            bucket: bucket_name,
          });
        }
      }
      buff_num++;
    }
    console.log(
      `[oss->vce] >>>>>>>>>>>>>>>>>>>>>> ?????????????????????????????? range_paths[${i}] = ${range_paths[i]}`
    );
  }
  console.log(
    "[oss->vce] ending ??????????????????????????????????????????????????????????????????????"
  );
}

function sendDataToVceCluster(filePath) {
  if (filePath === "oss") {
    sendOssSlicesToVceCluster();
    return;
  }

  const directoryPath = path.join(process.cwd(), "vce-inputs"); // 设定目录路径
  console.log(
    "Sending binary data to VCE cluster from directory: ",
    directoryPath
  );

  // 读取目录下所有文件
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
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

const AGG_LISTENERS = {};

class AggregateEventListener {
  constructor(guroupId, maxTaskNum, callback) {
    this.guroupId = guroupId;
    this.maxTaskNum = maxTaskNum;
    this.callback = callback;
    this.tasksResaults = new Array(maxTaskNum + 1).fill(null);

    // 使用 SharedArrayBuffer 来记录已完成任务数量
    this.completedTaskCount = new Int32Array(new SharedArrayBuffer(4)); // 4 字节表示已完成任务数量
    this.completedTaskCount[0] = 0; // 初始值为 0，表示还没有任务完成
  }

  processTaskResult(taskResultMessage) {
    const bytes = taskResultMessage.bytes;
    // 解析数据
    let offset = 4 + 2 + 8 + 8 + 4;
    const task_num = bytes.readUInt32LE(offset);
    this.tasksResaults[task_num] = taskResultMessage;

    // 不处理任务内容，只记录任务完成
    while (true) {
      // 使用 CAS 操作尝试增加已完成任务数量
      let currentCount = Atomics.load(this.completedTaskCount, 0); // 获取当前已完成任务数量
      if (
        Atomics.compareExchange(
          this.completedTaskCount,
          0,
          currentCount,
          currentCount + 1
        ) === currentCount
      ) {
        if (currentCount === this.maxTaskNum) {
          delete AGG_LISTENERS[this.guroupId];

          // 合并任务结果
          const mergedResults = this.tasksResaults
            .map((result) => {
              if (result) {
                const bytes = result.bytes;
                let offset = 4 + 2 + 8 + 8 + 4 + 4;
                const cog = bytes.readBigUInt64LE(offset);
                offset += 8; // skip the bytes of 'cog'

                // 解析 measures 和 null_flags
                const measures = [];
                const null_flags = [];

                for (let i = 0; i < cog; i++) {
                  measures.push(bytes.readDoubleLE(offset)); // 8 bytes for each float
                  offset += 8;
                }
                for (let i = 0; i < cog; i++) {
                  null_flags.push(bytes.readUInt8(offset)); // 1 byte for each int flag
                  offset += 1;
                }

                return {
                  measures,
                  null_flags,
                };
              }
              return null;
            })
            .filter(Boolean); // 去掉 null 值

          const len = mergedResults[0].measures.length;
          assert(mergedResults[0].null_flags.length === len);
          for (let i = 1; i < mergedResults.length; i++) {
            assert(mergedResults[i].measures.length === len);
            assert(mergedResults[i].null_flags.length === len);
          }

          const merged_measures = mergedResults[0].measures;
          const merged_null_flags = mergedResults[0].null_flags;
          for (let i = 1; i < mergedResults.length; i++) {
            const res = mergedResults[i];
            for (let j = 0; j < len; j++) {
              merged_measures[j] += res.measures[j];
              merged_null_flags[j] &= res.null_flags[j];
            }
          }

          // 打印合并后的结果
          console.log(
            "merged_measures merged_measures >>>>>>>>>>>>>>>>:",
            merged_measures
          );
          console.log(
            "merged_null_flags merged_null_flags >>>>>>>>>>>>:",
            merged_null_flags
          );

          // 调用回调并传递合并后的结果
          this.callback(merged_measures, merged_null_flags);
        }

        break; // 如果 CAS 成功，跳出循环
      }
    }
  }
}

function registerAggregateEventListener(aggEventListener) {
  AGG_LISTENERS[aggEventListener.guroupId] = aggEventListener;
}

module.exports = {
  startTcpServer,
  sendDataToVceCluster,
  AggregateEventListener,
  registerAggregateEventListener,
  clients,
};
