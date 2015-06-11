### Testing This

#### continuous

```bash
OBJECTIVE_DEV_PREPEND=test_ node_modules/.bin/mocha \
    --watch \
    --full-trace \
    --require should \
    --compilers coffee:coffee-script/register \
    test/**/*_spec.* test/*_spec.coffee
```
or
```bash
npm run-script continuous
```

#### once

```bash
npm test
```
