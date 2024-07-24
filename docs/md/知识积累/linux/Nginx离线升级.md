## 背景

最近安全平台隔一段时间就搞一次漏扫，昨天刚刚被扫出来`CVE-2021-23017` 的漏洞，百度了一下，发现是nginx的DNS解析程序漏洞，具体漏洞过说明可以参考 [NGINX DNS解析程序漏洞（CVE-2021-23017）通告](http://blog.nsfocus.net/nginx-dnscve/)

给出的解决办法也是非常明晰，如果之前的nginx使用的是make编译安装的，那么可以修改文件后再次编译，避免升级。

另外的一种解决办法简单直接，那就是直接升级nginx版本。

## 操作

> 其实，网上关于nginx离线升级的文章很多，但是实际操作下来还是发现了很多坑点，这里给出一份完整的升级指南


1.  下载tar包，上传至服务器 
2.  执行 `tar -zxvf xxxx.tar.gz`  完成解压 
3.  进入解压后的目录下，进行_configure_配置，但是这一步有很多坑点！ 
   -  ⚠️ 坑点1：直接执行时可能会提示依赖缺失，那么需要先执行 `sudo yum install -y gcc pcre pcre-devel openssl openssl-devel gd gd-devel` 进行安装 
   -  ⚠️坑点2：在configure后面需要进行执行参数编写，先把我执行的指令放出来  

   ```shell
   ./configure --prefix=/etc/nginx \
   --sbin-path=/usr/sbin/nginx \
   --conf-path=/etc/nginx/nginx.conf \
   --error-log-path=/var/log/nginx/error.log \
   --http-log-path=/var/log/nginx/access.log \
   --pid-path=/run/nginx.pid
   ```

   -  具体的编写参数说明： 
      - `prefix`：前缀
      - `sbin-path` ：nginx可执行文件的路径
      - `conf-path` ：配置文件路径，一定要配置正确，否则前功尽弃
      - `error-log-path` ：错误日志路径（在原配置文件中可以找到）
      - `http-log-path` ：访问日志路径（在原配置文件中可以找到）
      - `pid-path` ：nginx的pid路径（在原配置文件中可以找到）
   -  查找nginx配置文件的2种方法 
      - 执行 `ps -ef | grep nginx`查看nginx的进程启动方式，启动时若使用 -C 指定了配置文件可以使用该路径找到
      - 执行`find / -name nginx.conf`用于nginx启动时未特别声明的情况，可以找到配置文件。如果提示权限不足，则前面加上`sudo`
   -  查找nginx可执行文件的方法 
      - 执行 `ps -ef | grep nginx`查看nginx的进程启动方式，启动时若使用全路径，则可以找到
      - 执行`find / -name nginx 如果提示权限不足，则前面加上`sudo`。一般而言，可执行文件的路径在/usr目录
4.  执行`make`进行编译，这里是`make`而不是`make install` 
5.  编译完成后，可以`cd objs`目录下，看到多了很多文件，接下来就要开始替换了 
6.  备份原nginx：`sudo cp /usr/sbin/nginx /usr/sbin/nginx.old`，出现意外情况时可以快速回滚 
7.  强制替换掉原nginx：`cp -f nginx /usr/sbin/nginx` 
8.  检测配置文件是否正确，这里非常重要 
   -  执行`sudo /usr/sbin/nginx -t` ，检测配置文件，如果这里出现fail，则接下来的步骤都无法执行 
   -  汇总一些常见配置文件错误问题 
      - _权限不足：_修改配置文件中的user为root
      - _dynamic modules版本异常：_注释掉配置文件中的`include /usr/share/nginx/modules/*.conf;`
   -  这里放一个我的配置文件  
      ```conf
      user nginx;
      worker_processes auto;
      error_log /var/log/nginx/error.log;
      pid /run/nginx.pid;

      # Load dynamic modules. See /usr/share/doc/nginx/README.dynamic.
      # include /usr/share/nginx/modules/*.conf;

      events {
         worker_connections 1024;
      }

      http {
         log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                           '$status $body_bytes_sent "$http_referer" '
                           '"$http_user_agent" "$http_x_forwarded_for"';

         access_log  /var/log/nginx/access.log  main;

         sendfile            on;
         tcp_nopush          on;
         tcp_nodelay         on;
         keepalive_timeout   65;
         types_hash_max_size 2048;

         include             /etc/nginx/mime.types;
         default_type        application/octet-stream;

         # Load modular configuration files from the /etc/nginx/conf.d directory.
         # See http://nginx.org/en/docs/ngx_core_module.html#include
         # for more information.
         include /etc/nginx/conf.d/*.conf;

         server {
            listen       8080 default_server;
            listen       [::]:8080 default_server;
            server_name  _;
            root         /usr/share/nginx/html;

            # Load configuration files for the default server block.
            include /etc/nginx/default.d/*.conf;
            location / {
            }
            error_page 404 /404.html;
                  location = /40x.html {
            }
            error_page 500 502 503 504 /50x.html;
                  location = /50x.html {
            }
         }
      }
      ```

## 配置&&验证

1. 验证当前服务器上的nginx版本：`/usr/sbin/nginx -V`是否已经升级
2. 查找当前nginx的master进程：`ps aux | grep nginx | grep -v grep`
3. 向主进程（master）发送USR2信号，Nginx会启动一个新版本的master进程和对应工作进程，和旧版一起处理请求 `kill -USR2 pid`
4. 向旧的Nginx主进程（master）发送WINCH信号，它会逐步关闭自己的工作进程（主进程不退出），这时所有请求都会由新版Nginx处理`kill -WINCH pid`
5. 【可选】升级完毕，可向旧的Nginx主进程（master）发送（QUIT、TERM、或者KILL）信号，使旧的主进程退出 `kill -15 pid`
6. 访问测试
