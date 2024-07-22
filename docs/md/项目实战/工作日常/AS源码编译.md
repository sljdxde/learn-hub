# 背景
流立方需要配合as使用，目前比较稳定的2个版本是`4.3.1.14`和`3.16.0.6`，但是这2个版本在as官网上均未提供RHEL8.x的编译版，因此当需要在该环境下使用时，需要手动编译as源码包

本次样例中，相关配置信息如下

- 操作系统：`RHEL8.6`
- AS-server版本：`4.3.1.14`

使用能联网的服务器进行相关编译操作，否则会有大量离线依赖安装问题！
# 资源获取
## 源码包下载
首先，需要下载指定版本的源码包，有2种方式，**建议采用方式2，便于后续submodule的下载**

1. zip包下载

![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1685589669421-a900b185-f5a5-41b1-af23-fc8b25cfc32b.png#averageHue=%23e6cdb1&clientId=ub2ddc403-3c7b-4&from=paste&height=462&id=u1cfc2124&originHeight=763&originWidth=1558&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=198301&status=done&style=none&taskId=u96dd0ad5-aeba-4936-b290-7fa3ffe920a&title=&width=944.242369666685)

2. git下载：需要提前安装git（`yum -y install git`）
- `git clone -b 4.3.1.14 https://github.com/aerospike/aerospike-server.git`
## modules下载
从git上下载的源码包里，不包含Submodules的源码，因此需要手动下载，具体需要8个submodules

| **Submodule** | **Description** |
| --- | --- |
| common | The Aerospike Common Library |
| jansson | C library for encoding, decoding and manipulating JSON data |
| jemalloc | The JEMalloc Memory Allocator |
| lua-core | The Aerospike Core Lua Source Files |
| luajit | The LuaJIT (Just-In-Time Compiler for Lua) |
| mod-lua | The Aerospike Lua Interface |
| s2-geometry-library | The S2 Spherical Geometry Library |
| telemetry | The Aerospike Telemetry Agent (Community Edition only) |


不同的源码包下载方式下，modules

- zip包下载：
   - 手动在aerospike的git仓库中搜索相关依赖

![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1685590472912-c3870b32-63a1-43b0-9952-785a7e53d6e4.png#averageHue=%23fef9f9&clientId=ub2ddc403-3c7b-4&from=paste&height=213&id=u278e35dd&originHeight=352&originWidth=1066&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=32302&status=done&style=none&taskId=u8c9e3fed-08a6-43f0-9227-fe69b5aae2b&title=&width=646.0605687193108)

   - 下载源码包zip
   - 上传到modules目录下的对应目录下，并解压

![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1685590543619-d34ef51c-33e9-4a85-bb1b-7feb64a0ffc6.png#averageHue=%23313128&clientId=ub2ddc403-3c7b-4&from=paste&height=88&id=ud0c5e024&originHeight=146&originWidth=615&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=21647&status=done&style=none&taskId=u2cc5349c-1c54-450c-8a90-902f72881eb&title=&width=372.7272511842178)

- git下载：
   - 进入到`aerospike-server`下
   - 执行`git submodule update --init`
   - 【注意】网络原因需要多试几次
## 依赖安装
所需依赖参考git上的`Dependencies`章节
![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1685589967254-380a4a57-908d-4e08-b09d-14d4f05c5968.png#averageHue=%23fefdfb&clientId=ub2ddc403-3c7b-4&from=paste&height=184&id=u62665140&originHeight=303&originWidth=914&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=41954&status=done&style=none&taskId=ua3bea0e8-3e90-420f-b4d7-65f276d4195&title=&width=553.939361922561)
一般情况下，需要安装如下依赖，可以直接通过`yum`命令进行安装

- autoconf
- automake
- libtool
- make
- gcc-c++
- openssl、openssl-devel、openssl-static
- lua、lua-devel、lua-static
- libz-dev
- cmake
### 注意

1. python2不是必需的，因为我们会关闭`Telemetry Agent`功能
2. cmake的安装需要使用tar包进行编译
- 解压cmake的tar.gz
- `./configure`
- `make && make install`
# 构建
## 命令
进入到aerospike-server目录下，执行`make all -j4`进行构建，可以得到`asd`。
其他构建方式如下，前3项是打包出我们需要的不同操作系统文件
```
make deb      -- Build the Debian (Ubuntu) package.

make rpm      -- Build the Red Hat Package Manager (RPM) package.

make tar      -- Build the "Every Linux" compressed "tar" archive (".tgz") package.

make source   -- Package the source code as a compressed "tar" archive.

make clean    -- Delete any existing build products, excluding built packages.

make cleanpkg -- Delete built packages.

make cleanall -- Delete all existing build products, including built packages.

make cleangit -- Delete all files untracked by Git.  (Use with caution!)

make strip    -- Build "strip(1)"ed versions of the server executables.
```
## 启动
构建后的`asd`在`target/Linux-x86_64/bin/`目录下
![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1685591301907-7a9213b0-7d9f-4a36-8c3d-b5bccf1ebb11.png#averageHue=%23414037&clientId=ub2ddc403-3c7b-4&from=paste&height=32&id=ufc858a34&originHeight=53&originWidth=617&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=7114&status=done&style=none&taskId=uabb643a9-5484-4ac0-9584-7425b1d4b07&title=&width=373.9393723262803)
默认配置文件在`as/etc/`目录下
![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1685591354838-2bf64c77-0310-4b4a-8cb7-88ff09d5cd6e.png#averageHue=%2333332a&clientId=ub2ddc403-3c7b-4&from=paste&height=59&id=u5a07b8da&originHeight=97&originWidth=1429&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=16960&status=done&style=none&taskId=ueba60153-faf2-49d9-a8b2-50ab821d766&title=&width=866.060556003654)
通过`./asd --config-file aerospike.conf`进行启动

# as-tool
## 下载
as-tool无需使用源码包进行编译，可以直接在as官网上进行下载。这里可以使用如下版本：
![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1685591515526-e8ddcbd5-12b1-48c8-a67c-572b431ca31e.png#averageHue=%23debc96&clientId=ub2ddc403-3c7b-4&from=paste&height=347&id=u77bdf9d0&originHeight=573&originWidth=1209&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=96109&status=done&style=none&taskId=ube0ebacc-7caa-4724-a20c-495bd98684b&title=&width=732.7272303767794)
## 安装

- 解压tar包

![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1685591585490-63646a87-d150-40a7-8fab-bc75d39eb237.png#averageHue=%232f3028&clientId=ub2ddc403-3c7b-4&from=paste&height=55&id=u517d0eff&originHeight=90&originWidth=729&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=13405&status=done&style=none&taskId=uf1f88be0-f775-4cf1-b9f7-a1c80c40382&title=&width=441.8181562817801)

- 执行`rpm -Uvh aerospike-tools-5.1.0-1.el7.x86_64.rpm --nodeps --force `
## 使用

- asadm：注意到版本是我们下载的源码包的版本

![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1685591668405-12c8fc05-6fba-445a-8c07-4a82d0949d92.png#averageHue=%232c2d25&clientId=ub2ddc403-3c7b-4&from=paste&height=358&id=ud728ee7b&originHeight=591&originWidth=1255&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=70859&status=done&style=none&taskId=u37d27eda-2052-465d-8dd5-914aa1194bc&title=&width=760.6060166442168)

- asbackup：简单测试了备份和恢复功能
   - 备份

`asbackup -n bsfit -d ./`
![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1685591718110-a3b5182a-4078-4d1b-a6a7-60b9f984ffc9.png#averageHue=%232e2f27&clientId=ub2ddc403-3c7b-4&from=paste&height=198&id=u691f4034&originHeight=326&originWidth=1477&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=75001&status=done&style=none&taskId=ub0a39c26-72a8-4b4b-b932-6c44efcee2d&title=&width=895.1514634131539)

   - 清空数据

`asinfo -v "truncate:namespace=<namespace_name>;set=<set_name>"`

   - 恢复

`asrestore -n bsfit -d ./`![image.png](https://cdn.nlark.com/yuque/0/2023/png/5369311/1685597786075-0469dbd7-cf3a-451e-a38c-eab620639fdb.png#averageHue=%23323229&clientId=ub2ddc403-3c7b-4&from=paste&height=122&id=uef7526b7&originHeight=202&originWidth=1129&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=48909&status=done&style=none&taskId=u2841e5e8-699b-48dd-9b41-c92b685ab87&title=&width=684.2423846942795)
# 参考资料

- [AS-server源码下载](https://github.com/aerospike/aerospike-server/tree/4.3.1.14)
- [AS-server下载](https://artifacts.aerospike.com/aerospike-server-community)
- [AS-tool下载](https://aerospike.com/download/#tools)
