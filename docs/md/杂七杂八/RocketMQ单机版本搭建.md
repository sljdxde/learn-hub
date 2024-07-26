1. 去官网下载二进制文件包
2. 配置`nameSrv`和`broker`的脚本并启动，具体如下
```shell
nohup sh bin/mqnamesrv > /home/rocketmq/rocketmq-4.9.3/logs/mqnamesrv.log 2>&1 &
```
```shell
nohup sh bin/mqbroker -c /home/rocketmq/rocketmq-4.9.3/conf/broker.conf > /home/rocketmq/rocketmq-4.9.3/logs/mqbroker.log 2>&1 &
```

- 需要特别注意的是，`broker.conf`的写法
```shell
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

brokerClusterName = DefaultCluster
brokerName = broker-a
brokerId = 0
deleteWhen = 04
fileReservedTime = 48
brokerRole = ASYNC_MASTER
flushDiskType = ASYNC_FLUSH

brokerIP1 = 127.0.0.1
namesrvAddr=127.0.0.1:9876
# 是否允许 Broker 自动创建Topic，建议线下开启，线上关闭
autoCreateTopicEnablsageSize=true
# 是否允许 Broker 自动创建订阅组，建议线下开启，线上关闭
autoCreateSubscriptionGroup=true

listenPort = 10911

# 存储路径
#storePathRootDir=/home/rocketmq/rocketmq-4.9.3/store
#commitLog 存储路径
storePathCommitLog=/home/rocketmq/rocketmq-4.9.3/store/commitlog
#消费队列存储路径存储路径
storePathConsumeQueue=/home/rocketmq/rocketmq-4.9.3/store/consumequeue
#消息索引存储路径
#storePathIndex=/home/rocketmq/rocketmq-4.9.3/store/index
#checkpoint 文件存储路径
#storeCheckpoint=/home/rocketmq/rocketmq-4.9.3/store/checkpoint
#abort 文件存储路径
#abortFile=/home/rocketmq/rocketmq-4.9.3/store/abort
#限制的消息大小
maxMessageSize=65536
```

   - 网上很多写法是有问题的，需要参考官网上的配置项进行编写
   - 官网链接：[https://rocketmq.apache.org/docs/rmq-deployment/](https://rocketmq.apache.org/docs/rmq-deployment/)
3. 本地使用`maven`构建console，注意需要修改`/resource/application.properties`
4. 服务器启动console

![image.png](https://cdn.nlark.com/yuque/0/2022/png/5369311/1652355506308-d7348730-57cf-40df-a154-0917cc32d0a9.png#clientId=u95ae5e5c-f9d5-4&from=paste&height=554&id=ub637b33d&originHeight=831&originWidth=1883&originalType=binary&ratio=1&rotation=0&showTitle=false&size=99759&status=done&style=none&taskId=uf8770764-eaa6-4c86-adff-b6c52dac277&title=&width=1255.3333333333333)
