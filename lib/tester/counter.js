var pipeline = objective.pipeline
  , counters
  , multiple
  ;

// rootless, will need to extend to support multiple concurrent root runs

module.exports.counters = counters = {
  pass: 0,
  fail: 0,
  pend: 0,
  skip: 0,
  hook: 0,
  test: 0
}

pipeline.on('objective.multiple.start', function() {
  multiple = true;
  counters.pass = 0;
  counters.fail = 0;
  counters.pend = 0;
  counters.skip = 0;
  counters.hook = 0;
  counters.test = 0;
});

pipeline.on('objective.multiple.end', function(args) {
  multiple = false;
  args.root.exitCode = counters.fail;
  // console.log({COUNTERS:counters});
});

pipeline.on('dev.test.before.all', function() {
  if (!multiple) {
    counters.pass = 0;
    counters.fail = 0;
    counters.pend = 0;
    counters.skip = 0;
    counters.hook = 0;
    counters.test = 0;
  }
});

pipeline.on('dev.test.after.all', function() {
  if (!multiple) {
    args.root.exitCode = counters.fail;
    // console.log({COUNTERS:counters});
  }
});

pipeline.on('dev.test.after.each', function(args) {
  var testNode = args.test.node;

  if (testNode.error) counters.fail++
  else if (testNode.skip) counters.skip++
  else if (testNode.pend) counters.pend++
  else counters.pass++;

  args.steps.forEach(function(step) {
    if (!step.startAt) return;
    if (step.type == 'test') counters.test += step.endAt - step.startAt;
    else counters.hook += step.endAt - step.startAt;
  });
});
