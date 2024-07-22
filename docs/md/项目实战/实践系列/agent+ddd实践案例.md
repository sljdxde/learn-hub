![](https://cdn.nlark.com/yuque/0/2022/jpeg/5369311/1646204490157-2b775995-0907-4fb0-81d2-f1c8ecda2c3d.jpeg)
## 业务背景（situation）
消息网关内部采用mysql进行消息持久化，需要大量的`I/O`开销，因此在高并发请求下会成为系统瓶颈，亟需一种高吞吐量的替代方案。

这里主要思考了2种解决方案：

- 寻找一种`MySQL`的替代方案。由于`MySQL`是基于`B-Tree`的，考虑性能提升的话，需要采用基于`LSM-Tree`的方案设计的数据库（目前还未完全成熟）    
   - 但是这种方案涉及业务侧比较大的改造（对于当前MVC3层结构的代码来说，因为并未对repo层进行抽象，因此替换底层存储几乎是革命性的变革）
   - `B-Tree`vs `LSM-Tree`，分别适合读多和写多的场景
- 放弃以`DB`进行数据持久化的方案，转而采用`ES`等其他引擎。这里又可以进一步细化为2种方式，分别为
   - 代码中直接嵌入`ES-Template`，将数据存储到`es`中
   - 将数据写入`log`中，通过中间件将`log`中的信息同步至`es`

其中，第一种方案需要引入新的依赖，同时在有新租户（tenant）接入时面临比较大的代码编写任务；而第二种方案仅需配置`logback.xml`，在有新tenant接入时，采用扩展的方式就可以很好的完成对接。

---

## 设计思路（task）
![](https://cdn.nlark.com/yuque/0/2022/jpeg/5369311/1667101514779-f404c2e9-1cfa-41ba-b5b9-039b36e4c9ae.jpeg)
 
这里需要着重考虑的一点是，`写入不同的log文件`时，是否可以采用对先用代码无侵入的解决方案？

答案是：`javaagent`

---

## 重点难点（action）
### logback

- 系统引入`logback.jar`依赖
- 编写`logback.xml`文件
   - 日志存储位置`LOG_DIR`
   - 日志输出格式`pattern`
   - 多个日志`appender`
   - 异步日志打印`ASYNC`
   - 日志类配置`logger name`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <!-- 定义日志文件的存储地址 -->
    <property name="LOG_DIR" value="resource/log-save"/>
    <!--
            %p:输出优先级，即DEBUG,INFO,WARN,ERROR,FATAL
            %r:输出自应用启动到输出该日志讯息所耗费的毫秒数
            %t:输出产生该日志事件的线程名
            %f:输出日志讯息所属的类别的类别名
            %c:输出日志讯息所属的类的全名
            %d:输出日志时间点的日期或时间，指定格式的方式： %d{yyyy-MM-dd HH:mm:ss}
            %l:输出日志事件的发生位置，即输出日志讯息的语句在他所在类别的第几行。
            %m:输出代码中指定的讯息，如log(message)中的message
            %n:输出一个换行符号
        -->
    <!--格式化输出：%d表示日期，%thread表示线程名，%-5level：级别从左显示5个字符宽度 %msg：日志消息，%n是换行符-->
    <property name="pattern" value="%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level  %msg%n"/>

    <!--
        Appender: 设置日志信息的去向,常用的有以下几个
            ch.qos.logback.core.ConsoleAppender (控制台)
            ch.qos.logback.core.rolling.RollingFileAppender (文件大小到达指定尺寸的时候产生一个新文件)
            ch.qos.logback.core.FileAppender (文件)
    -->
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <!-- 字符串System.out（默认）或者System.err -->
        <target>System.out</target>
        <!-- 对记录事件进行格式化 -->
        <encoder class="ch.qos.logback.classic.encoder.PatternLayoutEncoder">
            <pattern>${pattern}</pattern>
        </encoder>
    </appender>

    <appender name="tenant_A" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${LOG_DIR}/tenantA.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <!-- 必要节点，包含文件名及"%d"转换符，"%d"可以包含一个java.text.SimpleDateFormat指定的时间格式，默认格式是 yyyy-MM-dd -->
            <fileNamePattern>${LOG_DIR}/tenantA_%d{yyyy-MM-dd}.log.%i.gz</fileNamePattern>
            <timeBasedFileNamingAndTriggeringPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedFNATP">
                <maxFileSize>50MB</maxFileSize>
            </timeBasedFileNamingAndTriggeringPolicy>
            <!-- 可选节点，控制保留的归档文件的最大数量，超出数量就删除旧文件。假设设置每个月滚动，如果是6，则只保存最近6个月的文件，删除之前的旧文件 -->
            <maxHistory>10</maxHistory>
        </rollingPolicy>
        <encoder class="ch.qos.logback.classic.encoder.PatternLayoutEncoder">
            <pattern>${pattern}</pattern>
        </encoder>
        <!-- LevelFilter： 级别过滤器，根据日志级别进行过滤 -->
        <filter class="ch.qos.logback.classic.filter.LevelFilter">
            <level>WARN</level>
            <!-- 用于配置符合过滤条件的操作 ACCEPT：日志会被立即处理，不再经过剩余过滤器 -->
            <onMatch>ACCEPT</onMatch>
            <!-- 用于配置不符合过滤条件的操作 DENY：日志将立即被抛弃不再经过其他过滤器 -->
            <onMismatch>DENY</onMismatch>
        </filter>
    </appender>

    <appender name="tenant_B" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${LOG_DIR}/tenantB.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <!-- 必要节点，包含文件名及"%d"转换符，"%d"可以包含一个java.text.SimpleDateFormat指定的时间格式，默认格式是 yyyy-MM-dd -->
            <fileNamePattern>${LOG_DIR}/tenantB_%d{yyyy-MM-dd}.log.%i.gz</fileNamePattern>
            <timeBasedFileNamingAndTriggeringPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedFNATP">
                <maxFileSize>50MB</maxFileSize>
            </timeBasedFileNamingAndTriggeringPolicy>
            <!-- 可选节点，控制保留的归档文件的最大数量，超出数量就删除旧文件。假设设置每个月滚动，如果是6，则只保存最近6个月的文件，删除之前的旧文件 -->
            <maxHistory>10</maxHistory>
        </rollingPolicy>
        <encoder class="ch.qos.logback.classic.encoder.PatternLayoutEncoder">
            <pattern>${pattern}</pattern>
        </encoder>
        <!-- LevelFilter： 级别过滤器，根据日志级别进行过滤 -->
        <filter class="ch.qos.logback.classic.filter.LevelFilter">
            <level>WARN</level>
            <!-- 用于配置符合过滤条件的操作 ACCEPT：日志会被立即处理，不再经过剩余过滤器 -->
            <onMatch>ACCEPT</onMatch>
            <!-- 用于配置不符合过滤条件的操作 DENY：日志将立即被抛弃不再经过其他过滤器 -->
            <onMismatch>DENY</onMismatch>
        </filter>
    </appender>

    <appender name="tenant_Default" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${LOG_DIR}/tenantDefault.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <!-- 必要节点，包含文件名及"%d"转换符，"%d"可以包含一个java.text.SimpleDateFormat指定的时间格式，默认格式是 yyyy-MM-dd -->
            <fileNamePattern>${LOG_DIR}/tenantDefault_%d{yyyy-MM-dd}.log.%i.gz</fileNamePattern>
            <timeBasedFileNamingAndTriggeringPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedFNATP">
                <maxFileSize>50MB</maxFileSize>
            </timeBasedFileNamingAndTriggeringPolicy>
            <!-- 可选节点，控制保留的归档文件的最大数量，超出数量就删除旧文件。假设设置每个月滚动，如果是6，则只保存最近6个月的文件，删除之前的旧文件 -->
            <maxHistory>10</maxHistory>
        </rollingPolicy>
        <encoder class="ch.qos.logback.classic.encoder.PatternLayoutEncoder">
            <pattern>${pattern}</pattern>
        </encoder>
        <!-- LevelFilter： 级别过滤器，根据日志级别进行过滤 -->
        <filter class="ch.qos.logback.classic.filter.LevelFilter">
            <level>WARN</level>
            <!-- 用于配置符合过滤条件的操作 ACCEPT：日志会被立即处理，不再经过剩余过滤器 -->
            <onMatch>ACCEPT</onMatch>
            <!-- 用于配置不符合过滤条件的操作 DENY：日志将立即被抛弃不再经过其他过滤器 -->
            <onMismatch>DENY</onMismatch>
        </filter>
    </appender>

    <!-- 文件 异步日志(async) -->
    <appender name="ASYNC" class="ch.qos.logback.classic.AsyncAppender" >
        <!-- 不丢失日志.默认的,如果队列的80%已满,则会丢弃TRACT、DEBUG、INFO级别的日志 -->
        <discardingThreshold>0</discardingThreshold>
        <!-- 更改默认的队列的深度,该值会影响性能.默认值为256 -->
        <queueSize>512</queueSize>
        <neverBlock>true</neverBlock>
        <!-- 添加附加的appender,最多只能添加一个 -->
        <appender-ref ref="tenant_A" />
        <appender-ref ref="tenant_B" />
        <appender-ref ref="tenant_Default" />
    </appender>

    <!--
        也是<logger>元素，但是它是根logger。默认debug
        level:用来设置打印级别，大小写无关：TRACE, DEBUG, INFO, WARN, ERROR, ALL 和 OFF，
        <root>可以包含零个或多个<appender-ref>元素，标识这个appender将会添加到这个logger。
    -->
    <root level="info">
        <level>info</level>
<!--        <appender-ref ref="STDOUT"/>-->
        <appender-ref ref="ASYNC"/>
        <appender-ref ref="tenant_A"/>
        <appender-ref ref="tenant_B"/>
        <appender-ref ref="tenant_Default"/>
    </root>

    <logger name="com.example.logback.domain.factory.DefaultLogger" level="warn" additivity="false">
        <level value="warn"/>
        <appender-ref ref="tenant_Default"/>
    </logger>

    <logger name="com.example.logback.domain.factory.TenantALogger" level="warn" additivity="false">
        <level value="warn"/>
        <appender-ref ref="tenant_A"/>
    </logger>

    <logger name="com.example.logback.domain.factory.TenantBLogger" level="warn" additivity="false">
        <level value="warn"/>
        <appender-ref ref="tenant_B"/>
    </logger>

</configuration>
```
### ddd

- 编写消息写入log的代码
   - **DDD层级划分**

![image.png](https://cdn.nlark.com/yuque/0/2022/png/5369311/1644544038115-a42d07a5-415c-4e48-b89b-0da5963ff170.png#clientId=u78671b01-1b2b-4&from=paste&height=456&id=uea5bec9c&originHeight=911&originWidth=1772&originalType=binary&ratio=1&rotation=0&showTitle=false&size=671911&status=done&style=none&taskId=uab309c06-90da-43af-b6eb-e7a0e86ccc6&title=&width=886)

   - **代码层级划分**

![image.png](https://cdn.nlark.com/yuque/0/2022/png/5369311/1644544061609-808c2488-285b-49ec-a2e8-f5238c5a35df.png#clientId=u78671b01-1b2b-4&from=paste&height=528&id=uc5e9a178&originHeight=1056&originWidth=720&originalType=binary&ratio=1&rotation=0&showTitle=false&size=84396&status=done&style=none&taskId=uc1084119-91f0-4c3d-9d15-bea02703643&title=&width=360)

   - **UML图**

[点击查看【processon】](https://www.processon.com/embed/61af00905653bb0c3747ae25)

   - UML类图知识点回顾
      - 强弱关系：依赖 < 关联 < 聚合 < 组合
      - 依赖
         - 表示方式：虚线箭头
         - 解释说明：`对象A`作为`对象B`**方法的一个参数**，则`对象B`依赖于`对象A`
      - 关联
         - 表示方式：实线箭头
         - 解释说明：`对象A`作为`对象B`**的一个属性**，则`对象B`依赖于`对象A`
      - 聚合
         - 表示方式：空心菱形加实线
         - 解释说明：弱的拥有关系，`has a`的一种情形，两者不需要有相同的生命周期
      - 组合
         - 表示方式：实心菱形加实线
         - 解释说明：强的拥有关系，`contains a`的一种情形，两者是严格的整体与部分的关系
   - 代码说明
      - 入口是`fileController`中的`logSave`和`logEventSave`，其中`logSave`方法用于模拟正常的日志存储、`logEventSave`方法用来模拟消息送达后的事件触发日志存储。
      - `fileController`中的传参分为三种类型，分别是**commend**、**query**、**event**。分别对应于**写请求**、**读请求**和**事件请求**。
      - 事件请求是指，将原本串行化执行的指令修改为监听事件触发。在`Spring`中可以直接使用`Spring Event`机制。该机制通过编写`ApplicationEvent`、`ApplicationListener`并交由`ApplicationEventPublisher`进行事件发布，完成全部流程。使用监听器模式处理事件请求可以很好的实现逻辑解耦，以遵循**单一职责原则**。
      - 具体`Logger`对象实例的构造，采用了策略模式实现，通过传递参数中的属性，在`LoggerPolicyContext`中进行判断后构造。
### javaagent
[2022-02-18【agent代理】](https://www.yuque.com/schrodingery/gih23a/rms743?view=doc_embed)

### filebeat + es
#### 1. filebeat接入
filebeat接入部分：
[2022-02-10【存储优化-日志采集】](https://www.yuque.com/schrodingery/gih23a/bh4qcs?view=doc_embed)

#### 2. ES同步

- `filebeat`将数据同步至`es`中
- `es`层面的查询，采用`kibana`提供的`sense`组件实现

![image.png](https://cdn.nlark.com/yuque/0/2022/png/5369311/1645154640861-58fb0d0c-d6f9-4b1c-98aa-2999ff0bb460.png#clientId=ucb0b060f-167a-4&from=paste&height=444&id=u624e38b6&originHeight=887&originWidth=1883&originalType=binary&ratio=1&rotation=0&showTitle=false&size=130105&status=done&style=none&taskId=u9e1611cf-59e6-4539-b536-fe3e9b1fc94&title=&width=941.5)

---

## 效果展示（result）

- 见视频

---

## 代码

- [git](https://github.com/sljdxde/logback-demo)
