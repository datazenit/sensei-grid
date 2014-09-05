$(function () {
	var data = [];
	for (var i = 0; i < 10; ++i) {
		data.push({
			"id": "#" + (i + 1),
			"created_at": "2014-05-02 12:22",
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
		{name: "count", type: "string"},
	];

	var grid = $(".sensei-grid").grid(data, columns);
	grid.registerEditor(BasicEditor);
	grid.registerEditor(CustomEditor);
    grid.events.on("editor:save", function (data, $cell) {
        console.info("save cell:", data, $cell);
    });
    grid.events.on("cell:select", function ($cell) {
        console.info("active cell:", $cell);
    });
	grid.render();
}); 