$(function () {
	var data = [];
	for (var i = 0; i < 5; ++i) {
		data.push({
			"id": i,
			"created_at": "2014-05-02 12:22",
			"status": "finished",
			"title": "Test " + i,
			"count": Math.round(Math.random() * 100)
		});
	}

	var columns = _.keys(data[0]);

	var grid = $(".sensei-grid").grid(data, columns);
	grid.render();
}); 