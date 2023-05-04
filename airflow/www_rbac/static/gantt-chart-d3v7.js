
const completed_blue = "#00c3ffa6";
const blueish = "#00c3ff33";
const pinkish = "#ff00fc33";
const orangish = "#ffbb0033";
const grayish = "#d2d2d233";
const redish = "#ff000033";
const dark_redish = "#AA000033";

const status_colors = {
  'queued': grayish,
  'retry': orangish,
  'up_for_retry': orangish,
  'skipped': pinkish,
  'failed': redish,
  'upstream_failed': dark_redish,
  'downstream_failed': dark_redish,
  'running': "#4dff0033",
  'success': blueish,
  'no status': grayish,
  nil: grayish,
  null: grayish,
};

d3.fancy_gantt = function() {
    var FIT_TIME_DOMAIN_MODE = "fit";
    var FIXED_TIME_DOMAIN_MODE = "fixed";

    // Setup tooltip
    var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html((EVENT,d) => {
        var s = "";
        s += "<div class='row'>";
        s += "<div class='col-md-3'>task:<br/>status:<br/>start:<br/>end:<br/>duration:</div>";
        s += "<div class='col-md-9'><span style='color: #AAA'> ";
        s += d.taskName + "<br/>";
        s += d.status + "<br/>";
        s += d.isoStart + "<br/>";
        s += d.isoEnd + "<br/>";
        s += d.duration + "<br/>";
        s += "</span></div>";
        s += "</div>";
        return s;
      })

    var margin = {
      top : 20,
      right : 40,
      bottom : 20,
      left : 40
    };

    var yAxisLeftOffset = 10;
    var selector = 'body';
    var timeDomainStart = d3.time.day.offset(new Date(),-3);
    var timeDomainEnd = d3.time.hour.offset(new Date(),+3);
    var timeDomainMode = FIT_TIME_DOMAIN_MODE;// fixed or fit
    var taskTypes = [];
    var taskStatus = [];
    var height = document.body.clientHeight - margin.top - margin.bottom-5;
    var width = $('.gantt').width() - margin.right - margin.left-5;

    var tickFormat = "%H:%M";

    var keyFunction = function(d) {
      return d.startDate + d.taskName + d.endDate;
    };

    var rectTransform = function(d) {
      return "translate(" + (x(d.startDate) + yAxisLeftOffset) + "," + y(d.taskName) + ")";
    };

    var rectTransformFullLength = function(d) {
      return "translate(" + (yAxisLeftOffset) + "," + y(d.taskName) + ")";
    };

    var x = d3.time.scale().domain([ timeDomainStart, timeDomainEnd ]).range([ 0, (width-yAxisLeftOffset) ]).clamp(true);

    var y = d3.scale.ordinal().domain(taskTypes).rangeRoundBands([ 0, height - margin.top - margin.bottom ], .1);

    var xAxis = d3.axisBottom(d3.svg)
    .scale(x)
    .tickFormat(d3.time.format(tickFormat))
    .tickSize(8)
    .tickPadding(8);

    var yAxis = d3.axisLeft(d3.svg).scale(y).tickSize(0);

    var initTimeDomain = function(tasks) {
      if (timeDomainMode === FIT_TIME_DOMAIN_MODE) {
        if (tasks === undefined || tasks.length < 1) {
          timeDomainStart = d3.time.day.offset(new Date(), -3);
          timeDomainEnd = d3.time.hour.offset(new Date(), +3);
          return;
        }
        tasks.sort(function(a, b) {
          return a.endDate - b.endDate;
        });
        timeDomainEnd = tasks[tasks.length - 1].endDate;
        tasks.sort(function(a, b) {
          return a.startDate - b.startDate;
        });
        timeDomainStart = tasks[0].startDate;
      }
    };

    var initAxis = function() {
      x = d3.time.scale().domain([ timeDomainStart, timeDomainEnd ]).range([ 0, width-yAxisLeftOffset ]).clamp(true);
      y = d3.scale.ordinal().domain(taskTypes).rangeRoundBands([ 0, height - margin.top - margin.bottom ], .1);
      xAxis = d3.axisBottom(d3.svg)
      .scale(x)
      .tickFormat(d3.time.format(tickFormat))
      .tickSize(8)
      .tickPadding(8);

      yAxis = d3.axisLeft(d3.svg).scale(y).tickSize(0);
    };

    function gantt(tasks) {

      initTimeDomain(tasks);
      initAxis();

      // Setup the SVG
      var svg = d3.select(selector)
      .append("svg")
      .attr("class", "chart")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("class", "gantt-chart")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

      const startColor = [255, 255, 255]; // white
      const endColor = [0, 195, 255]; // light blue
      const numSteps = tasks.length + 1; // number of steps in the gradient

      const colorArray = new Array(numSteps).fill(null).map((_, i) => {
        const ratio = i / (numSteps - 1);
        const color = startColor.map((startVal, j) => {
          const endVal = endColor[j];
          const val = startVal + ratio * (endVal - startVal);
          return Math.round(val);
        });
        const alpha = 0.2; // Math.round(255 * ratio); // alpha channel increases with ratio
        return `rgba(${color.join(',')},${alpha})`;
      });


      function rgbaToHex(rgba) {
        var parts = rgba.substring(rgba.indexOf("(")).split(",");
        var r = parseInt(parts[0].substring(1));
        var g = parseInt(parts[1]);
        var b = parseInt(parts[2]);
        var a = parseFloat(parts[3].substring(0, parts[3].length - 1));

        var hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        var alpha = Math.round(a * 255).toString(16);
        if (alpha.length == 1) {
          alpha = "0" + alpha;
        }
        hex += alpha;

        return hex;
      }

    // Setup row status color highlight
    // that runs borders & colors behind the gantt blocks..
    svg.selectAll(".chart")
    .data(tasks, keyFunction).enter()
    .append("rect")
    .each(function(d, i) {
        if(d.status == 'success') {
            d3.select(this).style('fill', rgbaToHex(colorArray[i]) )
        } else {
            d3.select(this).style('fill', status_colors[d.status] )
        }
    })
    .attr("y", 0)
    .attr("transform", rectTransformFullLength)
    .attr("height", function(d) {
        if(d.status == 'success') {
            return y.rangeBand() + 2; // overlap to next row
        } else {
            return y.rangeBand() + 1; // leave one pixel so double failed rows are a bit more noticable
        }
    })
    .attr("width", width)
    .attr('stroke', '#00000000')
    .attr('stroke-width', '0')
    .attr('rx', '3px')
    // Tooltip so that we can still select the task
    .on('mouseover', tip.show)
    .on('mouseout', tip.hide)
    .on('click', function(d, i) {
      call_modal(i.taskName, i.executionDate);
    })
    ;

    // Setup the Green Blocks
    svg.selectAll(".chart")
      .data(tasks, keyFunction).enter()
      .append("rect")
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide)
      .on('click', function(d, i) {
        call_modal(i.taskName, i.executionDate);
      })
      .each(function(d, i) {
        if(d.status != 'success') {
          var str = status_colors[d.status];
          var harder_alpha = str.substring(0, str.length - 2) + "a6"
          return d3.select(this).style('fill', harder_alpha)
        }
        return d3.select(this).style('fill', completed_blue);
      })
      // .attr("fill", completed_blue)
      .attr("y", 0)
      .attr("transform", rectTransform)
      .attr("height", function(d) { return y.rangeBand(); })
      .attr("width", function(d) {
        return d3.max([x(d.endDate) - x(d.startDate), 1]);
      })
      .attr('stroke', '#00000000')
      .attr('stroke-width', '0')
      .attr('rx', '3px')

      function block_hits_wall(d) {
        var block_pos_offset  = x(d.startDate) + yAxisLeftOffset + x(d.endDate);
        return block_pos_offset >= width - 100;
      }

      // Text for each of the Blocks
    svg.selectAll(".chart")
      .data(tasks, keyFunction).enter()
      .append("text")
      .attr("dy", "0.15em")
      .attr("fill", "#00000055")
      .attr("y", 15)
      .attr("x", function(d) {
        if(block_hits_wall(d)) {
            // If the block fills the entire screen..
            if(x(d.startDate) <= 100) {
                // Place text inside the block
                return 5;
            } else {
                // Place text outside the block
                return -5;
            }
        } else {
            // Place text outside the block
            return d3.max([x(d.endDate) - x(d.startDate), 1]) + 5;
        }
      })
      .attr("text-anchor", function(d) {
        if(block_hits_wall(d)) {
            // If the block fills the entire screen..
            if(x(d.startDate) <= 100) {
                // Place text inside the block
                return "start";
            } else {
                // Place text outside the block
                return "end";
            }
        } else {
            // Place text outside the block
            return "start";
        }
      })
      .attr("transform", rectTransform)
      .attr("height", function(d) { return y.rangeBand(); })
      .attr("stroke", "#00c3ff11")
      .text(function(d) { return d.taskName; })
      .style("font", "11px sans-serif")
      ;

    // Bottom chart X-Axis
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(" + yAxisLeftOffset + ", " + (height - margin.top - margin.bottom) + ")")
      .transition()
      .call(xAxis);

    svg.call(tip);

    return gantt;
  }; // end function gantt(tasks) {

  gantt.redraw = function(tasks) {

      initTimeDomain(tasks);
      initAxis();

      var svg = d3.select(".chart");

      var ganttChartGroup = svg.select(".gantt-chart");
      var rect = ganttChartGroup.selectAll("rect").data(tasks, keyFunction);

    rect.enter()
      .insert("rect",":first-child")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("class", function(d){
        if(taskStatus[d.status] == null){ return "bar";}
        return taskStatus[d.status];
      })
      .transition()
      .attr("y", 0)
      .attr("transform", rectTransform)
      .attr("height", function(d) { return y.rangeBand(); })
      .attr("width", function(d) {
        return (x(d.endDate) - x(d.startDate));
      });

    rect.transition()
      .attr("transform", rectTransform)
      .attr("height", function(d) { return y.rangeBand(); })
      .attr("width", function(d) {
        return (x(d.endDate) - x(d.startDate));
      });

      rect.exit().remove();

      svg.select(".x").transition().call(xAxis);
      svg.select(".y").transition().call(yAxis);

      return gantt;
  }; // end gantt.redraw = function(tasks) {

  gantt.margin = function(value) {
      if (!arguments.length)
        return margin;
      margin = value;
      return gantt;
  };

  gantt.timeDomain = function(value) {
      if (!arguments.length)
        return [ timeDomainStart, timeDomainEnd ];
      timeDomainStart = +value[0], timeDomainEnd = +value[1];
      return gantt;
  };

  /**
   * @param {string}
   *                vale The value can be "fit" - the domain fits the data or
   *                "fixed" - fixed domain.
   */
  gantt.timeDomainMode = function(value) {
      if (!arguments.length)
        return timeDomainMode;
      timeDomainMode = value;
      return gantt;

  };

  gantt.taskTypes = function(value) {
      if (!arguments.length)
        return taskTypes;
      taskTypes = value;
      return gantt;
  };

  gantt.taskStatus = function(value) {
      if (!arguments.length)
        return taskStatus;
      taskStatus = value;
      return gantt;
  };

  gantt.width = function(value) {
      if (!arguments.length)
        return width;
      width = +value;
      return gantt;
  };

  gantt.height = function(value) {
      if (!arguments.length)
        return height;
      height = +value;
      return gantt;
  };

  gantt.tickFormat = function(value) {
      if (!arguments.length)
        return tickFormat;
      tickFormat = value;
      return gantt;
  };

  gantt.selector = function(value) {
      if (!arguments.length)
        return selector;
      selector = value;
      return gantt;
  };

  return gantt;
}; // end fancy_gantt
