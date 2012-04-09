$(document).ready(function() { 
	$("#Test").click(function() {
		var DB = $("#DB");
		DB.clearParam();
		DB.addParam("NAME", "(GMT-10:00) Hawaii");
		DB.getRecordSet("Select TIME_ZONE");
	});
})