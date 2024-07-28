# 背景
redis查询经常出现与数据库不一致的问题，因此需要一种机制避免该问题的发生。

# 思路
采用`flink-cdc`监听MySQL数据库字段变化，当监听到字段增、删、改时，查询redis中的对应key，比较2者是否一致。
这里的数据库字段与redis对应key，可以采用json文件读取，在服务启动时加载；也可以采用数据库存表，同样启动时加载。
两者均支持实时更新，实现热启动

# 实现
## 代码结构
![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1679311448148-f082fb7a-f3c5-4dfc-b1b9-ac5a4b149ebe.png#averageHue=%233e4245&clientId=ubddd3ba9-71db-4&from=paste&height=307&id=u2af4a4f9&originHeight=506&originWidth=372&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=22993&status=done&style=none&taskId=uabdc3071-3512-4728-82b4-c5e46d165ab&title=&width=225.4545324236244)

## 文件信息
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>2.0.2.RELEASE</version>
    <relativePath/> <!-- lookup parent from repository -->
  </parent>
  <groupId>org.example</groupId>
  <artifactId>flink-cdc-demo</artifactId>
  <version>1.0-SNAPSHOT</version>

  <properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <flink.version>1.13.5</flink.version>
    <target.java.version>1.8</target.java.version>
    <log4j.version>2.12.1</log4j.version>
    <maven.compiler.source>8</maven.compiler.source>
    <maven.compiler.target>8</maven.compiler.target>
    <mysql.version>5.1.49</mysql.version>
    <flinkcdc.version>2.0.0</flinkcdc.version>
    <fastjson.version>1.2.83</fastjson.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-connector-base</artifactId>
      <version>1.14.0</version>
    </dependency>
    <!-- https://mvnrepository.com/artifact/com.ververica/flink-connector-mysql-cdc -->
    <dependency>
      <groupId>com.ververica</groupId>
      <artifactId>flink-sql-connector-mysql-cdc</artifactId>
      <version>2.3.0</version>
    </dependency>
    <!-- https://mvnrepository.com/artifact/mysql/mysql-connector-java -->
    <dependency>
      <groupId>mysql</groupId>
      <artifactId>mysql-connector-java</artifactId>
      <version>5.1.49</version>
    </dependency>

    <!-- https://mvnrepository.com/artifact/org.apache.flink/flink-streaming-java -->
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-streaming-java_2.12</artifactId>
      <version>1.14.0</version>
    </dependency>
    <!-- https://mvnrepository.com/artifact/org.apache.flink/flink-clients -->
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-clients_2.12</artifactId>
      <version>1.14.0</version>
    </dependency>
    <!-- https://mvnrepository.com/artifact/org.apache.flink/flink-runtime -->
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-runtime-web_2.12</artifactId>
      <version>1.14.0</version>
    </dependency>
    <!-- https://mvnrepository.com/artifact/org.apache.flink/flink-table-api-java -->
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-table-runtime_2.12</artifactId>
      <version>1.14.0</version>
    </dependency>
    <!-- https://mvnrepository.com/artifact/ch.qos.logback/logback-classic -->
    <dependency>
      <groupId>ch.qos.logback</groupId>
      <artifactId>logback-classic</artifactId>
      <version>1.2.11</version>
    </dependency>
    <dependency>
      <groupId>org.slf4j</groupId>
      <artifactId>slf4j-api</artifactId>
      <version>1.7.36</version>
    </dependency>

  </dependencies>

</project>
```
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- 级别从高到低 OFF 、 FATAL 、 ERROR 、 WARN 、 INFO 、 DEBUG 、 TRACE 、 ALL -->
<!-- 日志输出规则 根据当前ROOT 级别，日志输出时，级别高于root默认的级别时 会输出 -->
<!-- 以下 每个配置的 filter 是过滤掉输出文件里面，会出现高级别文件，依然出现低级别的日志信息，通过filter 过滤只记录本级别的日志 -->
<!-- scan 当此属性设置为true时，配置文件如果发生改变，将会被重新加载，默认值为true。 -->
<!-- scanPeriod 设置监测配置文件是否有修改的时间间隔，如果没有给出时间单位，默认单位是毫秒。当scan为true时，此属性生效。默认的时间间隔为1分钟。 -->
<!-- debug 当此属性设置为true时，将打印出logback内部日志信息，实时查看logback运行状态。默认值为false。 -->
<configuration scan="true" scanPeriod="60 seconds"
               debug="false">
  <!-- 动态日志级别 -->
  <jmxConfigurator />
  <!-- 定义日志文件 输出位置 -->
  <property name="log_dir" value="./logs" />
  <!-- <property name="log_dir" value="/home/data/logs/src" /> -->
  <!-- 日志最大的历史 30天 -->
  <property name="maxHistory" value="30" />
  <!-- ConsoleAppender 控制台输出日志 -->
  <appender name="console"		class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>
        <!-- 设置日志输出格式 -->
        [%d{yyyy-MM-dd HH:mm:ss.SSS}][%logger:%line]%-5level -- %msg%n
      </pattern>
    </encoder>
  </appender>
  <!-- 滚动记录文件，先将日志记录到指定文件，当符合某个条件时，将日志记录到其他文件 RollingFileAppender -->
  <appender name="file"		class="ch.qos.logback.core.rolling.RollingFileAppender">
    <!-- 过滤器，只记录WARN级别的日志 -->
    <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
      <level>ERROR,INFO,WARN,DEBUG</level>
    </filter>
    <!-- 最常用的滚动策略，它根据时间来制定滚动策略.既负责滚动也负责出发滚动 -->
    <rollingPolicy			class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
      <!--日志输出位置 可相对、和绝对路径 -->
      <fileNamePattern>
        ${log_dir}/%d{yyyy-MM-dd}/logback.log
      </fileNamePattern>
      <maxHistory>${maxHistory}</maxHistory>
    </rollingPolicy>
    <encoder>
      <pattern>
        <!-- 设置日志输出格式 -->
        [%d{yyyy-MM-dd HH:mm:ss.SSS}][%logger:%line]%-5level -- %msg%n
      </pattern>
    </encoder>
  </appender>
  <root>
    <!-- 打印TRACE级别日志及以上级别日志 -->
    <level value="INFO" />
    <!-- 控制台输出 -->
    <appender-ref ref="console" />
    <!-- 文件输出 -->
    <appender-ref ref="file" />
  </root>
</configuration>

```
```java
package cn.demo;

import com.ververica.cdc.connectors.mysql.source.MySqlSource;
import com.ververica.cdc.debezium.DebeziumSourceFunction;
import com.ververica.cdc.debezium.JsonDebeziumDeserializationSchema;
import com.ververica.cdc.debezium.StringDebeziumDeserializationSchema;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.configuration.RestOptions;
import org.apache.flink.streaming.api.datastream.DataStreamSink;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.source.SourceFunction;

import java.util.Properties;


/**
 * TODO
 *
 * @author Mingchen Yu
 * @date 2023/3/15
 **/
public class MySqlSourceExample {

    public static void main(String[] args) throws Exception {
        MySqlSource<String> build = MySqlSource.<String>builder()
                .hostname("localhost")
                .port(3306)
                .includeSchemaChanges(false)
                .databaseList("nl_dev")
                .tableList("nl_dev.shedlock")
                .username("admin")
                .password("ASDsuper123")
                .deserializer(new JsonDebeziumDeserializationSchema())
                .build();


        Configuration configuration = new Configuration();
        configuration.setInteger(RestOptions.PORT, 8081);
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment(configuration);

        env.enableCheckpointing(5000);
//        env.addSource(build).addSink(new CustomSink());
        env.fromSource(build, WatermarkStrategy.noWatermarks(), "MySQL Source")
                .addSink(new CustomSink());
        env.execute();
    }
}

```
```java
package cn.demo;

import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;

/**
 *
 * @author Mingchen Yu
 * @date 2023/3/15
 **/
public class CustomSink extends RichSinkFunction<String> {

    @Override
    public void open(Configuration parameters) throws Exception {

    }

    @Override
    public void invoke(String value, Context context) throws Exception {

        System.err.println(value);

    }

    @Override
    public void close() throws Exception {

    }

}

```
## 一些坑点
在demo构建中，遇到了很多坑点，这里一一罗列：
### pom文件

1. 依赖项是`flink-sql-connector-mysql-cdc`而不是`flink-connector-mysql-cdc`
```java
<dependency>
      <groupId>com.ververica</groupId>
      <artifactId>flink-sql-connector-mysql-cdc</artifactId>
      <version>2.3.0</version>
</dependency>
```
### 数据库配置

1. 数据库需要开启bin log，通过`show variables like '%log_bin%';`进行查看

![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1679311852957-fb6823f5-9dee-4e7a-a5f2-39128438b4a5.png#averageHue=%23fafaf9&clientId=ubddd3ba9-71db-4&from=paste&height=293&id=u83e07610&originHeight=484&originWidth=908&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=30656&status=done&style=none&taskId=u9b81d648-b710-4764-972d-8a64a51f073&title=&width=550.3029984963736)

2. 开启binlog
```java
server-id =1
log-bin=mysql-bin
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1679311881165-17da5749-f85f-4102-bbd9-6f13e7a55558.png#averageHue=%23fbfafa&clientId=ubddd3ba9-71db-4&from=paste&height=255&id=u3344a4e5&originHeight=421&originWidth=598&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=30150&status=done&style=none&taskId=u5e4fc8eb-ce27-4739-b6d4-d59146cc027&title=&width=362.42422147668657)
