$(function () {
	var data = [];
	for (var i = 0; i < 10; ++i) {
		data.push({
			"id": "#" + (i + 1),
			"created_at": new Date().toDateString(),
			"status": "In progress",
			"title": "Test " + i + Math.round(Math.random() * 1000),
			"count": Math.round(Math.random() * 100)
		});
	}

	var columns = [
		{name: "id", type: "string"},
		{name: "created_at", type: "string"}, 
		{name: "status", type: "string", editor: "CustomEditor"},
		{name: "title", type: "string"},
		{name: "count", type: "string"}
	];

	var grid = $(".sensei-grid").grid(data, columns);
	grid.registerEditor(BasicEditor);
	grid.registerEditor(CustomEditor);
    grid.events.on("editor:save", function (data, $cell) {
        console.info("save cell:", data, $cell);
    });
    grid.events.on("editor:load", function (data, $cell) {
        console.info("set value in editor:", data, $cell);
    });
    grid.events.on("cell:select", function ($cell) {
        console.info("active cell:", $cell);
    });
	grid.render();

    // api examples
    var $row = grid.getRowByIndex(5);
    console.group("data api examples");
    console.log("grid.getRowDataByIndex(0):", grid.getRowDataByIndex(0));
    console.log("grid.getRowData($row):", grid.getRowData($row));
    console.log("grid.getCellDataByIndex(0, 1):", grid.getCellDataByIndex(0, 1));
    console.log("grid.getCellDataByKey(2, created_at):", grid.getCellDataByKey(2, "created_at"));
    console.log("grid.getGridData():", grid.getGridData());
    console.groupEnd("api examples");

    window.grid = grid;
}); 