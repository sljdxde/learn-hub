1. 应用停服
- 绘制一个静态页面，使用nginx进行代理（应用升级中21:00-23:00）
   - 可参考：`[http://172.21.28.66/](http://172.21.28.66/)`
```shell
location / {
	root /opt/nginx-1.20.1/html;
    index  index.html;
    add_header Cache-Control "private, no-store, no-cache, must-revalidate, proxy-revalidate";
}

location /123/ {
	root /opt/nginx-1.20.1/html;
    index  index.html;
    add_header Cache-Control "private, no-store, no-cache, must-revalidate, proxy-revalidate";
}
```

   - 注意
      - 如果有多个入口，需要在服务器的root路径后配置多个访问路径，均存储 index.html
      - 增加`add_header`配置禁用缓存，否则会导致重启后用户依然访问浏览器缓存页面
- 停止后端服务、邮箱服务、数据库锁服务、工作流服务

2. 关闭主从并备份数据库
- 优先操作备库
- 再操作主库

3. 备份当前文件并停止mysql
- 全库备份`mysqldump -E -R --triggers --single-transaction -uroot -p --all-databases > all.sql`
- 停止服务`service mysqld stop`
- `which mysql` 找到mysql二进制文件所在路径（也可以使用`ps -ef | grep mysqld`找到`bin`目录）
- 备份该路径下的全部文件（`tar -zcvf mysql.old.tar.gz *`）

4. 解压新包并覆盖原文件
- `tar -zxvf mysql.tar.gz`
- 进入到新版本mysql的bin目录下
- 强制覆盖掉原mysql的bin目录下文件：`yes | cp -f * /usr/local/mysql/bin`。使用管道符方式，默认刷yes到所有cp -i命令中

5. 启动服务并检查
- 启动服务`service mysqld start`
- 检查`./mysql_upgrade -uroot -p --force --skip-version-check -S /data/mysql/datanode1/mysql.sock`
   - **注意：** -S 后面的mysql.sock路径，需要去`/etc/my.cnf`进行查询

![微信截图_20220114101231.png](https://cdn.nlark.com/yuque/0/2022/png/5369311/1642126361675-0f4fcf57-b98d-42fb-a965-08d2d66eebbe.png#clientId=uc148c2da-df9f-4&from=ui&id=uf5aea4f6&originHeight=423&originWidth=649&originalType=binary&ratio=1&rotation=0&showTitle=false&size=38885&status=done&style=none&taskId=u93b94654-f6a5-43eb-b040-8c333626347&title=)

- 执行`mysql -V`查看版本信息

![2.png](https://cdn.nlark.com/yuque/0/2022/png/5369311/1642126464672-eb514ccc-cc8f-40d8-8eae-02698d1f7481.png#clientId=u635562a4-1cfa-4&from=ui&id=u80133414&originHeight=101&originWidth=852&originalType=binary&ratio=1&rotation=0&showTitle=false&size=11971&status=done&style=none&taskId=u243a6b8a-ace9-41d6-a4d1-70910c88fcf&title=)

6. 如果忘记root密码，参考：[https://www.cnblogs.com/zhangpeng8888/p/12920671.html](https://www.cnblogs.com/zhangpeng8888/p/12920671.html)

其他参考文章：[https://www.pianshen.com/article/81072058059/](https://www.pianshen.com/article/81072058059/)
