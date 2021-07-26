let = socket = io.connect();

socket.on("server_to_client", function (data) {
    pushStone(data.value);
})

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
