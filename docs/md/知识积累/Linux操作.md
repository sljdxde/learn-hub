# 遇到的问题及解决方案

## 1.  删除 /mnt/sdb/backups文件夹下 15天前的 文件名包含 "gz" 的文件：
`find /mnt/sdb/backups -mtime +15 -name "*gz*" -exec rm -rf {} \; `

## 2.  scp文件传输命令:
`scp local_file remote_username@remote_ip:remote_folder `

## 3.  curl命令使用：
`curl http://172.28.22.？？:6007/koms/ospDaily/dailyInfo?dailyDay=2019-09-10\&token=G888d`
说明：在get请求有多个参数时，&前需要增加\进行转义

## 4.  linux创建用户并修改文件夹权限
`useradd testuser` 创建用户testuser
`passwd testuser` 给已创建的用户testuser设置密码
`chown -R nginx:nginx filename` 修改文件夹权限
`chmod -R 777 filename`` 修改读写执行权限 

## 5.  日志文件log的查看方法
`grep -n -e "标记数据成功" -e "审批数据成功" server.log | tail(head) -n 5`

如果出现：Binary file test.log matches
增加 `-a grep -a "hello world" test.log`
`grep -n -a -e "标记数据成功" server.log | tail(head) -n 5`
定位到日志行号后：vim +27796016 ws.log
或者：cat server.log | tail -n +468820 | head -n 1000 > yang.txt 进行日志文件输出 

## 6.  为开发测试主机添加swap（替代内存使用） 
* 一般主机/data目录下有30G
  `cd /data`

* 创建swap文件
  * swap文件大小=1M * 8192 = 8G，可以增加
  ```shell
  dd if=/dev/zero of=swap.data bs=1M count=8192
  mkswap swap.data
  chmod 600 swap.data
  ```

* 激活swap文件
  `swapon /data/swap.data`

* 激活的swap文件在主机重启后失效，重启后，需要使用
  `swapon /data/swap.data`再次激活

## 7. mysql配置定时备份与同步

* 配置脚本
```shell
#!/bin/bash
filename=/home/sync/$(date +%Y-%m-%d-%H-%M).sql
error='ERROR'
import_result=/home/sync/result
readonly filename
readonly error
readonly import_result
/usr/bin/mysqldump -h hostIp -P 3306 -uusername -ppassword  database > ${filename}
echo -e "Start transfer mysql"
/usr/bin/mysql -uusername -ppassword -hhost_ip -P3306 database < ${filename} > ${import_result} 2>&1
echo -e "Transfer mysql end..."
temp=`cat ${import_result}`
#echo $temp
index=` expr index "$temp" "$error"`
echo $index
if [ $index -gt  0 ]
then
  ((i++))
  echo 'import error' >> ${import_result}
else
  exit
fi
```
* 配置定时任务

`su -l linux_user`
`crontab -e`

* 相关内容
https://www.cnblogs.com/xiaoleiel/p/8316685.html


## 8. redis安装

● `wget http://download.redis.io/releases/redis-5.0.5.tar.gz`
● `tar -zxf redis-4.0.9.tar.gz`
● make 进行编译
● cd src  make install
● 创建bin和etc文件
● mv redis.conf /usr/local/redis/etc/
● cd src mv mkreleasehdr.sh redis-benchmark redis-check-aof redis-check-rdb redis-cli redis-server /usr/local/redis/bin/
● vim redis.conf  使用/命令进行搜索，查询daemonize守护进程
● redis-server /usr/local/redis/etc/redis.conf

## 9. linux服务器配置免密登录（用于jenkins传输文件）

● 相关文章: https://www.cnblogs.com/jszd/p/11178545.html

## 10. iptables（解决请求重定向到ipv6上的问题）

● 相关文章: https://www.cnblogs.com/alimac/p/5848372.html

## 11. sshfs 【使用失败】

● ssh免密登录: https://blog.csdn.net/pengjunlee/article/details/80919833

## 12. linux下通过nfs搭建文件服务器，并实现挂载

● 文件挂载: https://blog.csdn.net/qq_35992900/article/details/80446005

## 13. linux下的一些操作

●  ctrl + a:光标移动到命令开头 
●  ctrl + e：光标移动到命令结尾 
●  alt f:光标向前移动一个单词 
●  alt b：光标向后移动一个单词 
●  ctrl u：从光标处开始，删除命令 
●  ctrl w：删除一个词（以空格隔开的字符串） 
●  esc u :将当前词转换为大写 
●  esc l :将当前词转换为小写 

## 14. curl的使用

● `curl localhost:3000/api/json -X POST -d '{"hello": "world"}' --header "Content-Type: application/json"`

## 15. 端口号
● `netstat -tunlp|grep 端口号`
● `fuser -v -n tcp 22`
● 根据端口号查看进程：
  * `lsof -i:port`  
  * `netstat -nap |grep port`
● 根据进程查看端口号：`netstat -nap |grep pid`  || `lsof -i | grep pid`

## 16. keep-alived配置；

●  `vim /etc/sysconfig/selinux `
●  `setenforce 0 `
●  配置: https://www.cnblogs.com/rexcheny/p/10778567.html 

## 17. 文件同步问题解决

● rsync: https://blog.csdn.net/hyh9401/article/details/52043134?utm_source=blogxgwz6
● nfs: https://blog.csdn.net/qq_35992900/article/details/80446005
● keepalived: https://www.cnblogs.com/rexcheny/p/10778567.html

## 18.  关闭所有同类进程
`ps -ef|grep inotify|grep -v grep | awk '{print "kill -9 " $2}' |sh `

## 19.  keepalived查询
`ip addr` `show eth0` 可观察vip在哪台服务器上 

## 20.  nfs 挂载修复方法
`umount -lf /home/koms/upload/ `

● nfsp配置: https://www.cnblogs.com/zh94/p/11922744.html

## 21. 批量修改linux用户密码

● 新建一个txt文件
● 将用户名密码写入kom:123465
● chpasswd < chpass.txt

## 22. iptables开放端口

● iptables开放端口: https://www.cnblogs.com/xiujin/p/11494471.html


## 23. 根据pid查询路径

● pswd $pid


## 24.  java的安装路径

● https://blog.csdn.net/a1010256340/article/details/90236775

## 25. jps指令缺失

● 检查java目录配置，是否缺少jvm指令

## 26. 软链接

● 创建：`ln -s a b`，创建一个新的b指向a，即 b->a
● 删除：`rm -rf b`
● 创建多个软链接：`ln -sf a c`，增加了一个c->a

## 27. 截取指定时间段的日志

● `sed -n '/2021-10-28 14:00:00/,/2021-10-28 14:30:00/p' server.log>20211028.txt`
