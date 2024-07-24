### MySQL的整体架构
1. 连接方式：包括长连接和短连接。查看当前连接状态：`show global status like 'Thread%';`


- 常见连接状态包括：
   - `sleep`：等待客户端发送一个请求
   - `Query`：正在执行查询或往客户端发送数据
   - `Locked`：该查询被其他查询锁定
- 允许的最大连接数：
   - 5.7版本默认151个，最大16384（2^14）
   - 查询方式：`show variables like 'max_connections';`
1. 通信方式：采用半双工通信，即客户端要么在发送数据，要么在接收数据，两者不能同时发生。因此，在使用mybatis编程时，需要避免批量插入大量数据的操作，否则可能导致数据量过大，超过mysql设定的`max_allowed_packet`的限制。
2. 查询过程
   1. 查询缓存（效果不佳，已被8.0移除）
   2. 语法解析与预处理：在语法解析阶段，对语法进行校验；在预处理阶段，对sql语句中的表、列、字段名等进行解析
   3. 查询优化及查询执行计划：使用如下语句，得到优化器执行计划（消耗性能，仅供分析使用）
      ```sql
      SHOW VARIABLES LIKE 'optimizer_trace';

      set optimizer_trace='enabled=on';
      ```

4. 存储引擎：在 MySQL 里面，我们创建的每一张表都可以指定它的存储引擎，而不是一个数据库只能使用一个存储引擎
   1. 任何一个存储引擎都有一个 frm 文件，这个是表结构定义文件；不同的存储引擎存放数据的方式不一样，产生的文件也不一样，innodb 是 1 个，memory 没有，myisam 是两个

   2. MyISAM：应用范围比较小。表级锁定限制了读/写的性能，因此在 Web 和数据仓库配置中，它通常用于只读或以读为主的工作
      1. 支持表级别的锁（插入和更新会锁表）。不支持事务
      2. 拥有较高的插入（insert）和查询（select）速度
      3. 存储了表的行数（count 速度更快）
   3. InnoDB：InnoDB 是一个事务安全（与 ACID 兼容）的 MySQL存储引擎，它具有提交、回滚和崩溃恢复功能来保护用户数据。InnoDB 行级锁（不升级为更粗粒度的锁）和 Oracle 风格的一致非锁读提高了多用户并发性和性能。InnoDB 将用户数据存储在聚集索引中，以减少基于主键的常见查询的 I/O
      1. 支持事务，支持外键，因此数据的完整性、一致性更高
      2. 支持行级别的锁和表级别的锁
      3. 支持读写并发，写不阻塞读（MVCC）
      4. 特殊的索引存放方式，可以减少 IO，提升查询效率
   4. 存储引擎的选择思路：
      1. 如果对数据一致性要求比较高，需要事务支持，可以选择 InnoDB。
      2. 如果数据查询多更新少，对查询性能要求比较高，可以选择 MyISAM。
      3. 如果需要一个用于查询的临时表，可以选择 Memory。


5. 关键字段
   1. id：执行select子句或操作表的顺序，越大越靠前。针对主查询和子查询。
   2. select_type：查询类型
      1. simple：不使用子查询或union
      2. PRIMARY：子查询不包含复杂的部分
      3. SUBQUERY：select或where包含子查询
      4. DERIVED：存在临时表
      5. UNION：存在union结果
      6. UNION RESULT：从union结果中获取select
   3. type：访问类型，由最差到最佳依次是ALL < index < range < index_subquery < unique_subquery < index_merge < ref_or_null < fulltext < ref <  eq_ref <   const  < system
      - all：全表扫
      - index：索引中查询
      - range：范围查询，走索引
      - ref：索引中精确查询，非唯一
      - eq_ref：索引中唯一查询，常见于主键或唯一索引
      - const：主键在where条件中
      - system：系统表
   4. possible_keys：查询中使用了哪些索引
   5. key：实际使用的索引
   6. key_len：索引中使用的字节数，越短越好
   7. ref：索引中的查找值
   8. rows：**估算出找到所需行而要读取的行数。**这个数字是内嵌循环关联计划里的循环数，它并不是最终从表中读取出来的行数，而是MySQL为了找到符合查询的那些行而必须读取行的平均数，只能作为一个相对数来进行衡量。
   9. filtered：返回结果的行数占读取行数的百分比，值越大越好。
   10. Extra：额外信息
      1. Using where：where条件中用到了索引
      2. Using index：sql使用了索引覆盖，无需回表查询
      3. Using temporary：使用了临时表（常见于 order by 和 group by）
      4. Using filesort：对数据使用了外部索引排序


### 参考文章

1. [知乎-千万级大表优化](https://www.zhihu.com/question/19719997)
2. [mysql性能优化大全](https://cloud.tencent.com/developer/article/1628581)
3. [深入精通mysql](https://mp.weixin.qq.com/s?__biz=MzI5MzE4MzYxMw==&mid=2247487458&idx=1&sn=0ae7cca5ce826f81d60d85ce74adb2e6&source=41#wechat_redirect)
