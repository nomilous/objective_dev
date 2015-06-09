### Testing This

#### continuous

```bash
TEST_GLOBAL=test \
    node_modules/.bin/mocha \
    --watch \
    --compilers coffee:coffee-script/register test/**/*_spec.*
```

#### once

```bash
npm test
```
