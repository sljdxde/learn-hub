![](https://cdn.nlark.com/yuque/0/2022/jpeg/5369311/1647589783326-a0ab7bd8-53b3-4489-9bae-cbadb6a76a59.jpeg)
## 1. 背景
系统漏洞扫描，扫出了`swagger`的问题。这个问题其实比较基础，那就是**生产环境不应该开启swagger！**

但是，有的时候为了调用方便（主要是部署`workflow`流程图），还是需要临时开启`swagger`，并且业务要无感知。

有了上述背景介绍，可以快速将整个需求细化为2步操作：

- 监听配置文件变化
- 当配置文件变化时，动态修改`swagger`页面的开关

## 2. 配置文件监听
配置文件，就是我们常见的`.properties`和`.yml/yaml`，这里以`.properties`为例。

通过之前的阅读和网上资料搜索，锁定了2种方案：

- `jdk1.7`提供的`watchService`监听
- `spring cloud`提供的`@RefreshScope`注解

相比较而言，显然第二种方案**成本更低**，那么我们优先尝试。

### 2.1 基于注解
`Spring cloud`中提供了`@RefreshScope`注解，这个注解的含义从其命名上就可以窥探，刷新范围。其大体的实现关系为：`Scope -> GenericScope -> RefreshScope`。

首先，需要添加`maven`依赖
```xml
<dependency>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

仔细研究一下`@RefreshScope`，其继承自`RefreshScope _extends _GenericScope`，重点代码如下
```java
@ManagedOperation(description = "Dispose of the current instance of bean name provided and force a refresh on next method execution.")
public boolean refresh(String name) {
    if (!name.startsWith(SCOPED_TARGET_PREFIX)) {
        // User wants to refresh the bean with this name but that isn't the one in the
        // cache...
        name = SCOPED_TARGET_PREFIX + name;
    }
    // Ensure lifecycle is finished if bean was disposable
    if (super.destroy(name)) {
        this.context.publishEvent(new RefreshScopeRefreshedEvent(name));
        return true;
    }
    return false;
}
```

- `destory`掉原有的`bean`后，重新发布监听事件监听`bean`的刷新，并使用`cglib`创建`bean`的代理，每次访问是对代理的访问。

有了`RefreshScope`后，还需要监听到文件改动，从而刷新对应的`bean`（根据bean的名称），这里参考了`spring cloud`中的`fresh`接口，该接口在不启动服务的情况下拿到最新的配置，具体步骤如下：
1）获取刷新之前的所有`PropertySource`
2）调用`addConfigFilesToEnvironment`方法获取最新的配置
3）调用`changes`方法更新配置信息
4）发布`EnvironmentChangeEnvent`事件
5）调用`refreshScope`的`refreshAll`方法刷新范围

但是在调用`environmentListener`的过程中，由于项目启动时`pom`文件没有打包配置文件，因此拿不到对应的环境变量，导致监听异常。

**很遗憾，这条路走不通。**

### 2.2 基于jdk
在`jdk1.7`的`java.nio.file`包下，提供了`WatchService`这个接口。

我们知道，`nio`的精髓其实就在于**轮询**，通过`selector`的轮询机制实现非阻塞的调用，而`WatchService`也完美的诠释了`nio`。

简单看下`WatchService`的使用：

1. 首先是构造`WatchService`
```java
WatchService watchService = FileSystems.getDefault().newWatchService();
Paths.get(propertiesFile.getParent())
  .register(watchService,
            StandardWatchEventKinds.ENTRY_CREATE,
            StandardWatchEventKinds.ENTRY_MODIFY,
            StandardWatchEventKinds.ENTRY_DELETE);
```

- 这里构造了`WatchService`实例，并在指定的路径上注册了该实例
- 在注册实例的同时，还监听了`create`、`modify`和`delete`三种行为

2. 接下来是启动`WatchService`
```java
//启动一个线程监听内容变化，并重新载入配置
Thread watchThread = new Thread() {
    public void run() {
        while (true) {
            try {
                WatchKey watchKey = watchService.take();
                for (WatchEvent event : watchKey.pollEvents()) {
                    // 刷新bean
                    // envConfig.envListener();
                    if (Objects.equals(event.context().toString(), fileName)){
                        properties.load(new FileInputStream(propertiesFile));
                    }
                    watchKey.reset();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    };
};

//设置成守护进程
watchThread.setDaemon(true);
watchThread.start();
```

- 启用了一个额外的线程去跑，使用`take`方法取出`watchKey`。其实`WatchService`是以队列的形式对`key`进行存储，其提供的方法也和队列保持一致

- 对`watchKey`中的event进行轮询，判断和我们指定的文件名一致时，进行对应操作。这里的操作可以自己随便定制，我这的操作是对配置文件的重新加载，也就是刷新配置文件中的值

- 最后需要使用`watchKey.reset()`方法对`watchKey`进行重设，重设的原因在注释中写的很清楚
> If this watch key has been cancelled or this watch key is already in  the ready state then invoking this method has no effect. Otherwise  if there are pending events for the object then this watch key is immediately re-queued to the watch service. If there are no pending  events then the watch key is put into the ready state and will remain in  that state until an event is detected or the watch key is cancelled.

   - 简单来说，就是`watch key`实际上是监听`event`变动的，当轮询的过程中`watch key`下有了新的（pending态）的`event`时，那么久会立刻将其加入到`WatchService`的队列中，否则将其置为`ready`状态，等待下一次`event`的唤醒（signal）或是取消掉该key（cancel）。

这里其实有个问题，那就是`watch key`是何时加入到`WatchService`这个队列中的？

通过几个参数生成出来的，如下图
![image.png](https://cdn.nlark.com/yuque/0/2022/png/5369311/1647574344978-80c60471-a91e-4c37-9d26-bf7f658ff16d.png#clientId=u0b4eb44d-8ce3-4&from=paste&height=315&id=ue61b9bb4&originHeight=629&originWidth=1629&originalType=binary&ratio=1&rotation=0&showTitle=false&size=78381&status=done&style=none&taskId=u2816c60c-de67-42fd-a1c2-06584fd267e&title=&width=814.5)

3. 最后则是添加钩子，在`shutdown`时进行`close`
```java
//当服务器进程关闭时把监听线程close掉
Runtime.getRuntime().addShutdownHook(new Thread() {

    @Override
    public void run() {
        try{
            watchService.close();
        } catch(IOException e) {
            e.printStackTrace();
        }
    }
});
```
## 3. swagger改造
成功监听到配置文件的变更后，下一步需要做的就是根据配置文件中参数的不同，对`swagger`的显示页做控制。

先看看原本的`swagger`配置：
```java
@Value("${swagger.button}")
private boolean swaggerButton;

/**
     * @return
     */
@Bean(name = "swaggerApi")
public Docket createRestApi() {
  if (swaggerButton) {
    // 测试环境
    return new Docket(DocumentationType.SWAGGER_2)
      // 也可以采用该参数进行控制，但是为了强制什么信息都不显示，使用了 if/else
      .enable(true)  
      .apiInfo(apiInfo())
      .select()
      // 对所有api进行监控
      .apis(RequestHandlerSelectors.withMethodAnnotation(ApiOperation.class))
      // 对所有路径进行监控
      .paths(path -> !"/error".equals(path))
      .build();
  } else {
    // 线上环境
    return new Docket(DocumentationType.SWAGGER_2)
      .select().paths(PathSelectors.none()).build();
  }


}

private ApiInfo apiInfo() {
  return new ApiInfoBuilder()
    .title("111") //大标题
    .contact(new Contact("222","","")) //创建人
    .description("API描述") //详细描述
    .version("1.0")
    .build();
}
```

- 项目启动时，`@Bean`标记的方法被初始化为`spring bean`存入`ApplicationContext`

当我们监听到配置文件变更时，需要刷新`swaggerApi`这个`bean`。
### 3.1 bean刷新
刷新`bean`的方法比较简单，代码如下
```java
ApplicationContext applicationContext = SpringContextUtils.getApplicationContext();
//获取上下文
DefaultListableBeanFactory defaultListableBeanFactory =
    (DefaultListableBeanFactory) applicationContext.getAutowireCapableBeanFactory();

Docket swaggerApi = applicationContext.getBean("swaggerApi", Docket.class);
System.out.println("Old bean: \n");
System.out.println(swaggerApi);

//销毁指定实例 swaggerApi是上文注解过的实例名称 name="swaggerApi"
defaultListableBeanFactory.destroySingleton("swaggerApi");
//按照旧有的逻辑重新获取实例
Docket restApi = Swagger2Config.createRestApi();
//重新注册同名实例，这样在其他地方注入的实例还是同一个名称，但是实例内容已经重新加载
defaultListableBeanFactory.registerSingleton("swaggerApi", restApi);

Docket swaggerApiNew = applicationContext.getBean("swaggerApi", Docket.class);
System.out.println("New bean: \n");
System.out.println(swaggerApiNew);
```

- 从`ApplicationContext`中获取`beanFactory`
- 从`beanFactory`中销毁原来的`bean`
- 重新注册一个同名`bean`

但是这么操作完后，发现修改完配置文件后，页面并没有任何变化，能访问的依然可以访问，证明这个思路是错误的！

那么正确的解法是什么呢？
### 3.2 方法重写
顺藤摸瓜，我们看看`swagger`页面究竟是怎么出现的？
![image.png](https://cdn.nlark.com/yuque/0/2022/png/5369311/1647589534135-d96969fc-8d48-429e-bff3-919886886b09.png#clientId=u0b4eb44d-8ce3-4&from=paste&height=443&id=uc122aa76&originHeight=886&originWidth=1893&originalType=binary&ratio=1&rotation=0&showTitle=false&size=151756&status=done&style=none&taskId=u3d98123a-f9a9-4270-ae08-75a3aae984f&title=&width=946.5)

- 当访问页面时，我们其实是在请求接口

那么这个接口是什么样的呢？
![image.png](https://cdn.nlark.com/yuque/0/2022/png/5369311/1647589603261-9e948ff6-89bb-41cc-86a4-5147bbbb6dc0.png#clientId=u0b4eb44d-8ce3-4&from=paste&height=343&id=u97611359&originHeight=685&originWidth=1535&originalType=binary&ratio=1&rotation=0&showTitle=false&size=110987&status=done&style=none&taskId=u4f0f6105-7b42-4d4a-8809-86ebdf0ad0a&title=&width=767.5)

- 接口的核心其实是从`documentCache`中，根据`groupName`字段拿到`Document`信息，而不是从`ApplicationContext`中取`bean`
- 因此，需要调整的部分我们已经定位到了，那就是`Swagger2Controller`

接下来，重写这个`class`，增加几行代码，就完成了对`swagger`的控制
```java
// 增加swagger控制
boolean swaggerButton = Boolean.parseBoolean(WatchProperties.get("swagger.button"));
if (!swaggerButton) {
    return new ResponseEntity<Json>(HttpStatus.FORBIDDEN);
}
```

## 4. 总结
总结而言，由于已经有大量前人栽树的经验，我们更多的时候只需要享受乘凉的快感就可以。

但是在实践过程中，其实还是有很多需要总结和沉淀的地方：

- `swagger`访问时，实际上是内部接口调用，而不是我所以为的加载`spring factory`中的`bean`。往大了说，其实所有的`url`访问无外乎接口调用（或者静态文件），那么你需要抽丝剥茧的其实是其**真实路径下的代码，而不是自以为的一些经验**

- 如果项目没有采用**最佳实践，**而是自顾自的采用一些看上去很棒的方案，往往会给以后的功能扩展带来一些麻烦。因为既有的快速解决方案，在非最佳实践的场景下，一般都会失效

- 之前实践的`javaagent`实现对`jvm`内部的监听，而`WatchService`实现对目录的监听，两者配合起来，可以完成很有意思的事情

## 5. 参考资料

- [深入理解SpringCloud之配置刷新](https://www.cnblogs.com/niechen/p/8979578.html)
- [spring cloud 配置文件热加载--@RefreshScope](https://www.cnblogs.com/weihuang6620/p/13723219.html)
- [WatchService 监听一个文件夹下所有层的变化 ](https://blog.csdn.net/chengxiang5953/article/details/100912346)
- [FileWatcherService](https://gitee.com/aqiuqiu/file-watch-service)
- [Springboot重新加载Bean](https://www.cnblogs.com/Chaos1973-newWorld/p/15031018.html)
- [java中改变项目中引入的jar包的某个类的源码](https://blog.csdn.net/destiny_java/article/details/87932357)
- [Java 如何获取jar包或者项目的同级目录](https://blog.csdn.net/qq_41889899/article/details/109183801)
