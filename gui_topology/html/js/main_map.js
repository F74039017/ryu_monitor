var width = "100%",
    height = "100%",
    active = d3.select(null);

d3.select(window)
    .on("resize", sizeChange);

//set the projection of the map
var projection = d3.geo.mercator()
    .center([120.2175, 23.0007])
    .scale(3900000);

var path = d3.geo.path()
    .projection(projection);

//initialize the map
var svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height);

svg.append("rect")
    .attr('class', 'background')
    .attr('width', width)
    .attr('height', height)
    .on('click', zoomOut);

var g = svg.append('g')
    .style('stroke-width', '0.5px');

//tooltip for hover
var tooltip = d3.select('body')
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
d3.json('topojson/ncku.json', function(error, map) {
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
            //.datum(topojson.mesh(map, map.objects['reg_' + i], zoomDiff_reg))
            .attr('d', path)
            .attr('class', 'mesh_reg');
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
        dept[i].selectAll('path')
            .remove();

        region[i].transition()
            .duration(750)
            .style('stroke-width', '1.5px')
            .attr('transform', '');
    }
}

//click to zoom in
function zoomIn_reg(d) {
    if (active.node() === this)
        return zoomOut_reg(d);

    active.classed('active', false);
    active = d3.select(this).classed('active', true);

    console.log()

    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = .9 / Math.max(dx / width, dy / height),
        translate = [width / 2 - scale * x, height / 2 - scale * y];

    d3.json('topojson/ncku.json', function(error, map) {
        if (error)
            return console.error(error);

        dept[d.properties.reg].selectAll('path')
            .data(topojson.feature(map, map.objects['dept_' + d.properties.reg]).features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', 'dept_' + d.properties.reg)
            //.on('click', zoom_in)
            .on('mousemove', hover_show)
            .on('mouseout', hover_reset);

        dept[d.properties.reg].append('path')
            //.datum(topojson.mesh(map, map.objects['dept_' + d.properties.reg], zoom_diff))
            .attr('d', path)
            .attr('class', 'mesh_reg');

    });

    for (i = 0; i < 8; ++i) {
        region[i].transition()
            .duration(750)
            .style('stroke-width', 1.5 / scale + 'px')
            .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');
    }

    dept[d.properties.reg].transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

    console.log(d.properties.name);

    /*water.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

    road.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

    dept.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');*/
}

//click to reset zoom
function zoomOut_reg(d) {
    active.classed('active', false);
    active = d3.select(null);

    dept[d.properties.reg].selectAll('path').remove();

    for (i = 0; i < 8; ++i) {
        region[i].transition()
            .duration(750)
            .style('stroke-width', '1.5px')
            .attr('transform', '');
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
        .attr("transform", "scale(" + $(".container-map").width() / 900 + ")");

    $("svg").height($(".container-map")
        .width() * 0.618);
}
