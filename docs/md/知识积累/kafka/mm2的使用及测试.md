# 背景
kafka mirror maker是一种同步kafka topic的连接器，其可用于在双中心之间进行topic的同步。
下面这张图是部署的网络拓扑：
![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1684141124653-a456f9fb-3513-444f-8c8a-e5dc1d9a367a.png#averageHue=%23f3f3f3&clientId=u5375dd26-6752-4&from=paste&height=215&id=ub1bd561a&originHeight=355&originWidth=830&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=1180935&status=done&style=none&taskId=u69477e6f-577f-4461-a704-5594713ca60&title=&width=503.0302739559362)
在实际生产中，客户在使用时发现在节点B上，topic出现了重复。需要本地复现这个问题。

# mm2搭建
mm2搭建相对简单，不过里面需要着重说明的是其`.properties`配置文件，这里放出我使用的：
```properties
# 指定两个集群，以及对应的host
clusters = us-west-2, us-east-2
us-west-2.bootstrap.servers = 10.100.0.10:9092
us-east-2.bootstrap.servers = 10.100.0.11:9092

# 指定同步备份的topic & consumer group，支持正则
#us-west-2->us-east-2.topics = topic_repeat_*
groups = .*
topics.blacklist="*.internal,__.*"
emit.checkpoints.interval.seconds = 10

# 指定复制链条，可以是双向的
us-west-2->us-east-2.enabled = true
# us-east->us-west.enabled = true  # 双向，符合条件的两个集群的topic会相互备份

# 可以自定义一些配置
us-west-2.offset.storage.topic = mm2_offset_2


replication.factor=1

checkpoints.topic.replication.factor=1
heartbeats.topic.replication.factor=1
offset-syncs.topic.replication.factor=1

offset.storage.replication.factor=1
status.storage.replication.factor=1
config.storage.replication.factor=1

us-east-2.producer.request.timeout.ms=500
us-east-2.producer.retries=1


#us-west-2->us-east-2.emit.heartbeats.enabled = false

```
其他配置在大部分的配置样例中都可以找到，需要着重说明的是30行和31行，这2行是对节点B的生产者的进行配置。

- 一开始参考mm2的源码，直接使用`producer.`进行配置，发现配置并未生效。后来增加了节点B的name后，成功生效！

![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1684141359916-e32fad0c-9ea7-42e5-a672-e2f5db812e37.png#averageHue=%23312d2b&clientId=u5375dd26-6752-4&from=paste&height=439&id=ua9fd582a&originHeight=724&originWidth=1665&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=201732&status=done&style=none&taskId=u3866c716-55ea-4c20-8aab-962ea1e6635&title=&width=1009.0908507670287)

配置完成后启动mm2`./bin/connect-mirror-maker.sh -daemon ./config/mm2.properties`
# 网络情况模拟
网络情况模拟，考虑了好几种方法：

- 使用kafka的配额管理，设置生产者的速率
- 使用` ethtool -s em1 speed 10 duplex half  `进行网卡控制
- 使用`tc`进行网卡的带宽、时延控制

在测试过程中，对上述3种方案进行了分析：

- 第一种方案下，由于是mm2的生产者在进行生产，因此需要指定其client.id，在配额管理生产消息时，使用client.id实现，比较麻烦。
- 第二种方案，网卡的驱动不支持

![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1684141680404-fda9694a-0a18-4fc8-9e0b-3732c69824af.png#averageHue=%2333332b&clientId=u5375dd26-6752-4&from=paste&height=164&id=u993c9eae&originHeight=271&originWidth=618&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=23570&status=done&style=none&taskId=ud74a0a11-535c-4a12-ae7f-e7151fcad99&title=&width=374.5454328973115)

- 第三种方案，非常完美。唯一需要注意的是，其配置指令比较复杂，问了chatgpt后得到了答案如下：
```properties
tc qdisc add dev ens192 root handle 1: tbf rate 1mbit burst 32kbit latency 400ms && tc qdisc add dev ens192 parent 1:1 handle 10: netem delay 100ms
```

```properties
tc qdisc add dev ens192 root tbf rate 1mbit burst 256kbit latency 100ms
```

```properties
tc qdisc del dev ens192 root
```

```properties
tc qdisc add dev ens192 root netem loss 50%
```
# 测试结果
## 网络情况测试
首先，对配置好的网络情况进行测试，使用`ping -c 10 node3`测试延时，结果如下，稳定100ms（当然，也可以设置波动延时）
![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1684141799566-b5fd9b24-b186-4aff-bdd7-6af7ba13cf02.png#averageHue=%23373730&clientId=u5375dd26-6752-4&from=paste&height=250&id=u4337e5c3&originHeight=413&originWidth=856&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=62241&status=done&style=none&taskId=ub05d4d5b-4b64-4ed0-8af1-8e2c6f7c2f1&title=&width=518.7878488027486)

然后，使用iperf测试网络带宽，步骤如下：

- 在节点B上，以服务端模式启动`iperf3 -s -p 18888`
- 在节点A上，以客户端模式测试`iperf3 -c node1 -p 18888 -f m **-**i 1 -t 5 -O 3 -R`

说明，iperf的安装采用rpm包`**rpm** **-**Uvh iperf3-3.1.7-2.el7.x86_64.rpm **--**nodeps **--**force`
![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1684142625760-91c3cfbf-db57-404a-bc77-5591c88f5285.png#averageHue=%2333332b&clientId=u5375dd26-6752-4&from=paste&height=269&id=u9dfaf7bf&originHeight=444&originWidth=1103&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=58767&status=done&style=none&taskId=u5fd82696-c106-4f67-a813-535903939a1&title=&width=668.484809847467)
## topic测试

- 消息生产：`cat ./bin/a1.csv | ./bin/kafka-console-producer.sh --broker-list node2:9092 --topic topic_repeat_10_5_10_16`
- 统计总和：`./bin/kafka-consumer-groups.sh --bootstrap-server node3:9092 --group mygroup --describe |grep us-west-2.topic_r_1M_10ms_16k |awk '{print $5}' | awk '{sum+=$1}END{print sum}'`
# 测试结论

1. 消息重发控制是通过`request.timeout.ms`+ `retries`进行控制。当`producer`发出消息后，超过`request.timeout.ms`都没有获取到response，则会进行消息重发
2. 由此可知，当网络存在波动时（比如delay突然飙升），则会出现一批topic在远端节点落盘，但是生产者节点上在规定时间内未能拿到响应，此时进行重发，导致topic重复
3. 更进一步，`batch.size`参数同样会影响重复率。这个比较好理解，当`batch.size`更大时，则一批发出的topic更多，网络波动条件下，这一批均未在规定时间内完成响应，则会重发更多的topic

下面，想象一下实际生产中的重发场景：

- 前提条件
   - 数据中心A -> 数据中心B之间通过专线连接，专线带宽假设为50Mbps
   - mm2配置在数据中心A侧
- 场景复现
   - 某个时间段上（比如18:00 - 20:00），A上kafka生产消息突增，此时kafka发送数据过快，导致专线被占满
   - 由于带宽被打满，此时A上获取B的response超时，A会进行消息重发，但实际上，topic在B已经落盘，出现topic重复
- 问题解决方案：
   - 首先，配置层面，增大`request.timeout.ms`，减小`batch.size`
   - 其次，网络层面，增大带宽，使用kafka的配额管理，对mm2在B上的生产者进行限速，避免带宽打满
   - 最后，在kafka生产消息时，指定key，这样相同的消息会被发送到同一个partition上，在该partition上会对消息的pid和sequence number进行检查，避免重复

## 
# 参考资料

- chatgpt
- [mm2配置](https://learn.microsoft.com/zh-cn/azure/hdinsight/kafka/kafka-mirrormaker-2-0-guide#offset-replication-with-mirrormaker-20)
- wondershaper
- [https://blog.csdn.net/wsuyixing/article/details/125812823](https://blog.csdn.net/wsuyixing/article/details/125812823)
