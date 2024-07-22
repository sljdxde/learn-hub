操作前注意：
确认VIP在哪台机器上，主库就在哪台主机，从主库导出mysql备份用于从库的搭建

1，停止主库和从库的slave进程
stop slave;

2，在主库上后台备份数据库：
mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers --master-data=2 -B koms workflow rbdac >/data/tmp/0225.sql &

(mysqldump -uroot -p6rfQ6BLz --single-transaction -q -e -R -E --triggers --master-data=2 -B koms workflow rbdac sendmail>/data/tmp/1201_back.sql &
[1] 17095)

其中数据库名为bms，如果是多个数据库中间用空格分开

3，将备份copy至备库：
scp /data/syy_0827 [root@10.0.17.11](mailto:root@10.0.17.11):/data
// scp /data/workflow_0827 [root@10.0.17.11](mailto:root@10.0.17.11):/data

4，从备份中找到change master语句，将其追加进dmp文件：
more /data/1201.sql | grep CHANGE MASTER
echo "CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000012', MASTER_LOG_POS=453172599;">>1201.sql
echo "start slave;">>1201.sql

5，在备库进行后台的导入：
导入前需要确认主备库的 slave 状态为关闭
mysql -uroot -p6rfQ6BLz < /data/1201.sql &

6，待备库导入完成后，进入备库：
show slave status\G;
必须通过该命令确认备库的Slave_IO_Running和Slave_SQL_Running均为YES，才能进行下一步，如果出现任何一个有NO的状态，则需解决为YES的状态才能进行下一步

flush table with read lock;
show master status;
记录下备库的file和pos

7，进入主库数据库：
CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000016',MASTER_LOG_POS=943230596;
该处的file和pos是第六步记录的值
start slave;
show slave status\G;

8，进入备数据库
unlock tables;

9，查看主库和从库的slave状态，分别登陆主、从数据库：
show slave status\G;
其中Slave_IO_Running和Slave_SQL_Running均为YES即为正常状态
