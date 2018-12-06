import sh from 'sh-exec'

sh`
if [ ! -e node_modules/.bin/api-secret ]
then
  curl https://raw.githubusercontent.com/elasticdog/transcrypt/master/transcrypt -o node_modules/.bin/api-secret
  chmod +x node_modules/.bin/api-secret
fi
`
