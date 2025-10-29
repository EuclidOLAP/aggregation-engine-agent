#!/bin/bash

server="localhost:16060"
proto_path="/root/EuclidOLAP/aggregation-engine-agent/proto"  # Ubuntu上路径改为适合的路径
proto_file="agg-service.proto"

# 执行grpcurl命令
grpcurl --plaintext --import-path "$proto_path" --proto "$proto_file" \
    -d "{ \"filePath\": \"localfiles\" }" \
    "$server" agg_service.AggService/importMeasureData
