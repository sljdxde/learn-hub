## 背景

最近，交付的项目需要完成单点登录的对接任务，对接前服务器进行了漏扫，查出来了很多openssh的漏洞，作为一个开发，没有运维支撑，还是要着手修复这些问题。服务器不通外网，那么就只能离线升级了。

## 操作

### 当前环境说明

由于是对方私有云环境，我这里就简单描述一下

```shell
## 当前版本号 openssh 7.3p1
## 升级版本号 >= openssh 7.3p1
```

### 第一次升级【失败了】

1. 百度openssh离线升级
2. 下载了一堆相关的依赖包（ta r.gz）
3. 手动make && install
4. 重启openssh
5. 堡垒机无法跳转，普通ssh访问失败！

### 第二次升级【成功了】

1. 百度openssh离线升级（https://blog.csdn.net/weixin_43352213/article/details/118417169）
2. 找到了一个rpm包集合【8.4p1版本】
3. 按照文章操作步骤依次执行（备份的步骤非常重要）
4. 成功！

## 经验教训【这里都是精华】

1. 升级前，最重要的步骤是 **备份**
2. 离线升级建议直接找rpm包，防止出现依赖缺失问题
3. 升级完成后的验证，需要多种方式（堡垒机、ssh访问等）
4. 一种方式有问题，换另一种

## 罗列下所有漏洞及修复方案

- openssh离线升级：[https://blog.csdn.net/weixin_43352213/article/details/118417169](https://blog.csdn.net/weixin_43352213/article/details/118417169)
- 目标主机SSH服务协议版本可列取：[https://blog.csdn.net/zcb_data/article/details/80499189](https://blog.csdn.net/zcb_data/article/details/80499189)
- ICMP权限许可和访问控制漏洞CVE-1999-0524：[https://blog.csdn.net/tootsy_you/article/details/103306205](https://blog.csdn.net/tootsy_you/article/details/103306205)
- 目标主机SSH服务存在RC4、CBC或None弱加密算法：[https://www.jianshu.com/p/0106ff85df0b](https://www.jianshu.com/p/0106ff85df0b)
- 通过HTTP获取目标主机的WWW服务信息：[http://img.html.cn/site/server/11956004837025.html](http://img.html.cn/site/server/11956004837025.html)
