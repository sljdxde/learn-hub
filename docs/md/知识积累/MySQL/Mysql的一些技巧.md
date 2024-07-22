1. 查询时补充自增id
```java
set @n = 199;
-- INSERT INTO `t_rbdac_role`(`role_id`, `role_name`, `order_num`, `flag`, `parent_role_id`, `associate_key`, `department_unique_id`, `is_approval`, `remark`, `is_deleted`) 

SELECT
(@n := @n + 1),
place_name,
place_order,
NULL,
68,
'placeManager',
id,
1,
null,
0
from t_koms_place_info;
```
## 遇到的问题及解决方案

-  查看连接mysql数据库的host：  
```
SELECT substring_index(host, ':',1) AS host_name,state,count(*) FROM information_schema.processlist GROUP BY state,host_name;
```

-  新增用户：
`create user 'username'@'hostname' identified by 'password';` 
-  修改用户权限：
`GRANT privileges ON database.tablename TO 'username'@'host';`
`FLUSH PRIVILEGES;` 

eg. `GRANT select,insert,delete,update,alter,drop ON syy_dev_dblock.* TO 'syy_dev_dblock'@'%';`

-  修改密码：
`set password for root@'%' = password('123');` [详细参考文章](https://www.cnblogs.com/mmx8861/p/9062363.html) 
-  拼接修改表结构语句： 

```
SELECT CONCAT(m1.script,';') FROM (
SELECT
	CONCAT(
	'ALTER TABLE `',
	table_name,
	'` MODIFY `',
	column_name,
	'` ',
	DATA_TYPE,
	'(',
	CHARACTER_MAXIMUM_LENGTH,
	') CHARACTER SET UTF8 COLLATE utf8_unicode_ci',
	( CASE WHEN IS_NULLABLE = 'NO' THEN ' NOT NULL' ELSE '' END )
) AS script
FROM
	information_schema.COLUMNS 
WHERE
	TABLE_SCHEMA = 'koms_dev_2' 
	AND DATA_TYPE = 'varchar' 
	AND ( CHARACTER_SET_NAME != 'utf8' OR COLLATION_NAME != 'utf8_unicode_ci' ) ) m1
```

- 重启数据库

```
service mysqld restart
```

- 查询特定列

`SELECT GROUP_CONCAT(COLUMN_NAME ) from INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='t_koms_daily_info' and TABLE_SCHEMA='koms';`

- 修改数据库字段

```
在项目开发过程中，有可能会遇到数据表、列字段字符编码格式不统一的情况，下面给出优雅的解决方式

1）table:拼接出指定数据库的不符合特定编码的格式表中表的修改字符集及编码排序规则的脚本：

SELECT CONCAT('ALTER TABLE ', table_name, ' CONVERT TO CHARACTER SET  utf8 COLLATE utf8_bin;')
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'db_name' and TABLE_COLLATION != 'utf8_bin'

2）columns:拼接出指定数据库的不符合特定编码格式的表中列的修改表中字符集及编码排序规则的脚本：

SELECT CONCAT('ALTER TABLE `', table_name, '` MODIFY `', column_name, '` ', DATA_TYPE, '(', CHARACTER_MAXIMUM_LENGTH, ') CHARACTER SET UTF8 COLLATE utf8_bin', (CASE WHEN IS_NULLABLE = 'NO' THEN ' NOT NULL' ELSE '' END), ';')
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'db_name'
AND DATA_TYPE = 'varchar'
AND
(
    CHARACTER_SET_NAME != 'utf8'
    OR
    COLLATION_NAME != 'utf8_general_ci'
);

3）将拼接出的脚本批量执行以下即可，如果执行失败，那就是在你表中设有外键，先把外键除掉，在执行，之后再填上外键即可。
```

- mysql实现逗号分隔

```
SELECT DISTINCT SUBSTRING_INDEX(SUBSTRING_INDEX(a.path,',',b.help_topic_id + 1),',',-1)  
FROM  
(SELECT GROUP_CONCAT(REPLACE(path,'/',',')) AS path FROM department b WHERE department_type = 1) a
JOIN 
mysql.help_topic b 
ON b.help_topic_id < (LENGTH(a.path) - LENGTH(REPLACE(a.path,',','')) + 1)
```

- mysql导入数据

```
mysql -uroot -p ...

use database_name;

source /home/wm/20191230.sql
```

- mysql导出数据

```
mysqldump -u userName -p  dabaseName  > fileName.sql
```

-  mysql查询bit类型
`select param+0 from ...` 
-  mysql视图操作 
   - 查询视图：`show table status where comment='view';`
   - 删除视图: `DROP VIEW IF EXISTS v_students_info(需加引号);`
-  主从同步相关 
   - 查看主在哪台服务器上`ip addr`
   - 查看主从状态`show master status\G;` `show slave statusG;`
   - 主从修复方式-1：[传送门](https://www.cnblogs.com/zhaoying/p/11737464.html)
   - 主从修复方式-2：

操作前注意：
确认VIP在哪台机器上，主库就在哪台主机，从主库导出mysql备份用于从库的搭建

1，停止主库和从库的slave进程
stop slave;

2，在主库上后台备份数据库：
mysqldump -uroot -pBkGmfkuQ --single-transaction -q -e -R -E --triggers --master-data=2 -B do_plat face_data iqc>/data/0306_1.sql &

其中数据库名为bms，如果是多个数据库中间用空格分开

3，将备份copy至备库：
scp /data/0306.sql [root@172.30.205.50](mailto:root@172.30.205.50):/data

4，从备份中找到change master语句，将其追加进dmp文件：
more /data/bms_0829.sql
echo "CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000003', MASTER_LOG_POS=601;">>0306_1.sql
echo "start slave;">>0306_1.sql

5，在备库进行后台的导入：
导入前需要确认主备库的 slave 状态为关闭
mysql -uroot -pBkGmfkuQ< /data/work/0306_1.sql &

6，待备库导入完成后，进入备库：
show slave status\G;
必须通过该命令确认备库的Slave_IO_Running和Slave_SQL_Running均为YES，才能进行下一步，如果出现任何一个有NO的状态，则需解决为YES的状态才能进行下一步

flush table with read lock;
show master status;
记录下备库的file和pos

7，进入主库数据库：
CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000028',MASTER_LOG_POS=624494056;
该处的file和pos是第六步记录的值
start slave;
show slave status\G;

8，进入备数据库
unlock tables;

9，查看主库和从库的slave状态，分别登陆主、从数据库：
show slave status\G;
其中Slave_IO_Running和Slave_SQL_Running均为YES即为正常状态

- 主从修复方法三：

```
change master to
master_host='10.0.17.10',
master_user=‘user’,
master_password=‘pwd’,
master_port=3306,
master_log_file=localhost-bin.000094’,
master_log_pos=33622483 ;
```

10，强制修改mysql密码

- [https://www.cnblogs.com/zhangpeng8888/p/12920671.html](https://www.cnblogs.com/zhangpeng8888/p/12920671.html)

11. mysql主备异常修复

```
mysql -uroot -pf91d+EFy

mysql -uroot -p6rfQ6BLz

select * from koms.t_koms_sms_verification order by code_id desc limit 0,1;

操作前注意：
确认VIP在哪台机器上，主库就在哪台主机，从主库导出mysql备份用于从库的搭建

1，停止主库和从库的slave进程
stop slave;

2，在主库上后台备份数据库：
mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers --master-data=2 -B koms workflow rbdac >/data/tmp/0225.sql &

(mysqldump -uroot -p6rfQ6BLz --single-transaction -q -e -R -E --triggers --master-data=2 -B koms workflow rbdac sendmail>/data/tmp/1201_back.sql &
[1] 17095)

mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers -B koms >/data/tmp/koms.sql;
mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers -B workflow >/data/tmp/workflow.sql;
mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers -B rbdac >/data/tmp/rbdac.sql;
mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers -B sendmail >/data/tmp/sendmail.sql;
mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers -B jwt >/data/tmp/jwt.sql;

mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers -B koms_monitor >/data/tmp/koms_monitor.sql;

mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers --master-data=2 -B koms workflow rbdac>/data/syy_0827.sql &

mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers --master-data=2 -B koms_monitor>/data/tmp/koms_monitor.sql &

mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers --master-data=2 -B workflow>/data/workflow_0827.sql &

mysqldump -uroot -pf91d+EFy --single-transaction -q -e -R -E --triggers --master-data=2 -B koms >/data/koms_0827.sql &

其中数据库名为bms，如果是多个数据库中间用空格分开

3，将备份copy至备库：
scp /data/syy_0827 root@10.0.17.11:/data
// scp /data/workflow_0827 root@10.0.17.11:/data

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
```

12. mysql主主配置安装


13. 

