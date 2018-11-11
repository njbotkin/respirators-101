/*!
 * cheerio-tableparser
 * https://github.com/misterparser/cheerio-tableparser
 * https://www.npmjs.com/package/cheerio-tableparser
 *
 * Copyright (c) 2011 Francis Chong
 * Copyright (c) 2016 Mister Parser
 * Licensed under the MIT licenses.
 *
 */

const newRow = (row, $) => ({ classes: $(row).attr('class') || '', cells: [] })

// copied from https://github.com/misterparser/cheerio-tableparser/blob/master/index.js on 2018-09-19
module.exports = function($) {
    $.prototype.parsetable = function(skip) {

        let rows = [],
            curr_y = 0,
            curr_x = 0;

        $("tr", this).slice(skip).each(function(row_idx, row) {
            curr_x = 0;

            rows[curr_y] = newRow(row, $)

            $("td, th", row).each(function(col_idx, col) {

                let colspan = $(col).attr('colspan') || 1;
                let content = $(col).html() || ""
                let classes = $(col).attr('class') || ''

                let x = 0,
                    y = 0;

                for (x = 0; x < colspan; x++) {
                    rows[curr_y + y].cells[curr_x + x] = { content, classes }
                }
                curr_x += x;
            });
            curr_y += 1;
        });

        // console.log(JSON.stringify(rows, null, '  '))

        return rows;
    };
}