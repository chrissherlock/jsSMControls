$(document).ready(function() { 
	var sm = new SessionManager();
	
	$("#Test").click(function() {
		var DB = $("#DB");
		DB.clearParam();
		DB.addParam("NAME", "(GMT-10:00) Hawaii");
		DB.getRecordSet("Select TIME_ZONE");
	});
	
	$("#Login").click(function() { 
		sm.Login($('#USER_ID').val(), $('#PASSWORD').val());
	});
})