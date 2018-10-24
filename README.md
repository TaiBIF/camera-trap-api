# camera-trap-api
Using LoopBack to develop RESTful API

### Branching strategy

1. **master**: main development branch. Will merge into _uat_ when ready for public testing.
2. **dev-[personID]**: personal working branch. **Only the creator can commit to this branch**. Will merge into _master_ when complete. Should be deleted once merged into _master_.
3. **feature-[featureID]**: feature working branch. Will merge into _master_ when complete. Should be deleted once merged into _master_.
4. **uat**: user acceptance testing branch. Will merge into _production_ when ready.
5. **production**: public version.
