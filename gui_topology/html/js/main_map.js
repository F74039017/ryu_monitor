var width = 1280,
    height = 960,
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
    .on('click', zoomOut);

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

//draw map with toopojson
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
            .on('click', zoomIn_reg)
            .on('mousemove', hover_show)
            .on('mouseout', hover_reset);

        region[i].append('path')
            .datum(topojson.mesh(map, map.objects['reg_' + i], zoomDiff_reg))
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
            .on('mousemove', hover_show)
            .on('mouseout', hover_reset);

        dept[i].append('path')
            //.datum(topojson.mesh(map, map.objects['dept_' + i], zoom_diff))
            .attr('d', path)
            .attr('class', 'mesh_reg');

        dept[i].attr('visibility', 'hidden');
    }
});

//hover to show tooltip
function hover_show(d) {
    var mouse = d3.mouse(svg.node()).map(function(d) {
        return parseInt(d);
    });

    tooltip.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 15) + 'px; top:' + (mouse[1] - 35) + 'px')
        .html(d.properties.name);
}

//hover to hiddent tooltip
function hover_reset() {
    tooltip.classed('hidden', true);
}

//click to reset zoom
function zoomOut() {
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

//click to zoom in
function zoomIn_reg(d) {
    if (active.node() === this)
        return zoomOut_reg(d);

    active.classed('active', false);
    active = d3.select(this).classed('active', true);

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

    console.log(d.properties.name);

    /*water.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

    road.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');*/
}

//click to reset zoom
function zoomOut_reg(d) {
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

//click to zoom the different one
function zoomDiff_reg(a, b) {
    return a !== b;
}

//change the size of the view
function sizeChange() {
    d3.select("g")
        .attr("transform", "scale(" + $(".map-demo").width() / 900 + ")");

    $("svg").height($(".map-demo")
        .width() * 0.618);
}
