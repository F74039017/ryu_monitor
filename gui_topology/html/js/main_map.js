var width = 1366,
    height = 768,
    active = d3.select(null);

d3.select(window)
    .on("resize", sizeChange);

//set the projection of the map
var projection = d3.geo.mercator()
    .center([120.2175, 23.0007])
    .scale(3800000);

var path = d3.geo.path()
    .projection(projection);

//initialize the map
var svg = d3.select('.map-demo')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

svg.append("rect")
    .attr('class', 'background')
    .on('click', zoom_reset);

var g = svg.append('g')
    .style('stroke-width', '0.5px');

//tooltip for hover
var tooltip = d3.select('.map-demo')
    .append('div')
    .attr('class', 'hidden tooltip');

//construct the map.
var region = new Array(8),
    dept = new Array(8),
    road = svg.append('g'),
    water = svg.append('g');

for (i = 0; i < 9; ++i) {
    region[i] = svg.append('g');
    dept[i] = svg.append('g');
}

/* Draw map with TopoJSON */
d3.json('data/topojson/ncku.json', function(error, map) {
    if (error)
        return console.error(error);

    for (i = 0; i < 8; ++i) {
        region[i].selectAll('path')
            .data(topojson.feature(map, map.objects['reg_' + i]).features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', 'reg_' + i)
            .on('click', zoomReg)
            .on("dblclick", function(e) {
                e.preventDefault();
            })
            .on('mousemove', hover_show)
            .on('mouseout', function() {
                tooltip.classed('hidden', true);
            });

        region[i].append('path')
            .datum(topojson.mesh(map, map.objects['reg_' + i], function(a, b) {
                return a !== b;
            }))
            .attr('d', path)
            .attr('class', 'mesh_reg');
    }
});

d3.json('data/topojson/ncku.json', function(error, map) {
    if (error)
        return console.error(error);

    for (i = 0; i < 8; ++i) {
        dept[i].selectAll('path')
            .data(topojson.feature(map, map.objects['dept_' + i]).features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', 'dept_' + i)
            //.on('click', zoom_in)
            //.on("dblclick", function(e) {
            //    e.preventDefault();
            //})
            .on('mousemove', hover_show)
            .on('mouseout', function() {
                tooltip.classed('hidden', true);
            });

        dept[i].append('path')
            //.datum(topojson.mesh(map, map.objects['dept_' + i], zoom_diff))
            .attr('d', path)
            .attr('class', 'mesh_reg');

        dept[i].attr('visibility', 'hidden');
    }
});

/* Hover and show tooltip */
function hover_show(d) {
    var mouse = d3.mouse(svg.node()).map(function(d) {
        return parseInt(d);
    });

    tooltip.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 15) + 'px; top:' + (mouse[1] - 35) + 'px')
        .html(d.properties.name);
}

/* Click to zoom out */
function zoom_reset() {
    active.classed('active', false);
    active = d3.select(null);

    for (i = 0; i < 8; ++i) {
        region[i].transition()
            .duration(750)
            .style('stroke-width', '1.5px')
            .attr('transform', '');

        dept[i].attr('visibility', 'hidden')
    }
}

/* Click to zoom-in of the region */
function zoomReg(d) {
    if (active.node() === this)
        return zoomReg_reset(d);

    active.classed('active', false);
    active = d3.select(this).classed('active', true);

    var DELAY = 100,
        clicks = 0,
        timer = null;

    clicks++; //count clicks

    if (clicks === 1) {
        timer = setTimeout(function() {
            if ($('#tab-info').hasClass('visible')) {
                $('#tab-info').animate({ "right": "-1000px" }, 400).addClass('visible');
            }

            if ($('#tab-topo').hasClass('visible')) {
                $('#tab-topo').animate({ "right": "-1000px" }, 400).addClass('visible');
            }

            $('#tab-topo').animate({ "right": "0px" }, 400).addClass('visible');
            clicks = 0;
        }, DELAY);
    } /*else {
        clearTimeout(timer); //prevent single-click action
        if ($('#tab-topo').hasClass('visible')) {
            $('#tab-topo').animate({ "right": "-1000px" }, 500).addClass('visible');
        }
        $('#tab-info').animate({ "right": "0px" }, 500).addClass('visible');
        console.log('Double');
        clicks = 0;
    }*/


    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = 0.75 / Math.max(dx / width, dy / height),
        translate = [width / 2 - scale * x, height / 2 - scale * y];

    for (i = 0; i < 8; ++i) {
        dept[i].attr('visibility', 'hidden')

        region[i].transition()
            .duration(500)
            .style('stroke-width', 1.5 / scale + 'px')
            .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

        if (i == d.properties.reg) {
            dept[d.properties.reg].attr('transform', 'translate(' + translate + ')scale(' + scale + ')')

            dept[d.properties.reg].style('opacity', 0.0)
                .transition()
                .duration(250)
                .delay(250)
                .style('opacity', 1.0)
                .style('stroke-width', 1.5 / scale + 'px')
                .attr('visibility', 'visible');
        }
    }

    /*water.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

    road.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');*/
}

/* Click to reset the zoom-in of region */
function zoomReg_reset(d) {
    active.classed('active', false);
    active = d3.select(null);

    for (i = 0; i < 8; ++i) {
        region[i].transition()
            .duration(750)
            .style('stroke-width', '1.5px')
            .attr('transform', '');

        dept[i].attr('visibility', 'hidden');
    }

    /*water.transition()
        .duration(750)
        .style('stroke-width', '1.5px')
        .attr('transform', '');

    road.transition()
        .duration(750)
        .style('stroke-width', '1.5px')
        .attr('transform', '');

    dept.transition()
        .duration(750)
        .style('stroke-width', '1.5px')
        .attr('transform', '');*/
}

/* Change the size view of the window */
function sizeChange() {
    d3.select("g")
        .attr("transform", "scale(" + $(".map-demo").width() / 900 + ")");

    $("svg").height($(".map-demo").width() * 0.618);
}
