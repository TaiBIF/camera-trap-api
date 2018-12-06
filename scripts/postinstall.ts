import sh from 'sh-exec'

sh`
if [ ! -e /usr/local/bin/transcrypt ]
then
  curl https://raw.githubusercontent.com/elasticdog/transcrypt/master/transcrypt -o /usr/local/bin/transcrypt
  chmod +x /usr/local/bin/transcrypt
fi
`
