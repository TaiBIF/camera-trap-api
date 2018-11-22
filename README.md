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

### Branching strategy

1. **master**: main development branch. Will merge into _uat_ when ready for public testing.
2. **dev-[personID]**: personal working branch. **Only the creator can commit to this branch**. Will merge into _master_ when complete. Should be deleted once merged into _master_.
3. **feature-[featureID]**: feature working branch. Will merge into _master_ when complete. Should be deleted once merged into _master_.
4. **issue-[issueID]**: issue working branch. Will merge into _master_ when complete. Should be deleted once merged into _master_.
5. **uat**: user acceptance testing branch. Will merge into _production_ when ready.
6. **production**: public version.
