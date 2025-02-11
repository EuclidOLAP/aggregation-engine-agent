@echo off

SET server=dev.vm:16060
SET proto_path=D:\_temp
SET proto_file=agg-service.proto

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" ^
    -d "{ \"filePath\": \"______XXXXXXXXXXXXXXXXXXXXXXXX______\" }" ^
    %server% agg_service.AggService/importMeasureData
