$(document).ready(function() { 
	var sm = new SessionManager();
	var DB = new DBControl();
	
	$("#GetRecordSet").attr("disabled","disable");
	$("#Logout").attr("disabled","disable");
	
	$("#Login").click(function() { 
		var loginSucceeded = sm.Login($('#USER_ID').val(), $('#PASSWORD').val()); 
		$("#Login").attr("disabled","disable"); 
		if (loginSucceeded) {
			$("#GetRecordSet").removeAttr("disabled");
			$("#Logout").removeAttr("disabled","disable");
			$("#Login").attr("disabled","disable");
		} else
		{
			$("#GetRecordSet").attr("disabled","disable");
			$("#ParseData").attr("disabled","disable");
			$("#Logout").attr("disabled","disable");
			$("#Login").removeAttr("disabled","disable");
		}
		
	});
	$("#GetRecordSet").click(function() { 
		DB.clearParam();
		DB.addParam("NAME", "(GMT-10:00) Hawaii");
		DB.getRecordSet("Select TIME_ZONE");
	});
	
	$("#Logout").click(function() {
		$("#GetRecordSet").attr("disabled","disable");
		$("#Logout").attr("disabled","disable");
		$("#Login").removeAttr("disabled","disable");
		sm.Logout(); 
	});
});