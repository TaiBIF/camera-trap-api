# camera-trap-api
Using LoopBack to develop RESTful API

<p>
  <a href="https://github.com/TaiBIF/camera-trap-api/releases">
    <img src="https://flat.badgen.net/github/release/TaiBIF/camera-trap-api" />
  </a>

  <a href="https://circleci.com/gh/TaiBIF/camera-trap-api" alt="Build Status">
    <img src="https://flat.badgen.net/circleci/github/TaiBIF/camera-trap-api/master" />
  </a>
  <a href="https://codecov.io/gh/TaiBIF/camera-trap-api" alt="Coverage">
    <img src="https://flat.badgen.net/codecov/c/github/TaiBIF/camera-trap-api" />
  </a>
  <img src="https://flat.badgen.net/github/license/TaiBIF/camera-trap-api" />
</p>

## Setup the develop environment
### 1. Clone repositories
```bash
# host
$ git clone git@github.com:TaiBIF/camera-trap-api.git
$ cd camera-trap-api
$ npm install
```

### 2. Install redis server
We use a [task queue](https://github.com/Automattic/kue) based on [redis](https://redis.io/).
```bash
$ brew install redis
```

### 3. Install libraries
We use [gm](https://www.npmjs.com/package/gm), so that we need install [graphicsmagick](http://www.graphicsmagick.org/) or imagemagick.
```bash
$ brew install graphicsmagick
```

### 4. Running it locally
```bash
$ npm start
```

## Commands
### Create collections and indexes of all models.
```bash
$ node . -c
```
### Insert database default data.
```bash
$ node . -i
```

## Branching strategy
1. **master**: main development branch. No CI workflow connected.
2. **dev**: connedted to dev CI workflow. Will merge into _uat_ when ready for User Acceptance Testing.
2. **dev-[personID]**: personal working branch. **Only the creator can commit to this branch**. Will merge into _dev_ when complete. Should be deleted once merged into _dev_.
3. **feature-[featureID]**: feature working branch. Will merge into _dev_ when complete. Should be deleted once merged into _dev_.
4. **issue-[issueID]**: issue working branch. Will merge into _dev_ when complete. Should be deleted once merged into _dev_.
5. **uat**: user acceptance testing branch. Will merge into _prod_ when ready.
6. **prod**: production version.

## Note
+ What is brew?  
The missing package manager for macOS. [https://brew.sh](https://brew.sh)
