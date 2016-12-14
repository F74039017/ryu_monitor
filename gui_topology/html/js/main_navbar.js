$(document).ready(function() {
    $('#icon-info').click(function() {
        $('#tab-info').animate({ "right": "0px" }, 500).addClass('visible');
    });

    $('#icon-back').click(function() {
        $('#tab-info').animate({ "right": "-1000px" }, 500).removeClass('visible');
    });
});