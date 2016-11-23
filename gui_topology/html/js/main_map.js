var width = "100%",
    height = "100%",
    active = d3.select(null);

d3.select(window)
    .on("resize", sizeChange);

//set the projection of the map
var projection = d3.geo.mercator()
    .center([120.2175, 23.0007])
    .scale(4000000);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height);

svg.append("rect")
    .attr('class', 'background')
    .attr('width', width)
    .attr('height', height)
    .on('click', zoom_reset);

var g = svg.append('g')
    .style('stroke-width', '0.5px');

var region = svg.append('g'),
    road = svg.append('g'),
    water = svg.append('g'),
    dept = svg.append('g');

var tooltip = d3.select('body')
    .append('div')
    .attr('class', 'hidden tooltip');

//draw map with toopojson
d3.json('topojson/ncku.json', function(error, ncku) {
    if (error)
        return console.error(error);

    var a = topojson.feature(ncku, ncku.objects.region),
        b = topojson.feature(ncku, ncku.objects.department),
        c = topojson.feature(ncku, ncku.objects.water),
        d = topojson.feature(ncku, ncku.objects.road);

    //display all regions.
    region.selectAll('path')
        .data(a.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class', 'region')
        .on('mousemove', function(d) {
            var mouse = d3.mouse(svg.node()).map(function(d) {
                return parseInt(d);
            });
            tooltip.classed('hidden', false)
                .attr('style', 'left:' + (mouse[0] + 15) + 'px; top:' + (mouse[1] - 35) + 'px')
                .html(d.properties.name);
        })
        .on('mouseout', function() {
            tooltip.classed('hidden', true);
        });

    //display the water
    water.selectAll('path')
        .data(c.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class', 'water')
        .on('mousemove', function(d) {
            var mouse = d3.mouse(svg.node()).map(function(d) {
                return parseInt(d);
            });
            tooltip.classed('hidden', false)
                .attr('style', 'left:' + (mouse[0] + 15) + 'px; top:' + (mouse[1] - 35) + 'px')
                .html(d.properties.name);
        })
        .on('mouseout', function() {
            tooltip.classed('hidden', true);
        });

    //display all roads
    road.selectAll('path')
        .data(d.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class', 'road')
        .on('mousemove', function(d) {
            var mouse = d3.mouse(svg.node()).map(function(d) {
                return parseInt(d);
            });
            tooltip.classed('hidden', false)
                .attr('style', 'left:' + (mouse[0] + 15) + 'px; top:' + (mouse[1] - 35) + 'px')
                .html(d.properties.name);
        })
        .on('mouseout', function() {
            tooltip.classed('hidden', true);
        });

    //display all departments
    dept.selectAll('path')
        .data(topojson.feature(ncku, ncku.objects.department).features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class', 'department')
        .on('click', zoom_in)
        .on('mousemove', function(d) {
            var mouse = d3.mouse(svg.node()).map(function(d) {
                return parseInt(d);
            });
            tooltip.classed('hidden', false)
                .attr('style', 'left:' + (mouse[0] + 15) + 'px; top:' + (mouse[1] - 35) + 'px')
                .html(d.properties.name);
        })
        .on('mouseout', function() {
            tooltip.classed('hidden', true);
        });

    dept.append('path')
        .datum(topojson.mesh(ncku, ncku.objects.department, function(a, b) {
            return a !== b;
        }))
        .attr('d', path)
        .attr('class', 'mesh_dept');
});

//click to zoom in
function zoom_in(d) {
    if (active.node() === this)
        return zoom_reset();

    active.classed('active', false);
    active = d3.select(this).classed('active', true);

    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = .9 / Math.max(dx / width, dy / height),
        translate = [width / 2 - scale * x, height / 2 - scale * y];

    region.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

    water.transition()
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
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');
}

//click to reset zoom
function zoom_reset() {
    active.classed('active', false);
    active = d3.select(null);

    region.transition()
        .duration(750)
        .style('stroke-width', '1.5px')
        .attr('transform', '');

    water.transition()
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
        .attr('transform', '');
}

function sizeChange() {
    d3.select("g").attr("transform", "scale(" + $(".container-map").width() / 900 + ")");
    $("svg").height($(".container-map").width() * 0.618);
}
