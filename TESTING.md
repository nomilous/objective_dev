### Testing This

#### continuous

```bash
TEST_GLOBAL=test \
    node_modules/.bin/mocha \
    --watch \
    --require should \
    --compilers coffee:coffee-script/register test/**/*_spec.* test/*_spec.coffee
```

#### once

```bash
npm test
```
