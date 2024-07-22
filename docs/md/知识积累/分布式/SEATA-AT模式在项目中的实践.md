## 分布式事务管理框架-SEATA在项目中的实践

### 背景

项目采用SpringCloud + SpringBoot 的微服务架构，服务间的调用会导致分布式事务的存在，ex. 服务A -> 服务B。当服务B失败时，服务A中已经执行的操作（主要是落库操作）需要回滚。

最开始都是业务进行的手动回滚，但是随着代码量级的增长以及开发人员的变动，导致手动回滚部分成为了黑盒子。

组长提到2PC、3PC之类的原则，于是乎接触到了阿里开源的分布式事务框架`SEATA`，其开箱即用的特性非常吸引人。遂在项目中进行引入。目前已经开始在测试环境上试验，成功后会平移至生产环境。

### SEATA简介

SEATA是一款开源的分布式事务管理框架，目前开源版本已经来到v1.4.2版本，其支持4种不同的分布式事务管理机制，分别是XA模式、AT模式、TCC模式和SAGA模式。

相对而言，AT作为其主推的模式，使用起来最为简便，适用于对于数据一致性要求不那么高的场景。

各个模式的细节这里不再赘述，移步官网（官网访问不太稳定，多刷新几次）：[SEATA-官网](https://seata.io/zh-cn/docs/dev/mode/xa-mode.html)，了解更多。

### 配置

实践文章，主要说下配置。项目的注册中心采用的Eureka，并且由于没有引入阿波罗配置中心，因此采用了`file.conf`和`register.conf`描述配置文件，需要分别在client端和server端进行设置。

其中client端（springboot服务）配置为：

- `file.conf`：

```shell
service {
  #这里vgroupMapping后面的名称，需要和项目配置文件（yml）中定义的相同
  vgroupMapping.my_test_tx_group = "default"
  #only support when registry.type=file, please don't set multiple addresses
  # seata server的访问地址，端口号默认是8091
  default.grouplist = "172.xx.xx.xx:8091"
  # default.grouplist = "localhost:8091"
  # 无需调整
  enableDegrade = false
  # 无需调整
  disableGlobalTransaction = false
}

## 。。。
undo {
    dataValidation = true
    logSerialization = "jackson"
    logTable = "undo_log"
    # 非默认配置，下方会说明
    onlyCareUpdateColumns = false
}
```

- `register.conf`：

```shell
type = "eureka"

  eureka {
    # eureka的注册地址
    serviceUrl = "http://172.xxx.xx.xxx:8081/eureka"
    weight = "1"
  }
```

- `pom文件`：

```xml
<!-- seata的版本号选择的是1.3.0-->
<!-- seata -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-alibaba-seata</artifactId>
    <version>2.1.0.RELEASE</version>
    <exclusions>
        <exclusion>
            <artifactId>seata-all</artifactId>
            <groupId>io.seata</groupId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>io.seata</groupId>
    <artifactId>seata-all</artifactId>
    <version>${seata.version}</version>
</dependency>
<!--druid的版本号选择的是 1.1.10-->
<!--druid-->
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>druid-spring-boot-starter</artifactId>
    <version>${druid-spring-boot-starter.version}</version>
</dependency>
```

- `application.yml`：

```yaml
# 增加seata-group的配置项，否则会自动生成applicationName + fescar的group，然后提示can not found
spring
	cloud
		alibaba
			seata
				tx-service-group: dev_tx_group
```

- `其他`：

由于在AT模式下，需要产生数据库访问代理，用于对sql进行拦截，记入到`undo_log`的序列化文件中，因此项目中还有一些需要注意

1. 增加`DataSourceConfiguretion`

```java
package com.cmcc.koms.config;

import com.alibaba.druid.pool.DruidDataSource;
import io.seata.rm.datasource.DataSourceProxy;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.transaction.SpringManagedTransactionFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import javax.sql.DataSource;

/**
 * 数据源代理
 *
 * 更多详细内容，可以访问 https://github.com/seata/seata-samples
 */
@Configuration
public class DataSourceConfiguration {

    @Bean
    @ConfigurationProperties(prefix = "spring.datasource")
    public DataSource druidDataSource() {
        return new DruidDataSource();
    }

    @Primary
    @Bean("dataSource")
    public DataSourceProxy dataSource(DataSource druidDataSource) {
        return new DataSourceProxy(druidDataSource);
    }

    @Bean
    public SqlSessionFactory sqlSessionFactory(DataSourceProxy dataSourceProxy) throws Exception {
        SqlSessionFactoryBean sqlSessionFactoryBean = new SqlSessionFactoryBean();
        sqlSessionFactoryBean.setDataSource(dataSourceProxy);
        // 项目中数据库的访问，采用了mybatis，因此这里的mapper文件路径，需要特别注意
        sqlSessionFactoryBean.setMapperLocations(new PathMatchingResourcePatternResolver()
                .getResources("classpath*:/mapper/*/*.xml"));
        sqlSessionFactoryBean.setTransactionFactory(new SpringManagedTransactionFactory());
        return sqlSessionFactoryBean.getObject();
    }

}
```

2. 启动项修改`application.java`

```java
// 去掉springboot中的数据源自动配置
@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)
```

Server端的配置为：

- `file.conf`：

```shell
# 存储模式选择db
mode = "db"

  ## 数据库配置因人而异
  db {
    ## the implement of javax.sql.DataSource, such as DruidDataSource(druid)/BasicDataSource(dbcp)/HikariDataSource(hikari) etc.
    datasource = "druid"
    ## mysql/oracle/postgresql/h2/oceanbase etc.
    dbType = "mysql"
    driverClassName = "com.mysql.jdbc.Driver"
    ## if using mysql to store the data, recommend add rewriteBatchedStatements=true in jdbc connection param
    url = "jdbc:mysql://172.xx.xxx.xx:3306/seata?rewriteBatchedStatements=true"
    user = "notRootUser"
    password = "paswd"
    minConn = 5
    maxConn = 100
    globalTable = "global_table"
    branchTable = "branch_table"
    lockTable = "lock_table"
    queryLimit = 100
    maxWait = 5000
  }
```

- `register.conf`：

```shell
# 类型依然是eureka
type = "eureka"
  # eureka的配置项同client端
  eureka {
    serviceUrl = "http://172.xx.xxx.xxx:8001/eureka"
    application = "default"
    weight = "1"
  }
```

这里的配置项中，有几点需要注意⚠️，如下：

- client端的`file.conf`和`application.yml`中，`group`的配置要保持一致(tx-service-group)
- clinet端和server端，`register.conf`中eureka的配置信息要保持一致
- ccc

### 其他注意事项

按照上述的配置，基本上项目是可以运行起来了，但是你会发现，预期的全局事务异常回滚并没有出现，反而会有各种各样的问题出现。这里，我总结一下可能遇到的问题和解决思路。

1.  Mybatis主键自动生成错误🙅‍♂️： 
   - 解决方法参考[官网](https://seata.io/zh-cn/docs/overview/faq.html) faq的第10条。我采取了第2种方法，直接删掉undo_log表中的id
2.  是否可以不使用conf类型配置文件，直接将配置写入application.properties? 
   - 解决方法可以参考[官网](https://seata.io/zh-cn/docs/overview/faq.html) faq的第15条。但是由于我的项目中引入了`seata-all`，因此采取了jenkins部署时，从git上拉取对应`.conf`文件进行替换的方式
3.  如果需要回滚的表中，存在根据数据库自动更新的项（比如update_time），那么会导致回滚失败，然后不断重试，参考报错信息为（主要关注`Has dirty records when undo`）  
```shell
2020-08-18 15:27:16.508  INFO 11888 --- [ch_RMROLE_1_1_8] i.seata.rm.datasource.DataSourceManager  : branchRollback failed. branchType:[AT], xid:[192.168.11.233:8091:39004501381648384], branchId:[39004522437054465], resourceId:[jdbc:mysql://192.168.10.203:3306/seata], applicationData:[null]. reason:[Branch session rollback failed and try again later xid = 192.168.11.233:8091:39004501381648384 branchId = 39004522437054465 Has dirty records when undo.]
```

   -  排查这个问题，建议先开启seata的`debug`级别日志，日志里会打印更加详细的库表信息。去官网issue中搜了一下，也有人提相同的问题（#3036）。问题最后，也给出了解决思路，在client的`file.conf`的`undo`中，增加`onlyCareUpdateColumns = false`，用于检测全部字段，而不仅仅是更新字段
![](http://118.195.155.48:9000/blog/image-20211206090509485.png#id=XEy3n&originHeight=490&originWidth=1990&originalType=binary&ratio=1&status=done&style=none) 

### 实践效果

假装有图，回滚成功！
