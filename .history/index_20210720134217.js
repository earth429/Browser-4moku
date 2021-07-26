$(function () {
    let alternate = true;
    $("td").click(function () {
        if (alternate) {
            $(this).html("○")
        } else {
            $(this).html("×")
        }
        alternate = !alternate;
    })
})