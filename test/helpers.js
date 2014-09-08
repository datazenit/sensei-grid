function generateData(rows) {
    var data = [];
    for (var i = 0; i < rows; ++i) {
        data.push({
            "id": "#" + (i + 1),
            "created_at": new Date().toDateString(),
            "status": "In progress",
            "title": "Test " + i + Math.round(Math.random() * 1000),
            "count": Math.round(Math.random() * 100)
        });
    }
    return data;
}

function getColumns(data) {
    var firstRow = data[0];
    return _.map(firstRow, function (val, key) {
        return {name: key,  type: "string"}
    });
}

//// define columns
//var columns = [
//    {name: "id", type: "string"},
//    {name: "created_at", type: "string"},
//    {name: "status", type: "string", editor: "CustomEditor"},
//    {name: "title", type: "string"},
//    {name: "count", type: "string"}
//];