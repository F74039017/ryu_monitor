$(function() {
    $('#icon-info').click(function() {
        $('#tab-info').animate({ "right": "0px" }, 500).removeClass('hidden').addClass('visible');
    });

    $('#info-back').click(function() {
        $('#tab-info').animate({ "right": "-1000px" }, 500).removeClass('visible').addClass('hidden');
    });

    $('#icon-topo').click(function() {
        $('#tab-topo').animate({ "right": "0px" }, 500).removeClass('hidden').addClass('visible');
    });

    $('#topo-back').click(function() {
        $('#tab-topo').animate({ "right": "-1000px" }, 500).removeClass('visible').addClass('hidden');
    });
});
