const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// 加载 proto 文件
const PROTO_PATH = path.join(__dirname, '../proto/agg-service.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const aggServiceProto = grpc.loadPackageDefinition(packageDefinition).agg_service;

// 实现 gRPC 服务方法
const aggServiceImpl = {
    aggregates: (call, callback) => {
        console.log("Received gRPC request:", call.request);

        const { cubeGid, vectorCoordinates } = call.request;

        // 假设每个请求返回一个随机值，模拟聚合计算
        const values = vectorCoordinates.map(() => Math.random() * 100);
        const nullFlags = values.map(() => false); // 这里假设没有 NULL 值

        const response = { cubeGid, values, nullFlags };
        callback(null, response);
    }
};

// 启动 gRPC 服务器
function startGrpcServer() {
    const server = new grpc.Server();
    server.addService(aggServiceProto.AggService.service, aggServiceImpl);

    const PORT = '0.0.0.0:16060';
    
    server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, bindPort) => {
        if (err) {
            console.error("Server binding failed:", err);
            return;
        }
        console.log(`gRPC server is running on ${PORT}`);
    });

    return server;
}

module.exports = { startGrpcServer };
