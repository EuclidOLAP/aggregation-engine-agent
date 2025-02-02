@echo off

SET server=dev.vm:16060
SET proto_path=D:\_temp
SET proto_file=agg-service.proto

echo ">>>>>>>>>>>>>>>>>> Testing aggregates (AggregationRequest) >>>>>>>>>>>>>>>>>>>>"

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"cubeGid\": 123456, \"vectorCoordinates\": [{\"memberGidArr\": [1, 2, 3], \"measureIndex\": 0}]}" %server% agg_service.AggService/aggregates

echo '------------------------------------------------------'

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"cubeGid\": 123457, \"vectorCoordinates\": [{\"memberGidArr\": [4, 5, 6], \"measureIndex\": 1}]}" %server% agg_service.AggService/aggregates

echo '------------------------------------------------------'

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"cubeGid\": 123458, \"vectorCoordinates\": [{\"memberGidArr\": [7, 8, 9], \"measureIndex\": 2}]}" %server% agg_service.AggService/aggregates

echo '------------------------------------------------------'

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"cubeGid\": 123459, \"vectorCoordinates\": []}" %server% agg_service.AggService/aggregates

echo '------------------------------------------------------'

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"cubeGid\": 123460, \"vectorCoordinates\": [{\"memberGidArr\": [], \"measureIndex\": 0}]}" %server% agg_service.AggService/aggregates

echo '------------------------------------------------------'

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"cubeGid\": 123461, \"vectorCoordinates\": [{\"memberGidArr\": [10], \"measureIndex\": 3}, {\"memberGidArr\": [20], \"measureIndex\": 4}]}" %server% agg_service.AggService/aggregates

echo '------------------------------------------------------'

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"cubeGid\": 123462, \"vectorCoordinates\": [{\"memberGidArr\": [1, 2], \"measureIndex\": 0}, {\"memberGidArr\": [3, 4], \"measureIndex\": 1}]}" %server% agg_service.AggService/aggregates

