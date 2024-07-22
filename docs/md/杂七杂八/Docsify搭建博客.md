# Docsify本地安装
# **本地环境搭建**
建议配置本地环境，这样可以快速看到网站效果

1. 安装npm：[https://www.liaoxuefeng.com/wiki/1022910821149312/1023025597810528](https://www.liaoxuefeng.com/wiki/1022910821149312/1023025597810528)
2. 安装docsify-cli：npm i docsify-cli -g
3. 代码拉取：git clone git@devhost27:cube-base/cube-base-doc.git
4. 切换分支：git check -b v1.6.x origin/v1.6.x
5. 进入目录：cd到项目目录下
6. 本地启动项目：docsify serve docs
7. 启动验证：访问 localhost:3000

![](https://cdn.nlark.com/yuque/0/2024/png/5369311/1705548718340-a068a612-3563-4db8-a420-dcdefbb1a440.png#averageHue=%23d8e8c1&clientId=u610733cd-edf8-4&from=paste&id=u2bfdb3fb&originHeight=882&originWidth=1900&originalType=url&ratio=1.5&rotation=0&showTitle=false&status=done&style=none&taskId=ud580fd6d-a7d5-45bd-8502-f3d7cf456f6&title=)
# Docsify集成gitlab pages

- 网上资料很多，项目中没有用到，不再赘述
# Docsify集成服务器
## nginx

- 编译
```nginx
./configure --prefix=/home/cubebase/nginx \
--user=cubebase \
--group=cubebase \
--with-pcre \
--with-http_ssl_module \
--with-http_v2_module \
--with-http_realip_module \
--with-http_addition_module \
--with-http_sub_module \
--with-http_dav_module \
--with-http_flv_module \
--with-http_mp4_module \
--with-http_gunzip_module \
--with-http_gzip_static_module \
--with-http_random_index_module \
--with-http_secure_link_module \
--with-http_stub_status_module \
--with-http_auth_request_module \
--with-http_image_filter_module \
--with-http_slice_module \
--with-mail \
--with-threads \
--with-file-aio \
--with-stream \
--with-mail_ssl_module \
--with-stream_ssl_module \
--without-http_rewrite_module
```

- 我的nginx配置文件
```nginx
user  root;
#groups root;
worker_processes  1;

#error_log  logs/error.log;
#error_log  logs/error.log  notice;
#error_log  logs/error.log  info;

#pid        logs/nginx.pid;


events {
    worker_connections  1024;
}


http {
    include       mime.types;
    default_type  application/octet-stream;

    #log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
    #                  '$status $body_bytes_sent "$http_referer" '
    #                  '"$http_user_agent" "$http_x_forwarded_for"';

    #access_log  logs/access.log  main;
    access_log off;
    sendfile        on;
    #tcp_nopush     on;

    #keepalive_timeout  0;
    keepalive_timeout  65;

    gzip  on;

    server {
        listen       6080;
        server_name  localhost;

        #charset koi8-r;

        #access_log  logs/host.access.log  main;

        #location / {
        #    alias  /home/cb-doc/cube-base-doc/docs/;
        #    index  index.html index.htm;
        #}

        # 与本地代码路径保持一致
        location /v1.6 {
            alias  /home/cb-doc-v160/cube-base-doc/docs/;
            index  index.html index.htm;
        }

        location /v1.5 {
            alias  /home/cb-doc-v150/cube-base-doc/docs/;
            index  index.html index.htm;
        }

        # 配置的gitlab webhook，使用php脚本拉取代码
        location /update-git-v160 {
            include fastcgi_params;
            fastcgi_pass 127.0.0.1:6090; # 根据实际情况替换为您的PHP-FPM套接字路径
            fastcgi_param SCRIPT_FILENAME /home/cb-doc-v160/cube-base-doc/gitpull.php;
            fastcgi_param SCRIPT_NAME $fastcgi_script_name;
        }

        location /update-git-v150 {
            include fastcgi_params;
            fastcgi_pass 127.0.0.1:6090; # 根据实际情况替换为您的PHP-FPM套接字路径
            fastcgi_param SCRIPT_FILENAME /home/cb-doc-v150/cube-base-doc/gitpull.php;
            fastcgi_param SCRIPT_NAME $fastcgi_script_name;
        }
        error_page  404              /404.html;

        # redirect server error pages to the static page /50x.html
        #
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }

        # proxy the PHP scripts to Apache listening on 127.0.0.1:80
        #
        #location ~ \.php$ {
        #    proxy_pass   http://127.0.0.1;
        #}

        # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
        #
        #location ~ \.php$ {
        #    root           html;
        #    fastcgi_pass   127.0.0.1:9000;
        #    fastcgi_index  index.php;
        #    fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
        #    include        fastcgi_params;
        #}

        # deny access to .htaccess files, if Apache's document root
        # concurs with nginx's one
        #
        #location ~ /\.ht {
        #    deny  all;
        #}
    }


    # another virtual host using mix of IP-, name-, and port-based configuration
    #
    #server {
    #    listen       8000;
    #    listen       somename:8080;
    #    server_name  somename  alias  another.alias;

    #    location / {
    #        root   html;
    #        index  index.html index.htm;
    #    }
    #}


    # HTTPS server
    #
    #server {
    #    listen       443 ssl;
    #    server_name  localhost;

    #    ssl_certificate      cert.pem;
    #    ssl_certificate_key  cert.key;

    #    ssl_session_cache    shared:SSL:1m;
    #    ssl_session_timeout  5m;

    #    ssl_ciphers  HIGH:!aNULL:!MD5;
    #    ssl_prefer_server_ciphers  on;

    #    location / {
    #        root   html;
    #        index  index.html index.htm;
    #    }
    #}

}
```
## php

- ssh文件
- php启动权限
- [安装及启动](https://www.myfreax.com/install-php-7-on-centos-7/#google_vignette)
   - `yum install php php-common php-opcache php-mcrypt php-cli php-gd php-curl php-mysqlnd`
   - `yum install php-fpm -y`
- 修改`/etc/php-fpm.d/www.conf`
   - `listen = 127.0.0.1:6090`
   - `user=root`
   - `group=root`
   - 补充说明：也可以不配置root，但是建议与nginx启动用户保持一致，否则会遇到各种文件访问权限问题	
- 修改` vim /etc/php-fpm.conf`
   - 设置daemon=yes
- 创建目录：`mkdir -p /var/log/php-fpm`
- 启动`systemctl start php-fpm`
   - 启动失败请查看日志，有可能是端口权限问题
- 权限问题：[https://blog.csdn.net/ufan94/article/details/82788694](https://blog.csdn.net/ufan94/article/details/82788694)

## git

- 服务器上安装git，并正确配置ssh
- ssh配置：
   - `ssh-keygen -o`
- `git clone` 拉取代码
- `git checkout -b branch origin/branch`切换到指定分支（如v1.6.x）

## gitlab
目前采用了pipeline + webhook的方式进行代码更新
首先，配置`.gitlab-ci.yml`进行流水线触发
在`webhook`配置中，采用了如下配置，通过访问nginx代理端口，触发php脚本执行，触发事件选择的是`pipeline events`
![image.png](https://cdn.nlark.com/yuque/0/2024/png/5369311/1705543277444-22061b6b-e5bc-4dc1-ab80-4ec709c9267c.png#averageHue=%23e9eee8&clientId=u610733cd-edf8-4&from=paste&height=69&id=ua1ee32a0&originHeight=103&originWidth=961&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=13220&status=done&style=none&taskId=uddff5acb-5517-4133-883f-a05e3516f58&title=&width=640.6666666666666)

当然，也可以不配置`pipeline`，直接采用`webhook`，触发事件选择`push events`
# 参考资料

- 版本切换：[https://github.com/docsifyjs/docsify/issues/341](https://github.com/docsifyjs/docsify/issues/341)
- 快速开始：[https://www.cnblogs.com/Can-daydayup/p/15413267.html](https://www.cnblogs.com/Can-daydayup/p/15413267.html)
- 官网：[https://docsify.js.org/#/configuration?id=relativepath](https://docsify.js.org/#/configuration?id=relativepath)
- 资源：[https://juejin.cn/post/7002911266385707022](https://juejin.cn/post/7002911266385707022)
- 资源2：[https://github.com/docsifyjs/awesome-docsify](https://github.com/docsifyjs/awesome-docsify)
- 我的项目：[https://gitlab.com/cb-v24/blog/-/jobs/5858418716](https://gitlab.com/cb-v24/blog/-/jobs/5858418716)
- 搭建：[https://github.com/YSGStudyHards/Docsify-Guide/blob/main/ProjectDocs/Docsify%E9%83%A8%E7%BD%B2%E6%95%99%E7%A8%8B.md](https://github.com/YSGStudyHards/Docsify-Guide/blob/main/ProjectDocs/Docsify%E9%83%A8%E7%BD%B2%E6%95%99%E7%A8%8B.md)
- 插件介绍：[https://cloud.tencent.com/developer/article/2177009](https://cloud.tencent.com/developer/article/2177009)
