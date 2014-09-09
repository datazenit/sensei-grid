function generateData(rows) {
    var data = [];
    for (var i = 0; i < rows; ++i) {
        data.push({
            "id": "#" + (i + 1),
            "created_at": new Date().toDateString(),
            "status": "In progress",
            "title": "Test unicode €∑ĒŽŌ•ōļķņ© " + i + Math.round(Math.random() * 1000),
            "count": Math.round(Math.random() * 100)
        });
    }
    return data;
}

function getColumns(data) {
    var firstRow = data[0];
    return _.map(firstRow, function (val, key) {
        var type = _.isNumber(val) ? "int" : "string";
        return {name: key,  type: type}
    });
}