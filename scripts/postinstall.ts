import sh from 'sh-exec'

sh`
[ ! -e node_modules/.bin/transcrypt ] &&
  curl https://raw.githubusercontent.com/elasticdog/transcrypt/master/transcrypt -o node_modules/.bin/transcrypt
  chmod +x node_modules/.bin/transcrypt
`
