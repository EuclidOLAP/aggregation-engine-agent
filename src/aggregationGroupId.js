// uniqueId.js
const sharedBuffer = new SharedArrayBuffer(4); // 创建一个共享内存区域，4字节表示一个整数
const counter = new Int32Array(sharedBuffer); // 使用 Int32Array 来操作共享内存中的计数器

// 初始化计数器
counter[0] = 0;

// 导出获取唯一ID的函数
module.exports.genAggGroupId = function () {
  // 使用 Atomics 对计数器进行原子递增操作
  return Atomics.add(counter, 0, 1) + 1; // 先加1再返回当前值
};
