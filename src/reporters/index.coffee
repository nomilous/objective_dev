module.exports.default = require './default'

{pipeline} = objective

pipeline.on 'dev.test.after.all', (payload) ->

    {functions, tree} = payload

    # assemble stats

    allFailed = false

    for fn in functions

        if fn.type != 'test' and fn.error?

            allFailed = true

    totalHookDuration = totalTestDuration = 0

    for {duration, type} in functions

        if type == 'test'

            totalTestDuration += duration if duration?
            continue

        totalHookDuration += duration if duration?

    failed = 0
    passed = 0
    skipped = 0
    pending = 0

    recurse = (node, skipping = false) ->

        if node.type == 'it'

            pending++ if node.pending

            skipped++ if node.skip or skipping or tree.only

            skipped-- if tree.only and node.only

            unless node.pending or node.skip or skipping

                if tree.only 

                    if node.only

                        if node.error or allFailed then failed++ else passed++

                else

                    if node.error or allFailed then failed++ else passed++

        if node.type == 'context'

            skipping = true if node.skip

        recurse child, skipping for child in node.children if node.children?
    
    recurse tree

    payload.stats = 

        failed: failed
        passed: passed
        skipped: skipped
        pending: pending
        totalTestDuration: totalHookDuration
        totalHookDuration: totalHookDuration

