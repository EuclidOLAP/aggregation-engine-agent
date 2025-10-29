const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const {
  sendDataToVceCluster,
  clients,
  registerAggregateEventListener,
  AggregateEventListener,
} = require("./vceClusterManagement");
const { genAggGroupId } = require("./aggregationGroupId");

// 加载 proto 文件
const PROTO_PATH = path.join(__dirname, "../proto/agg-service.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const aggServiceProto =
  grpc.loadPackageDefinition(packageDefinition).agg_service;

// 工具函数：将 uint64 数组转为二进制
function uint64ArrayToBuffer(arr) {
  const buffer = Buffer.alloc(arr.length * 8); // 每个 uint64 占 8 个字节
  arr.forEach((value, index) => {
    buffer.writeBigUInt64LE(BigInt(value), index * 8); // 写入每个 uint64（小端字节序）
  });
  return buffer;
}

// 工具函数：将 uint16 转为二进制
function uint16ToBuffer(value) {
  const buffer = Buffer.alloc(2); // uint16 占 2 个字节
  buffer.writeUInt16LE(value, 0); // 小端字节序
  return buffer;
}

// 工具函数：将 uint32 转为二进制
function uint32ToBuffer(value) {
  const buffer = Buffer.alloc(4); // uint32 占 4 个字节
  buffer.writeUInt32LE(value, 0); // 小端字节序
  return buffer;
}

// 工具函数：将 uint64 转为二进制
function uint64ToBuffer(value) {
  const buffer = Buffer.alloc(8); // uint64 占 8 个字节
  buffer.writeBigUInt64LE(BigInt(value), 0); // 小端字节序
  return buffer;
}

// 实现 gRPC 服务方法
const aggServiceImpl = {
  aggregates: (call, callback) => {
    console.log("Received gRPC request:", call.request);

    const { cubeGid, grpcVectorCoordinates } = call.request;

    // 将 grpcVectorCoordinates 转换为二进制数据
    const binaryData = grpcVectorCoordinates.map((coordinate) => {
      // 转换 memberGidArr 为二进制数据
      const memberGidBuffer = uint64ArrayToBuffer(coordinate.memberGidArr);
      // 转换 measureIndex 为二进制数据
      const measureIndexBuffer = uint32ToBuffer(coordinate.measureIndex);
      // 连接所有的二进制数据
      return Buffer.concat([memberGidBuffer, measureIndexBuffer]);
    });

    // 合并所有的 Buffer 为一个大的二进制 Buffer
    const fullBinaryData = Buffer.concat(binaryData);

    // 输出转换后的二进制数据，调试使用
    console.log("Converted full binary data:", fullBinaryData);

    // 计算 aggTaskBinaryData
    const totalSize = 4 + 2 + 8 + 8 + 4 + 4 + 8 + fullBinaryData.length;

    const task_group_id = genAggGroupId();
    const maxTaskNumber = clients.length - 1;

    const aggListener = new AggregateEventListener(
      task_group_id,
      maxTaskNumber,
      (measures, null_flags) => {
        // 检查 measures 和 null_flags 的长度是否相等
        if (measures.length !== null_flags.length) {
          console.error("measures 和 null_flags 的长度不相等");
          return;
        }
        const response = {
          cubeGid,
          values: measures,
          nullFlags: null_flags.map((flag) => (flag ? true : false)),
        };
        callback(null, response);
      }
    );

    registerAggregateEventListener(aggListener);

    // 将 aggTaskBinaryData 中的字节数据原封不动的发送到 clients 数组中的每个 socket
    clients.forEach((clientSocket, index) => {
      if (clientSocket && clientSocket.write) {
        const aggTaskBinaryData = Buffer.concat([
          uint32ToBuffer(totalSize), // 4 bytes - 总大小
          uint16ToBuffer(10), // 2 bytes - 固定值 10
          uint64ToBuffer(cubeGid), // 8 bytes - cubeGid
          uint64ToBuffer(task_group_id), // 8 bytes - task group id
          uint32ToBuffer(maxTaskNumber), // 4 bytes - max task group number
          uint32ToBuffer(index), // 4 bytes - task group number (start with 0)
          uint64ToBuffer(grpcVectorCoordinates.length), // 8 bytes - grpcVectorCoordinates 数量
          fullBinaryData, // 添加 fullBinaryData 数据
        ]);
        clientSocket.write(aggTaskBinaryData);
      }
    });
  },

  // 实现 importMeasureData 接口
  importMeasureData: (call, callback) => {
    const { filePath } = call.request;
    console.log(`Received importMeasureData request for file: ${filePath}`);
    sendDataToVceCluster(filePath);
    const response = {
      success: true,
      message: `Metric data imported successfully from file: ${filePath}`,
    };
    callback(null, response);
  },
};

// 启动 gRPC 服务器
function startGrpcServer() {
  const server = new grpc.Server();
  server.addService(aggServiceProto.AggService.service, aggServiceImpl);

  const PORT = "0.0.0.0:16060";

  server.bindAsync(
    PORT,
    grpc.ServerCredentials.createInsecure(),
    (err, bindPort) => {
      if (err) {
        console.error("Server binding failed:", err);
        return;
      }
      console.log(`gRPC server is running on ${PORT}`);
    }
  );

  return server;
}

module.exports = { startGrpcServer };
