const { startTcpServer } = require('./vceClusterManagement');
const { startGrpcServer } = require('./aggService');

// 启动 TCP 服务器
startTcpServer();

// 启动 gRPC 服务器
console.log('Starting Node.js project...');
startGrpcServer();
