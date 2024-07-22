1. 修改git的commit信息 
   - `git commit --amend`
   - `git log`
   - `git rebase -i HEAD ~3`

- [参考文章](https://www.jianshu.com/p/0f1fbd50b4be)
- github条件搜索

2. 怎样为电脑配置多个git账号

- 打开git-bash.exe，生成公钥和私钥
- `ssh-keygen -t rsa -C "1@1.com" -f ~/.ssh/gitlab_id-rsa` (文件名用于进行区分gitlab和github)
- 类似，`ssh-keygen -t rsa -C "24@qq.com" -f ~/.ssh/github_id-rsa`
- 用notepad打开`.pub`公钥文件，分别复制到gitlab和github账户。
- 接下来，编辑`.ssh`目录下的`config`文件： 
```
可以通过vi .ssh/config的方式进行编辑，也可以直接右键进入文本编辑

Host gitlab    //公司的代码仓库服务器地址
    User 用户名称
    IdentityFile ~/.ssh/id_rsa
Host git@github.com   //个人的代码仓库服务器地址
    User 用户名称
    IdentityFile ~/.ssh/github_rsa
```

这里，如果不知道服务器地址的，可以打开`clone or download`，里面有具体地址。

- 添加ssh免密登录 
```
#一般的情况下ssh-agent是启动的
ssh-agent -s
#启动
ssh-agent 
#查看已有的SSH keys
ls -al ~/.ssh
#添加到ssh-agent中
ssh-add ~/.ssh/github_id-rsa
ssh-add ~/.ssh/gitlab_id-rsa
```

如果执行 ssh-add 时显示错误 Could not open a connection to your authentication agent，那么执行`eval $(ssh-agent)`

- 接下来，在任意目录下测试 
```
ssh -T git@xxx.git.cn
# Welcome to GitLab, @fei.chen!
ssh -T git@github.com
# Hi alex2chen! You've successfully authenticated, but GitHub does not provide shell access.
```

当出现欢迎语句时，说明配置成功。

- 目前配置成功后，进行clone代码时，仍然存在一定问题，不过不影响使用，具体如下： 
   1. 一般会配置公司的gitlab账户为global，然后使用ssh时，提示输入密码，怎么也输入不正确，直接改为使用http方式clone代码即可。
   2. 在clone自己的github账户时，如果修改了路径（即不使用之前配置ssh时，打开git bash的路径，使用ssh -T 会报错），此时需要在之前的路径下打开git bash，在clone时指定download目录。
