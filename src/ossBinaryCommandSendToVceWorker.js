// useless code, need to be removed, 2025-10-17 05:50:54

// function sendOssBinCommandToVceWorker() {
//   console.log("Sending binary data to VCE cluster from OSS bucket...");

//     const directoryPath = path.join(process.cwd(), 'vce-inputs'); // 设定目录路径
//     console.log('Sending binary data to VCE cluster from directory: ', directoryPath);
  
//     // 读取目录下所有文件
//     fs.readdir(directoryPath, (err, files) => {
//       if (err) {
//         console.error('Error reading directory:', err);
//         return;
//       }
  
//       // 遍历文件列表
//       files.forEach((file) => {
//         const filePath = path.join(directoryPath, file);
  
//         // 读取文件的二进制数据
//         fs.readFile(filePath, (err, data) => {
//           if (err) {
//             console.error(`Error reading file ${file}:`, err);
//             return;
//           }
  
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口
// // vceClusterManagement 应该提供一个获取 cliets 列表的接口

//           // 向所有连接的客户端发送文件的二进制数据
//           clients.forEach((clientSocket) => {
//             clientSocket.write(data, (err) => {
//               if (err) {
//                 console.error(`Error sending data to client: ${err}`);
//               } else {
//                 console.log(`Sent binary data for file ${file} to client`);
//               }
//             });
//           });
//         });
//       });
//     });
// }

// module.exports = { sendOssBinCommandToVceWorker };
