# 提供一些redis集群部署脚本
## 同一台机器上部署多个实例(0副本)
```shell
#!/bin/bash
# 修改redis-cli的路径为您系统上的实际路径
pdir=`pwd`
REDIS_CLI=$pdir/node/src/redis-cli
BASE_PORT=6379
HOST=192.168.1.7

# 定义Redis集群节点数
NODE_COUNT=96
#NODE_COUNT=3

# 定义要分配的槽数量
SLOT_COUNT=16384

# 创建目录并修改配置
echo '创建目录并修改配置'
for ((i=1; i <= NODE_COUNT; i++)); do
  # 复制Redis节点目录
  cp -r node "node$i"

  # 修改配置文件中的端口号
  sed -i "s/6379/$((6379+i-1))/g" "node$i/redis.conf"

  # 启动Redis服务器
  "node$i"/src/redis-server "node$i"/redis.conf
done
# 等待启动完成
echo '等待启动完成'
sleep 3
# 查看启动数量
echo '已启动的实例数量'
ps -ef | grep redis | grep -v grep | wc -l
# 配置集群
for((i=1;i<=NODE_COUNT;i++)) do
  redis_port=$((BASE_PORT+i-1))
  ${REDIS_CLI} -p ${BASE_PORT} cluster meet ${HOST} ${redis_port}
done
echo '集群配置完成'
# 为每个节点分配槽
echo '开始分配槽'
SLOTS_REMAINDER=$((SLOT_COUNT % NODE_COUNT))
for ((i=1; i <= NODE_COUNT; i++)); do
  start_slot=$((0 + (i - 1) * (SLOT_COUNT / NODE_COUNT)))
  end_slot=$((start_slot + (SLOT_COUNT / NODE_COUNT) - 1))

  # 如果还有余数未分配完，则将余数加到最后一个节点上
  if [[ $i == $NODE_COUNT && $SLOTS_REMAINDER -gt 0 ]]; then
    end_slot=$((end_slot + SLOTS_REMAINDER))
  fi

  # 执行cluster addslots命令
  echo "Allocating slots $start_slot-$end_slot"
  slots=({$start_slot..$end_slot})
  command="$REDIS_CLI -c -p $((6379+i-1)) cluster addslots ${slots[*]}"
  eval "$command"
done
```

## 不同机器上部署多个实例(0副本)
```shell
#!/bin/bash
# 修改redis-cli的路径为您系统上的实际路径
pdir=`pwd`
REDIS_CLI=$pdir/node/src/redis-cli
BASE_PORT=6379
#HOST=192.168.1.7
HOSTS=(192.168.1.7 192.168.1.6)

# 定义Redis集群节点数
NODE_COUNT=96

# 定义要分配的槽数量
SLOT_COUNT=16384

# 创建目录并修改配置
echo '创建目录并修改配置,实例数：$NODE_COUNT，节点数：${HOSTS[@]}'
# 复制Redis节点目录
for ((j=0; j< ${#HOSTS[@]}; j++)); do
    host=${HOSTS[j]}
     echo ------------ host: $host -------------------
    if [ $j -gt 0 ]; then
      ssh $host "mkdir -p ${pdir}"
          for ((i=1; i <= NODE_COUNT; i++)); do
          scp -r node $host:$pdir/"node$i"
          # 修改配置文件中的端口号并启动redis实例
          ssh $host "cd ${pdir}; sed -i 's/6379/$((6379+i-1))/g' node$i/redis.conf; node$i/src/redis-server node$i/redis.conf"
      done

    else
       for ((i=1; i <= NODE_COUNT; i++)); do
                  cp -r node node$i 
          # 修改配置文件中的端口号
          sed -i "s/6379/$((6379+i-1))/g" "node$i/redis.conf"

          # 启动Redis服务器
          #cd "node$i" && redis-server redis.conf && cd ..
          "node$i"/src/redis-server "node$i"/redis.conf
      done
    fi
done


# 等待启动完成
echo '等待启动完成'
sleep 3

# 查看启动数量
echo '已启动的实例数量'
ps -ef | grep redis | grep -v grep | wc -l

# 配置集群
for((j=0; j< ${#HOSTS[@]}; j++)); do
     host=${HOSTS[j]}
     base_host=${HOSTS[0]}
    for((i=1;i<=NODE_COUNT;i++)); do
        redis_port=$((BASE_PORT+i-1))
        ${REDIS_CLI} -h $host -p ${redis_port} cluster meet ${base_host} ${BASE_PORT}
    done
done
echo '集群配置完成'


# 为每个节点分配槽
echo '开始分配槽'
TOTAL_NODES_COUNT=$((NODE_COUNT*${#HOSTS[@]}))
echo TOTALNODECOUNT $TOTAL_NODES_COUNT
SLOTS_REMAINDER=$((SLOT_COUNT % TOTAL_NODES_COUNT))
for((j=0; j< ${#HOSTS[@]}; j++)); do
     host=${HOSTS[j]}
    for ((i=1; i<=NODE_COUNT; i++)); do
      start_slot=$(((i - 1 + j*NODE_COUNT) * (SLOT_COUNT / TOTAL_NODES_COUNT)))
      end_slot=$((start_slot + (SLOT_COUNT / TOTAL_NODES_COUNT) - 1))
          echo start_slot $start_slot
          echo end_slot $end_slot
      # 如果还有余数未分配完，则将余数加到最后一个节点上
      if [[ $i == $NODE_COUNT && $j == 1 && $SLOTS_REMAINDER -gt 0 ]]; then
        echo slot_remainder $SLOTS_REMAINDER
                end_slot=$((end_slot + SLOTS_REMAINDER))
      fi

      # 执行cluster addslots命令
      echo "Allocating slots $start_slot-$end_slot"
      slots=({$start_slot..$end_slot})
      command="$REDIS_CLI -c -h $host -p $((6379+i-1)) cluster addslots ${slots[*]}"
      eval "$command"
    done

done
```

## 不同机器上部署多个实例(1副本)
```shell
#!/bin/bash
# 修改redis-cli的路径为您系统上的实际路径
pdir=`pwd`
REDIS_CLI=$pdir/node/src/redis-cli
BASE_PORT=6379
HOSTS=(192.168.1.7 192.168.1.6)

# 定义Redis集群节点数
NODE_COUNT=96

# 创建目录并修改配置
echo 创建目录并修改配置,实例数：${NODE_COUNT}，节点数：${#HOSTS[@]}
# 复制Redis节点目录
for ((j=0; j<${#HOSTS[@]}; j++)); do
    host=${HOSTS[j]}
     echo ------------ host: $host -------------------
    if [ $j -gt 0 ]; then
      ssh $host "mkdir -p ${pdir}"
          for ((i=1; i <= NODE_COUNT; i++)); do
          scp -r node $host:$pdir/"node$i"
          # 修改配置文件中的端口号并启动redis实例
          ssh $host "cd ${pdir}; sed -i 's/6379/$((6379+i-1))/g' node$i/redis.conf; node$i/src/redis-server node$i/redis.conf"
      done

    else
       for ((i=1; i <= NODE_COUNT; i++)); do
                  cp -r node node$i 
          # 修改配置文件中的端口号
          sed -i "s/6379/$((6379+i-1))/g" "node$i/redis.conf"

          # 启动Redis服务器
          #cd "node$i" && redis-server redis.conf && cd ..
          "node$i"/src/redis-server "node$i"/redis.conf
      done
    fi
done


# 等待启动完成
echo '等待启动完成'
sleep 3

# 查看启动数量
echo '已启动的实例数量'
ps -ef | grep redis | grep -v grep | wc -l

# 拼接变量
CLUSTER_INFO=""
for((j=0; j< ${#HOSTS[@]}; j++)); do
     host=${HOSTS[j]}
     base_host=${HOSTS[0]}
    for((i=1;i<=NODE_COUNT;i++)); do
        redis_port=$((BASE_PORT+i-1))
        CLUSTER_INFO="$CLUSTER_INFO$host:$redis_port "
    done
done

${REDIS_CLI} -h $HOSTS[0] -p ${BASE_PORT} --cluster create --cluster-replicas 1 $CLUSTER_INFO
echo '集群启动完成'
```

## 清理脚本
```shell
#!/bin/bash
echo current redis instance
ps -ef |grep redis | grep -v grep

instance_count=`ps -ef |grep redis | grep -v grep | wc -l`

if [ $instance_count -gt 0 ]; then
  echo start clear...

  ps -ef | grep redis | grep -v grep | awk '{print $2}' | xargs kill -9

  sleep 3

  echo clean *.conf
  rm -f nodes-*.conf

  sleep 3

  echo clean *.rdb
  rm -f *.rdb

  echo after clear
  ps -ef | grep redis |grep -v grep

else

  echo no redis instance now...

fi
```