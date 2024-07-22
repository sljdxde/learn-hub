# 方案收集
目前ES原生分页查询支持3种方式，分别是

- from/size：类似于传统数据库的分页，指定页码和页大小，进行查询
- search_after：首先查询出指定size大小的结果，接下来以该页为基准，不断查询后续页的数据
- scroll api：生成一个指定时间失效的快照，查询快照结果，查询时只能查询前一页和后一页

方案的对比：
![](https://cdn.nlark.com/yuque/0/2023/webp/5369311/1702456450570-0f3349c3-bb30-46b9-95da-de01fe6d3458.webp#averageHue=%23efefeb&clientId=u6c640822-c2c6-4&from=paste&height=266&id=u60731315&originHeight=351&originWidth=1126&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u8ccf57bd-7266-4516-a0d9-ccc72b49583&title=&width=853)

# 方案选型
考虑到实际业务场景，es中会存储流水数据，数据量级很大，因此，首先排除 from/size的方案。
另外，由于流水数据时效性很高，因此，对于查询的时效性也会有同样要求，因此，排除scroll方案。
最后，就剩下一种方案：**search_after**
# 方案改造
原始的`search_after`方案中，只能向后查询，向后查询时，需要传入前一次查询的sort信息，无法支持左右分页等分页查询常见功能，因此需要对其进行改造。
在改造前，首先进行2个分页查询假设：

1. 分页查询时，用户一般会指定页码附近x页进行向前/向后查询
2. 分页查询时，单页`size`一般最大为100，不会过大

接下来，说下思路：

1. 首次进入时，进行`search_after`查询，查询的size可以设置为`单页最大size * 10`（比如1000），这样就查询出从1-1000的结果，该结果可以覆盖`前 1000/pageSize` 的页码。这里将一次查询出的结果称为`**bulk**`
2. 将查询结果的id存储于缓存中（过期时间1h），key是用户id+查询条件
3. 当用户再次查询时，首先判断用户的查询是否被覆盖在上一次查询的结果中，如果覆盖，则直接返回；否则，基于当前查询，再执行一次`search_after`
4. 服务内部，使用链表保存最大N次相邻的`bulk`，以便用户进行左右翻页
5. 当链表保存数量达到上限`N`，且有新的`bulk`进入时，则`remove`掉链表头的`bulk`

上述过程流程如下：
![](https://cdn.nlark.com/yuque/0/2023/jpeg/5369311/1702457652050-9bffc2e2-1808-431c-98cd-902ef7d7f969.jpeg)
# 代码实现
> 暂未实现

# 实现效果
![67a820122e1ef55621571bf85e4457d4.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1702866988317-17b0a870-4317-4a5d-bd37-8f701a63b308.png#averageHue=%23f5f5f9&clientId=ud3a11236-ef56-4&from=paste&height=55&id=u08c7e94a&originHeight=82&originWidth=727&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=3471&status=done&style=none&taskId=u3926be43-6f5f-4aa4-b574-b081ffbd4ae&title=&width=484.6666666666667)
# 参考资料

1. [https://cloud.tencent.com/developer/article/1676915](https://cloud.tencent.com/developer/article/1676915)
2. [https://www.jianshu.com/p/733e7e1e4de5](https://www.jianshu.com/p/733e7e1e4de5)
