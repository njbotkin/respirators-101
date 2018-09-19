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
// copied from https://github.com/misterparser/cheerio-tableparser/blob/master/index.js on 2018-09-19
module.exports = function($) {
    $.prototype.parsetable = function() {

        let columns = [],
            curr_x = 0,
            curr_y = 0;

        $("tr", this).each(function(row_idx, row) {
            curr_y = 0;
            $("td, th", row).each(function(col_idx, col) {

                let rowspan = $(col).attr('rowspan') || 1;
                let colspan = $(col).attr('colspan') || 1;

                let content = $(col).html() || ""
                let classes = $(col).attr('class') || ''

                let x = 0,
                    y = 0;

                for (x = 0; x < rowspan; x++) {
                    for (y = 0; y < colspan; y++) {
                        if (columns[curr_y + y] === undefined) {
                            columns[curr_y + y] = []
                        }

                        while (columns[curr_y + y][curr_x + x] !== undefined) {
                            curr_y += 1
                            if (columns[curr_y + y] === undefined) {
                                columns[curr_y + y] = []
                            }
                        }

                        columns[curr_y + y][curr_x + x] = { content, classes }
                    }
                }
                curr_y += 1;
            });
            curr_x += 1;
        });

        return columns;
    };
}